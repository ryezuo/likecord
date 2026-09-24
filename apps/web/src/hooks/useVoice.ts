"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { getSocket } from "../lib/ws";
import {
  playJoinSound, playLeaveSound, playMuteSound, playUnmuteSound,
  playDeafenSound, playUndeafenSound, playUserJoinedSound, playUserLeftSound,
  playScreenShareStartedSound, playScreenViewerJoinedSound, playScreenViewerLeftSound,
  markUserInteracted, isVoiceSoundsEnabled, setVoiceSoundsEnabled, cancelVoiceSoundSession,
} from "../lib/voiceSounds";
import {
  buildOnTrackDiagnostic,
  buildPeerDiagnosticSnapshot,
  buildScreenAudioSinkSummary,
  CallInboundStatsDiagnostics,
  getVoiceDiagnosticId,
  isVoiceDebugEnabled,
  updateIncomingTrackDiagnostic,
  type IncomingTrackDiagnostic,
  type PeerDiagnosticSnapshot,
  type VoiceDiagnosticHistoryEntry,
  type VoiceDiagnosticsApi,
  type VoiceDiagnosticSemanticOwner,
  type VoiceRuntimeDiagnosticSnapshot,
} from "../lib/voiceDiagnostics";
import { VoiceSpeakingAnalysis } from "../lib/voiceSpeaking";
import { useVoicePersonalMix } from "./useVoicePersonalMix";
import { getAudioOutputCoordinator } from "../lib/audioOutput";
import { createMutedPlayoutConsumer, VoicePlaybackOwner } from "../lib/voicePlayback";
import { getVoiceCaptureOwner, type VoiceCaptureOwner } from "../lib/voiceCapture";
import {
  screenAudioCaptureConstraints, configureScreenCaptureAudioTrack,
  configureScreenAudioCodecPolicy, applyScreenAudioSenderPolicy, readScreenAudioSenderStats, sampleScreenAudioSender,
} from "../lib/screenAudioQuality";

interface VoiceMember {
  userId: string;
  username: string;
  displayName: string;
  isMuted: boolean;
  isDeafened: boolean;
}

type VoiceCapability = "CONNECT" | "SPEAK";

interface VoiceActionResult {
  ok: boolean;
  code?: string;
  message?: string;
  isMuted?: boolean;
  serverMuted?: boolean;
}

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface ScreenShareInfo {
  shareId: string;
  channelId: string;
  presenterId: string;
  streamId?: string;
}

export interface ScreenSenderRecord {
  shareId: string;
  streamId: string;
  video: RTCRtpSender[];
  audio: RTCRtpSender[];
}

export interface StreamAudioState {
  muted: boolean;
  volume: number;
}

const DEFAULT_STREAM_AUDIO_STATE: StreamAudioState = { muted: false, volume: 1 };

export function clampStreamAudioVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 1;
  return Math.min(1, Math.max(0, volume));
}

export function reconcileScreenSendersForPeer(
  sendersByPeer: Map<string, ScreenSenderRecord>,
  peerId: string,
  pc: RTCPeerConnection,
  shareId: string | null,
  stream: MediaStream | null,
  subscribed: boolean,
): boolean {
  const current = sendersByPeer.get(peerId);
  const shouldSend = subscribed && shareId !== null && stream !== null;
  let changed = false;

  if (current && (!shouldSend || current.shareId !== shareId || current.streamId !== stream?.id)) {
    for (const sender of [...current.video, ...current.audio]) {
      try { pc.removeTrack(sender); } catch { /* idempotent cleanup */ }
    }
    sendersByPeer.delete(peerId);
    changed = true;
  }

  if (shouldSend && !sendersByPeer.has(peerId)) {
    const record: ScreenSenderRecord = { shareId, streamId: stream.id, video: [], audio: [] };
    for (const track of stream.getTracks()) {
      const sender = pc.addTrack(track, stream);
      if (track.kind === "video") record.video.push(sender);
      if (track.kind === "audio") record.audio.push(sender);
    }
    sendersByPeer.set(peerId, record);
    changed = true;
  }

  return changed;
}

export interface VoiceState {
  channelId: string | null;
  members: VoiceMember[];
  speakingUserIds: string[];
  status: "disconnected" | "connecting" | "connected" | "failed";
  isMuted: boolean;
  isDeafened: boolean;
  serverMuted: boolean;
  error: string | null;
  isScreenSharing: boolean;
  screenShareStatus: "idle" | "starting" | "live" | "stopping";
  screenPresenterId: string | null;
  screenShares: ScreenShareInfo[];
  subscribedShareIds: string[];
  presenterViewerIds: Record<string, string[]>;
  localScreenStream: MediaStream | null;
  remoteScreenStreams: Record<string, MediaStream>;
  streamNotice: string | null;
  streamAudioByShareId: Record<string, StreamAudioState>;
}

function voiceLog(...args: unknown[]) {
  if (isVoiceDebugEnabled()) console.log("[Voice]", ...args);
}

type VoiceDiagnosticWindow = Window & {
  __likecordVoiceDiagnostics?: VoiceDiagnosticsApi;
};

function remoteMediaKey(remoteUserId: string, streamId: string, trackId: string) {
  return `${remoteUserId}:${streamId || trackId}`;
}

export function isScreenAudioMuted(presentationHidden: boolean, streamMuted: boolean): boolean {
  return presentationHidden || streamMuted;
}

export function useVoice(
  serverId: string | null,
  authenticated: boolean,
  myUserId?: string,
  myUsername?: string,
  myDisplayName?: string,
  hasChannelCapability: (channelId: string, capability: VoiceCapability) => boolean = () => true,
) {
  const {
    getVoicePersonalMixPreference,
    setVoicePersonalMixPreference: storeVoicePersonalMixPreference,
    isVoicePersonalMixReady,
    personalMixRevision,
    getVoicePersonalMixStatus,
    retryVoicePersonalMix,
  } = useVoicePersonalMix(authenticated ? myUserId : undefined);
  const [state, setState] = useState<VoiceState>({
    channelId: null,
    members: [],
    speakingUserIds: [],
    status: "disconnected",
    isMuted: false,
    isDeafened: false,
    serverMuted: false,
    error: null,
    isScreenSharing: false,
    screenShareStatus: "idle",
    screenPresenterId: null,
    screenShares: [],
    subscribedShareIds: [],
    presenterViewerIds: {},
    localScreenStream: null,
    remoteScreenStreams: {},
    streamNotice: null,
    streamAudioByShareId: {},
  });

  const [screenAudioVersion, setScreenAudioVersion] = useState(0);
  const [screenAudioAvailableByShareId, setScreenAudioAvailableByShareId] = useState<Record<string, boolean>>({});
  const [screenShareFeedback, setScreenShareFeedback] = useState<string | null>(null);
  const previousScreenStatusRef = useRef<VoiceState["screenShareStatus"]>("idle");
  const localStreamRef = useRef<MediaStream | null>(null);
  const captureRef = useRef<VoiceCaptureOwner | null>(null);
  const captureSubscriptionRef = useRef<(() => void) | null>(null);
  const captureIdentityRef = useRef({ authenticated, myUserId, hasChannelCapability, serverId });
  captureIdentityRef.current = { authenticated, myUserId, hasChannelCapability, serverId };
  const callServerIdRef = useRef<string | null>(null);
  const callCapabilitiesRef = useRef({ connect: false, speak: false });
  const capturePolicyRef = useRef({ membership: false, selfMuted: true, serverMuted: false, deafened: false, speakRevoked: false });
  const speakingAnalysisRef = useRef<VoiceSpeakingAnalysis | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const screenAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playbackOwnerRef = useRef<VoicePlaybackOwner | null>(null);
  const callClassificationTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const screenAudioShareIdsRef = useRef<Map<string, string>>(new Map());
  const remoteAudioTracksByMediaKeyRef = useRef<Map<string, MediaStreamTrack>>(new Map());
  const screenShareIdsByPresenterRef = useRef<Map<string, string>>(new Map());
  const screenShareIdsByMediaStreamRef = useRef<Map<string, string>>(new Map());
  const microphoneMediaKeysByPresenterRef = useRef<Map<string, string>>(new Map());
  const hiddenScreenAudioShareIdsRef = useRef<Set<string>>(new Set());
  const streamAudioByShareIdRef = useRef<Map<string, StreamAudioState>>(new Map());
  const subscribedShareIdsRef = useRef<Set<string>>(new Set());
  const screenMediaStreamsByKeyRef = useRef<Map<string, MediaStream>>(new Map());
  const retiredScreenStreamsRef = useRef<WeakSet<MediaStream>>(new WeakSet());
  const retiredScreenTracksRef = useRef<WeakSet<MediaStreamTrack>>(new WeakSet());
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const channelIdRef = useRef<string | null>(null);
  const joinAttemptRef = useRef(0);
  const muteRequestRef = useRef(0);
  const isScreenSharingRef = useRef(false);
  const screenShareStatusRef = useRef<VoiceState["screenShareStatus"]>("idle");
  const pendingRenegotiation = useRef<Map<string, boolean>>(new Map());
  const renegotiationInFlightRef = useRef<Set<string>>(new Set());
  const requestRenegotiationRef = useRef<(userId: string, pc: RTCPeerConnection) => Promise<void>>(async () => {});
  const screenSendersRef = useRef<Map<string, ScreenSenderRecord>>(new Map());
  const localScreenShareIdRef = useRef<string | null>(null);
  const authoritativeScreenViewersRef = useRef<Map<string, Set<string>>>(new Map());
  const incomingTrackDiagnosticsRef = useRef<Map<string, IncomingTrackDiagnostic>>(new Map());
  const knownLocalScreenTrackOwnersRef = useRef<Map<string, VoiceDiagnosticSemanticOwner>>(new Map());
  const screenViewerJoinCountsRef = useRef<Map<string, number>>(new Map());
  const diagnosticHistoryRef = useRef<VoiceDiagnosticHistoryEntry[]>([]);
  const callInboundStatsRef = useRef<CallInboundStatsDiagnostics | null>(null);
  const voiceStateRef = useRef(state);
  voiceStateRef.current = state;
  const getCallInboundReceivers = useCallback((): RTCRtpReceiver[] => {
    if (!channelIdRef.current) return [];
    const receivers: RTCRtpReceiver[] = [];
    for (const [remoteUserId, mediaKey] of microphoneMediaKeysByPresenterRef.current) {
      const audio = audioElementsRef.current.get(mediaKey);
      const track = remoteAudioTracksByMediaKeyRef.current.get(mediaKey);
      // The HTML label is provisional until the existing 50 ms classification
      // completes. Require that final CALL path, its current track and live PC.
      if (!audio?.srcObject || audio.dataset.audioOwner !== "CALL_MIC_AUDIO"
        || callClassificationTimersRef.current.has(mediaKey)
        || screenAudioElementsRef.current.has(mediaKey) || screenAudioShareIdsRef.current.has(mediaKey)
        || !track || track.kind !== "audio" || track.readyState !== "live") continue;
      const pc = peerConnectionsRef.current.get(remoteUserId);
      if (!pc || pc.signalingState === "closed" || pc.connectionState === "closed") continue;
      try {
        for (const receiver of pc.getReceivers()) if (receiver.track === track) receivers.push(receiver);
      } catch { /* Optional diagnostic enumeration; no media fallback. */ }
    }
    return receivers;
  }, []);
  useEffect(() => { callInboundStatsRef.current?.prune(); });
  // Read-only projection of classified receive ownership, never the visual stream.
  useEffect(() => {
    const tracks = [...screenAudioShareIdsRef.current].flatMap(([key, shareId]) => {
      const track = remoteAudioTracksByMediaKeyRef.current.get(key);
      return track && subscribedShareIdsRef.current.has(shareId) ? [{ shareId, track }] : [];
    });
    const refresh = () => {
      const next: Record<string, boolean> = {};
      tracks.forEach(({ shareId, track }) => { if (track.readyState !== "ended") next[shareId] = true; });
      setScreenAudioAvailableByShareId((previous) =>
        Object.keys(previous).length === Object.keys(next).length && Object.keys(next).every((id) => previous[id]) ? previous : next);
    };
    refresh();
    tracks.forEach(({ track }) => track.addEventListener?.("ended", refresh));
    return () => tracks.forEach(({ track }) => track.removeEventListener?.("ended", refresh));
  }, [screenAudioVersion, state.subscribedShareIds]);

  useEffect(() => {
    const previous = previousScreenStatusRef.current;
    previousScreenStatusRef.current = state.screenShareStatus;
    if (!authenticated || !state.channelId || state.status !== "connected" || state.screenShareStatus !== "idle") {
      setScreenShareFeedback(null);
      return;
    }
    if ((previous === "live" || previous === "stopping") && !state.localScreenStream && !screenStreamRef.current) {
      setScreenShareFeedback("Screen sharing stopped on this device");
    }
  }, [authenticated, state.channelId, state.status, state.screenShareStatus, state.localScreenStream]);
  useEffect(() => {
    if (!screenShareFeedback) return;
    const timer = setTimeout(() => setScreenShareFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [screenShareFeedback]);

  const syncCapturePolicy = useCallback((patch: Partial<typeof capturePolicyRef.current>) => {
    const policy = { ...capturePolicyRef.current, ...patch };
    capturePolicyRef.current = policy;
    const identity = captureIdentityRef.current;
    const channel = channelIdRef.current;
    // Navigation's channel list is not an authorization revocation for a call
    // in another server. That call keeps its server-authorized state until the
    // server's existing revocation events or a current-channel refresh arrives.
    if (channel && identity.serverId === callServerIdRef.current) {
      callCapabilitiesRef.current = { connect: identity.hasChannelCapability(channel, "CONNECT"), speak: identity.hasChannelCapability(channel, "SPEAK") };
    }
    const allowed = identity.authenticated && !!identity.myUserId && !!channel && policy.membership
      && callCapabilitiesRef.current.connect && callCapabilitiesRef.current.speak
      && !policy.selfMuted && !policy.serverMuted && !policy.deafened && !policy.speakRevoked;
    captureRef.current?.setTransmission(allowed);
    if (!allowed && identity.myUserId) speakingAnalysisRef.current?.setEffectiveMuted(identity.myUserId, true);
  }, []);
  useLayoutEffect(() => { syncCapturePolicy({}); }, [authenticated, myUserId, serverId, hasChannelCapability, syncCapturePolicy]);
  const [debugEvents, setDebugEvents] = useState<string[]>([]);
  const forceRelay = typeof window !== "undefined"
    && (process.env.NEXT_PUBLIC_WEBRTC_FORCE_RELAY === "true");

  const addEvent = (msg: string) => {
    voiceLog(msg);
    if (isVoiceDebugEnabled()) {
      setDebugEvents((prev) => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }
  };

  const ensurePlaybackOwner = useCallback(() => {
    if (playbackOwnerRef.current) return playbackOwnerRef.current;
    const coordinator = getAudioOutputCoordinator(myUserId);
    if (!coordinator) return null;
    playbackOwnerRef.current = new VoicePlaybackOwner(coordinator);
    return playbackOwnerRef.current;
  }, [myUserId]);

  const disposePlaybackOwner = useCallback(() => {
    callClassificationTimersRef.current.forEach(clearTimeout);
    callClassificationTimersRef.current.clear();
    playbackOwnerRef.current?.dispose();
    playbackOwnerRef.current = null;
  }, []);

  const attachRemoteAudio = useCallback((mediaKey: string, track: MediaStreamTrack) => {
    remoteAudioTracksByMediaKeyRef.current.set(mediaKey, track);
    const owner = ensurePlaybackOwner();
    if (owner) return owner.attachTrack(mediaKey, track).consumer;
    // Account/output hydration has not installed an owner yet. Keep only the
    // permanently muted playout consumer; there is no audible fallback path.
    const { consumer } = createMutedPlayoutConsumer(track);
    void consumer.play().catch(() => undefined);
    return consumer;
  }, [ensurePlaybackOwner]);

  const reconcileCallAudioForTarget = useCallback((targetUserId: string, deafened = voiceStateRef.current.isDeafened) => {
    const preference = getVoicePersonalMixPreference(targetUserId);
    playbackOwnerRef.current?.setCallPolicy(targetUserId, {
      volume: preference.volumePercent / 100,
      allowed: isVoicePersonalMixReady() && !deafened && !preference.locallyMuted,
    });
    audioElementsRef.current.forEach((audio) => {
      if (audio.dataset.remoteUserId !== targetUserId || audio.dataset.audioOwner !== "CALL_MIC_AUDIO") return;
      audio.muted = true;
      audio.volume = 0;
    });
  }, [getVoicePersonalMixPreference, isVoicePersonalMixReady]);

  const reconcileAllCallAudio = useCallback((deafened: boolean) => {
    audioElementsRef.current.forEach((audio) => {
      const targetUserId = audio.dataset.remoteUserId;
      if (!targetUserId || audio.dataset.audioOwner !== "CALL_MIC_AUDIO") return;
      const preference = getVoicePersonalMixPreference(targetUserId);
      playbackOwnerRef.current?.setCallPolicy(targetUserId, {
        volume: preference.volumePercent / 100,
        allowed: isVoicePersonalMixReady() && !deafened && !preference.locallyMuted,
      });
      audio.muted = true;
      audio.volume = 0;
    });
  }, [getVoicePersonalMixPreference, isVoicePersonalMixReady]);

  useEffect(() => {
    reconcileAllCallAudio(voiceStateRef.current.isDeafened);
  }, [personalMixRevision, reconcileAllCallAudio]);

  const setVoicePersonalMixPreference = useCallback((
    targetUserId: string,
    update: Parameters<typeof storeVoicePersonalMixPreference>[1],
  ) => {
    storeVoicePersonalMixPreference(targetUserId, update);
    reconcileCallAudioForTarget(targetUserId);
  }, [reconcileCallAudioForTarget, storeVoicePersonalMixPreference]);

  const ensureSpeakingAnalysis = useCallback(() => {
    if (!speakingAnalysisRef.current) {
      speakingAnalysisRef.current = new VoiceSpeakingAnalysis((speakingUserIds) => {
        setState((prev) => {
          if (prev.speakingUserIds.length === speakingUserIds.length
            && prev.speakingUserIds.every((userId, index) => userId === speakingUserIds[index])) return prev;
          return { ...prev, speakingUserIds };
        });
      });
    }
    return speakingAnalysisRef.current;
  }, []);

  const stopSpeakingAnalysis = useCallback(() => {
    const analysis = speakingAnalysisRef.current;
    speakingAnalysisRef.current = null;
    analysis?.dispose();
  }, []);

  const getLocalSocketId = useCallback(() => getSocket()?.id || null, []);

  const recordDiagnostic = useCallback((type: string, checkpoint: string, data: unknown) => {
    if (!isVoiceDebugEnabled()) return;
    const entry: VoiceDiagnosticHistoryEntry = {
      capturedAt: new Date().toISOString(),
      type,
      checkpoint,
      localUserId: myUserId || null,
      localSocketId: getLocalSocketId(),
      data,
    };
    diagnosticHistoryRef.current.push(entry);
    if (diagnosticHistoryRef.current.length > 500) diagnosticHistoryRef.current.splice(0, diagnosticHistoryRef.current.length - 500);
    console.log("[VoiceDiag]", entry);
  }, [getLocalSocketId, myUserId]);

  const capturePeerDiagnostic = useCallback((
    checkpoint: string,
    remoteUserId: string,
    pc: RTCPeerConnection,
  ): PeerDiagnosticSnapshot | null => {
    if (!isVoiceDebugEnabled()) return null;
    const localMicrophoneTrackIds = new Set(localStreamRef.current?.getAudioTracks().map((track) => track.id) || []);
    const snapshot = buildPeerDiagnosticSnapshot({
      checkpoint,
      pc,
      localUserId: myUserId || null,
      localSocketId: getLocalSocketId(),
      remoteUserId,
      remoteSocketId: null,
      localMicrophoneTrackIds,
      knownScreenTrackOwners: knownLocalScreenTrackOwnersRef.current,
      applicationScreenOwnership: screenSendersRef.current.get(remoteUserId) || null,
      incomingTracks: [...incomingTrackDiagnosticsRef.current.values()],
    });
    recordDiagnostic("peer-snapshot", checkpoint, snapshot);
    return snapshot;
  }, [getLocalSocketId, myUserId, recordDiagnostic]);

  const setIncomingTrackOwnership = useCallback((
    diagnosticKey: string,
    update: {
      semanticOwner: VoiceDiagnosticSemanticOwner;
      remoteMediaKey?: string | null;
      shareId?: string | null;
      audioElement?: HTMLAudioElement | null;
    },
  ) => {
    const current = incomingTrackDiagnosticsRef.current.get(diagnosticKey);
    if (!current) return;
    const next = updateIncomingTrackDiagnostic(current, update);
    incomingTrackDiagnosticsRef.current.set(diagnosticKey, next);
    recordDiagnostic("track-ownership", "ontrack-final-ownership", next);
  }, [recordDiagnostic]);

  const setIncomingOwnershipForMediaKey = useCallback((
    remoteUserId: string,
    mediaKey: string,
    semanticOwner: VoiceDiagnosticSemanticOwner,
    shareId: string | null,
    audioElement: HTMLAudioElement | null,
  ) => {
    for (const diagnostic of incomingTrackDiagnosticsRef.current.values()) {
      if (diagnostic.remoteUserId !== remoteUserId || diagnostic.remoteMediaKey !== mediaKey) continue;
      setIncomingTrackOwnership(diagnostic.diagnosticKey, { semanticOwner, shareId, remoteMediaKey: mediaKey, audioElement });
    }
  }, [setIncomingTrackOwnership]);

  const captureVoiceDiagnosticSnapshot = useCallback((checkpoint = "manual"): VoiceRuntimeDiagnosticSnapshot => {
    const incomingTracks = [...incomingTrackDiagnosticsRef.current.values()];
    const peers = [...peerConnectionsRef.current.entries()].map(([remoteUserId, pc]) => buildPeerDiagnosticSnapshot({
      checkpoint,
      pc,
      localUserId: myUserId || null,
      localSocketId: getLocalSocketId(),
      remoteUserId,
      remoteSocketId: null,
      localMicrophoneTrackIds: new Set(localStreamRef.current?.getAudioTracks().map((track) => track.id) || []),
      knownScreenTrackOwners: knownLocalScreenTrackOwnersRef.current,
      applicationScreenOwnership: screenSendersRef.current.get(remoteUserId) || null,
      incomingTracks,
    }));
    const shareIds = new Set<string>([
      ...screenAudioShareIdsRef.current.values(),
      ...screenShareIdsByPresenterRef.current.values(),
      ...subscribedShareIdsRef.current,
      ...streamAudioByShareIdRef.current.keys(),
      ...(localScreenShareIdRef.current ? [localScreenShareIdRef.current] : []),
    ]);
    const currentReceiverDiagnosticKeysByShare = new Map<string, Set<string>>();
    for (const peer of peers) {
      for (const receiver of peer.receivers) {
        if (!receiver.shareId) continue;
        if (!currentReceiverDiagnosticKeysByShare.has(receiver.shareId)) {
          currentReceiverDiagnosticKeysByShare.set(receiver.shareId, new Set());
        }
        currentReceiverDiagnosticKeysByShare.get(receiver.shareId)!
          .add(`${peer.pcId}:${receiver.receiverId}:${receiver.trackId}`);
      }
    }
    const shares = [...shareIds].sort().map((shareId) => buildScreenAudioSinkSummary({
      shareId,
      hidden: hiddenScreenAudioShareIdsRef.current.has(shareId),
      incomingTracks,
      currentReceiverDiagnosticKeys: currentReceiverDiagnosticKeysByShare.get(shareId) || new Set(),
      screenAudioElements: screenAudioElementsRef.current,
      screenAudioShareIds: screenAudioShareIdsRef.current,
    }));
    const visualScreenVideos = typeof document === "undefined" ? [] : [...document.querySelectorAll<HTMLVideoElement>("video.screen-stream-video")]
      .map((video, index) => ({
        index,
        muted: video.muted,
        paused: video.paused,
        srcObjectStreamId: video.srcObject && typeof (video.srcObject as MediaStream).getTracks === "function"
          ? (video.srcObject as MediaStream).id
          : null,
      }));
    const snapshot: VoiceRuntimeDiagnosticSnapshot = {
      capturedAt: new Date().toISOString(),
      checkpoint,
      localUserId: myUserId || null,
      localSocketId: getLocalSocketId(),
      channelId: channelIdRef.current,
      subscribedShareIds: [...subscribedShareIdsRef.current].sort(),
      peerIds: [...peerConnectionsRef.current.keys()].sort(),
      peers,
      incomingTracks,
      shares,
      visualScreenVideos,
      audibleVisualScreenVideoCount: visualScreenVideos.filter((video) => !video.muted && !video.paused && video.srcObjectStreamId !== null).length,
    };
    recordDiagnostic("runtime-snapshot", checkpoint, snapshot);
    return snapshot;
  }, [getLocalSocketId, myUserId, recordDiagnostic]);

  useEffect(() => {
    if (!isVoiceDebugEnabled()) return;
    const diagnosticWindow = window as VoiceDiagnosticWindow;
    const callInbound = new CallInboundStatsDiagnostics(
      () => authenticated && channelIdRef.current !== null && isVoiceDebugEnabled(), getCallInboundReceivers,
    );
    callInboundStatsRef.current = callInbound;
    const api: VoiceDiagnosticsApi = {
      enabled: true,
      snapshot: (checkpoint = "manual") => captureVoiceDiagnosticSnapshot(checkpoint),
      history: () => [...diagnosticHistoryRef.current],
      callInboundStats: () => callInbound.capture(),
      screenAudioStats: async () => {
        const samples = await Promise.all([...screenSendersRef.current.entries()].flatMap(([remoteUserId, record]) =>
          record.audio.map(async (sender) => {
            const sample = await readScreenAudioSenderStats(sender);
            return screenSendersRef.current.get(remoteUserId) === record
              ? { shareId: record.shareId, remoteUserId, ...sample } : null;
          })));
        return samples.filter((sample) => sample !== null);
      },
      clear: () => { diagnosticHistoryRef.current = []; callInbound.clear(); },
    };
    diagnosticWindow.__likecordVoiceDiagnostics = api;
    recordDiagnostic("diagnostics", "diagnostics-enabled", {
      localUserId: myUserId || null,
      localSocketId: getLocalSocketId(),
      sensitiveFieldsExcluded: ["JWT", "cookies", "TURN credentials", "SDP", "ICE candidate addresses"],
    });
    return () => {
      callInbound.dispose();
      if (callInboundStatsRef.current === callInbound) callInboundStatsRef.current = null;
      if (diagnosticWindow.__likecordVoiceDiagnostics === api) delete diagnosticWindow.__likecordVoiceDiagnostics;
    };
  }, [authenticated, captureVoiceDiagnosticSnapshot, getCallInboundReceivers, getLocalSocketId, myUserId, recordDiagnostic]);

  const fetchIceServers = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/voice/ice-servers");
      if (!res.ok) return;
      const servers: IceServer[] = await res.json();
      iceServersRef.current = servers.map((s) => ({
        urls: s.urls,
        username: s.username,
        credential: s.credential,
      }));
      addEvent(`ICE servers fetched: ${servers.length}`);
    } catch { /* use defaults */ }
  }, []);

  const stopLocalTracks = useCallback(() => {
    syncCapturePolicy({ membership: false, selfMuted: true });
    captureSubscriptionRef.current?.(); captureSubscriptionRef.current = null;
    captureRef.current?.stop();
    captureRef.current = null;
    callServerIdRef.current = null;
    callCapabilitiesRef.current = { connect: false, speak: false };
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      addEvent(`Stopping ${tracks.length} local tracks`);
      tracks.forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, [syncCapturePolicy]);

  const closePeerConnections = useCallback(() => {
    callInboundStatsRef.current?.clear();
    addEvent(`Closing ${peerConnectionsRef.current.size} peer connections`);
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    audioElementsRef.current.forEach((audio) => {
      const key = audio.dataset.remoteMediaKey;
      if (key) playbackOwnerRef.current?.release(key);
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });
    audioElementsRef.current.clear();
    remoteAudioTracksByMediaKeyRef.current.clear();
    screenSendersRef.current.clear();
    localScreenShareIdRef.current = null;
    authoritativeScreenViewersRef.current.clear();
    pendingRenegotiation.current.clear();
    renegotiationInFlightRef.current.clear();
    disposePlaybackOwner();
  }, [disposePlaybackOwner]);

  const cleanup = useCallback(() => {
    stopSpeakingAnalysis();
    stopLocalTracks();
    stopScreenShare(); // local-only, no WS emit
    closePeerConnections();
    removeAllScreenVideos();
    channelIdRef.current = null;
  }, [stopSpeakingAnalysis, stopLocalTracks, closePeerConnections]);

  const removeAllScreenVideos = useCallback(() => {
    screenAudioElementsRef.current.forEach((el, key) => {
      playbackOwnerRef.current?.release(key);
      el.srcObject = null;
      el.remove();
    });
    screenAudioElementsRef.current.clear();
    remoteAudioTracksByMediaKeyRef.current.clear();
    screenAudioShareIdsRef.current.clear();
    screenShareIdsByPresenterRef.current.clear();
    screenShareIdsByMediaStreamRef.current.clear();
    microphoneMediaKeysByPresenterRef.current.clear();
    hiddenScreenAudioShareIdsRef.current.clear();
    streamAudioByShareIdRef.current.clear();
    subscribedShareIdsRef.current.clear();
    screenMediaStreamsByKeyRef.current.clear();
    retiredScreenStreamsRef.current = new WeakSet();
    retiredScreenTracksRef.current = new WeakSet();
    screenStreamIdsRef.current.clear();
    pendingScreenAudioRef.current.clear();
  }, []);

  const teardownScreenAudioPlaybackForShare = useCallback((shareId: string, knownPresenterId?: string) => {
    const remoteUserId = knownPresenterId || [...screenShareIdsByPresenterRef.current]
      .find(([, mappedShareId]) => mappedShareId === shareId)?.[0];
    for (const [key, audio] of screenAudioElementsRef.current) {
      if (screenAudioShareIdsRef.current.get(key) !== shareId && audio.dataset.screenShareId !== shareId) continue;
      const stream = audio.srcObject as MediaStream | null;
      if (stream) {
        retiredScreenStreamsRef.current.add(stream);
        stream.getTracks().forEach((track) => retiredScreenTracksRef.current.add(track));
      }
      playbackOwnerRef.current?.release(key);
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      audio.dataset.audioOwner = `RELEASED_SCREEN_AUDIO:${shareId}`;
      if (remoteUserId) {
        setIncomingOwnershipForMediaKey(remoteUserId, key, `RELEASED_SCREEN_AUDIO(${shareId})`, shareId, audio);
      }
      screenAudioElementsRef.current.delete(key);
      screenAudioShareIdsRef.current.delete(key);
      remoteAudioTracksByMediaKeyRef.current.delete(key);
    }
    for (const [streamKey, mappedShareId] of screenShareIdsByMediaStreamRef.current) {
      if (mappedShareId !== shareId) continue;
      const stream = screenMediaStreamsByKeyRef.current.get(streamKey);
      if (stream) {
        retiredScreenStreamsRef.current.add(stream);
        stream.getTracks().forEach((track) => retiredScreenTracksRef.current.add(track));
      }
      screenMediaStreamsByKeyRef.current.delete(streamKey);
      screenShareIdsByMediaStreamRef.current.delete(streamKey);
    }
    if (remoteUserId) {
      for (const item of pendingScreenAudioRef.current.get(remoteUserId) || []) {
        const stream = item.element.srcObject as MediaStream | null;
        if (stream) {
          retiredScreenStreamsRef.current.add(stream);
          stream.getTracks().forEach((track) => retiredScreenTracksRef.current.add(track));
        }
        item.element.pause();
        playbackOwnerRef.current?.release(item.mediaKey);
        item.element.srcObject = null;
        item.element.remove();
        item.element.dataset.audioOwner = `RELEASED_SCREEN_AUDIO:${shareId}`;
        setIncomingOwnershipForMediaKey(remoteUserId, item.mediaKey, `RELEASED_SCREEN_AUDIO(${shareId})`, shareId, item.element);
        audioElementsRef.current.delete(item.mediaKey);
        remoteAudioTracksByMediaKeyRef.current.delete(item.mediaKey);
        if (item.streamId) screenMediaStreamsByKeyRef.current.delete(`${remoteUserId}:${item.streamId}`);
      }
      pendingScreenAudioRef.current.delete(remoteUserId);
      screenStreamIdsRef.current.delete(remoteUserId);
    }
    voiceLog("Screen audio teardown", {
      shareId,
      subscribed: subscribedShareIdsRef.current.has(shareId),
      activeSinkCount: [...screenAudioShareIdsRef.current.values()].filter((id) => id === shareId).length,
    });
    playbackOwnerRef.current?.clearScreenPolicy(shareId);
    setScreenAudioVersion((version) => version + 1);
  }, [setIncomingOwnershipForMediaKey]);

  const removeRemoteScreenMedia = useCallback((remoteUserId: string) => {
    const shareId = screenShareIdsByPresenterRef.current.get(remoteUserId);
    if (shareId) teardownScreenAudioPlaybackForShare(shareId, remoteUserId);
    screenShareIdsByPresenterRef.current.delete(remoteUserId);
    if (shareId) hiddenScreenAudioShareIdsRef.current.delete(shareId);
  }, [teardownScreenAudioPlaybackForShare]);

  // Deterministic media-source identity: known screen stream IDs per peer,
  // learned when a video track arrives in that stream. No arrival-order assumptions.
  const screenStreamIdsRef = useRef<Map<string, Set<string>>>(new Map());
  // Audio tracks that arrived in a stream without video yet — reclassified when video arrives.
  const pendingScreenAudioRef = useRef<Map<string, Array<{ streamId: string; mediaKey: string; element: HTMLAudioElement }>>>(new Map());
  const screenPresenterUserIdRef = useRef<string | null>(null);

  const ensureStreamAudioState = useCallback((shareId: string): StreamAudioState => {
    const existing = streamAudioByShareIdRef.current.get(shareId);
    if (existing) return existing;
    const initial = { ...DEFAULT_STREAM_AUDIO_STATE };
    streamAudioByShareIdRef.current.set(shareId, initial);
    setState((prev) => prev.streamAudioByShareId[shareId]
      ? prev
      : { ...prev, streamAudioByShareId: { ...prev.streamAudioByShareId, [shareId]: initial } });
    return initial;
  }, []);

  const reconcileStreamAudioShare = useCallback((shareId: string) => {
    const settings = streamAudioByShareIdRef.current.get(shareId) || DEFAULT_STREAM_AUDIO_STATE;
    const hidden = hiddenScreenAudioShareIdsRef.current.has(shareId);
    playbackOwnerRef.current?.setScreenPolicy(shareId, {
      volume: clampStreamAudioVolume(settings.volume),
      allowed: !isScreenAudioMuted(hidden, settings.muted),
    });
    for (const [mediaKey, audio] of screenAudioElementsRef.current) {
      if (screenAudioShareIdsRef.current.get(mediaKey) !== shareId) continue;
      audio.muted = true;
      audio.volume = 0;
    }
  }, []);

  const removeStreamAudioState = useCallback((shareId: string) => {
    streamAudioByShareIdRef.current.delete(shareId);
    hiddenScreenAudioShareIdsRef.current.delete(shareId);
    playbackOwnerRef.current?.clearScreenPolicy(shareId);
    setState((prev) => {
      if (!prev.streamAudioByShareId[shareId]) return prev;
      const streamAudioByShareId = { ...prev.streamAudioByShareId };
      delete streamAudioByShareId[shareId];
      return { ...prev, streamAudioByShareId };
    });
  }, []);

  const bindScreenAudioElement = useCallback((mediaKey: string, audio: HTMLAudioElement, shareId: string) => {
    captureRef.current?.transport.releaseReceiver(mediaKey);
    audio.dataset.screenShareId = shareId;
    audio.dataset.screenMediaKey = mediaKey;
    audio.dataset.audioOwner = `SCREEN_AUDIO:${shareId}`;
    if (!audio.dataset.screenTrackId && audio.dataset.remoteTrackId) audio.dataset.screenTrackId = audio.dataset.remoteTrackId;
    if (!audio.dataset.screenStreamId && audio.dataset.remoteStreamId) audio.dataset.screenStreamId = audio.dataset.remoteStreamId;
    if (!audio.dataset.screenRemoteUserId && audio.dataset.remoteUserId) audio.dataset.screenRemoteUserId = audio.dataset.remoteUserId;
    delete audio.dataset.remoteTrackId;
    delete audio.dataset.remoteStreamId;
    delete audio.dataset.remoteUserId;
    screenAudioShareIdsRef.current.set(mediaKey, shareId);
    const settings = ensureStreamAudioState(shareId);
    audio.muted = true;
    audio.volume = 0;
    playbackOwnerRef.current?.setScreenPolicy(shareId, {
      volume: clampStreamAudioVolume(settings.volume),
      allowed: !isScreenAudioMuted(hiddenScreenAudioShareIdsRef.current.has(shareId), settings.muted),
    });
    playbackOwnerRef.current?.classifyScreen(mediaKey, shareId);
    setScreenAudioVersion((version) => version + 1);
    voiceLog("Screen audio sink", {
      shareId,
      remoteMediaKey: mediaKey,
      screenSinkCount: [...screenAudioShareIdsRef.current.values()].filter((id) => id === shareId).length,
      retainedByCallAudio: audioElementsRef.current.has(mediaKey),
      actualMuted: true,
      actualVolume: 0,
    });
  }, [ensureStreamAudioState]);

  const bindPendingScreenAudioForShare = useCallback((remoteUserId: string, shareId: string) => {
    if (!subscribedShareIdsRef.current.has(shareId)) return;
    const pending = pendingScreenAudioRef.current.get(remoteUserId) || [];
    for (const item of pending) {
      const stream = item.element.srcObject as MediaStream | null;
      if (stream && retiredScreenStreamsRef.current.has(stream)) continue;
      audioElementsRef.current.delete(item.mediaKey);
      screenAudioElementsRef.current.set(item.mediaKey, item.element);
      if (stream && item.streamId) {
        const streamKey = `${remoteUserId}:${item.streamId}`;
        screenMediaStreamsByKeyRef.current.set(streamKey, stream);
        screenShareIdsByMediaStreamRef.current.set(streamKey, shareId);
      }
      bindScreenAudioElement(item.mediaKey, item.element, shareId);
      setIncomingOwnershipForMediaKey(remoteUserId, item.mediaKey, `SCREEN_AUDIO(${shareId})`, shareId, item.element);
    }
    pendingScreenAudioRef.current.delete(remoteUserId);
  }, [bindScreenAudioElement, setIncomingOwnershipForMediaKey]);

  const handleRemoteTrack = useCallback((e: RTCTrackEvent, remoteUserId: string, pc: RTCPeerConnection) => {
    const track = e.track;
    const stream = e.streams[0] || null;
    const streamId = stream?.id || "";
    const initialMediaKey = track.kind === "audio" ? remoteMediaKey(remoteUserId, streamId, track.id) : null;
    const incomingDiagnostic = isVoiceDebugEnabled()
      ? buildOnTrackDiagnostic({
        event: e,
        pc,
        localUserId: myUserId || null,
        localSocketId: getLocalSocketId(),
        remoteUserId,
        remoteSocketId: null,
        remoteMediaKey: initialMediaKey,
      })
      : null;
    if (incomingDiagnostic) {
      incomingTrackDiagnosticsRef.current.set(incomingDiagnostic.diagnosticKey, incomingDiagnostic);
      recordDiagnostic("ontrack", "ontrack-received", incomingDiagnostic);
    }
    const mediaStreamKey = `${remoteUserId}:${streamId}`;
    const activeShareId = screenShareIdsByPresenterRef.current.get(remoteUserId);
    const subscribedToActiveShare = Boolean(activeShareId && subscribedShareIdsRef.current.has(activeShareId));
    addEvent(`Remote track from ${remoteUserId}: ${track.kind}/${track.id} state=${track.readyState} muted=${track.muted} stream=${streamId}`);
    if (track.kind === "video") {
      if (!activeShareId || !subscribedToActiveShare || retiredScreenTracksRef.current.has(track) || (stream !== null && retiredScreenStreamsRef.current.has(stream))) return;
      // SCREEN_VIDEO — record this stream as a screen stream for this peer
      if (!screenStreamIdsRef.current.has(remoteUserId)) screenStreamIdsRef.current.set(remoteUserId, new Set());
      if (streamId) screenStreamIdsRef.current.get(remoteUserId)!.add(streamId);
      if (streamId && activeShareId) screenShareIdsByMediaStreamRef.current.set(mediaStreamKey, activeShareId);
      if (stream) screenMediaStreamsByKeyRef.current.set(mediaStreamKey, stream);
      // If screen audio arrived before its video track, revoke any provisional
      // CALL/MIC classification before the screen stream can affect speaking.
      const provisionalMicrophoneKey = microphoneMediaKeysByPresenterRef.current.get(remoteUserId);
      const provisionalAudio = provisionalMicrophoneKey
        ? audioElementsRef.current.get(provisionalMicrophoneKey)
        : undefined;
      const provisionalSharesVideoStream = Boolean(
        streamId && provisionalAudio?.dataset.remoteStreamId === streamId,
      );
      if (provisionalMicrophoneKey && provisionalAudio && provisionalSharesVideoStream) {
        const screenAudioKey = provisionalMicrophoneKey;
        const timer = callClassificationTimersRef.current.get(screenAudioKey);
        if (timer) clearTimeout(timer);
        callClassificationTimersRef.current.delete(screenAudioKey);
        if (provisionalAudio) {
          audioElementsRef.current.delete(screenAudioKey);
          screenAudioElementsRef.current.set(screenAudioKey, provisionalAudio);
          if (activeShareId) {
            bindScreenAudioElement(screenAudioKey, provisionalAudio, activeShareId);
            setIncomingOwnershipForMediaKey(remoteUserId, screenAudioKey, `SCREEN_AUDIO(${activeShareId})`, activeShareId, provisionalAudio);
          }
        }
        microphoneMediaKeysByPresenterRef.current.delete(remoteUserId);
        speakingAnalysisRef.current?.detach(remoteUserId);
      }
      if (incomingDiagnostic) {
        setIncomingTrackOwnership(incomingDiagnostic.diagnosticKey, {
          semanticOwner: `SCREEN_VIDEO(${activeShareId})`,
          shareId: activeShareId,
        });
      }
      // Reclassify any pending audio that shared this stream id
      const pending = pendingScreenAudioRef.current.get(remoteUserId) || [];
      const stillPending: typeof pending = [];
      for (const p of pending) {
        if (p.streamId === streamId) {
          // move element from mic map to screen audio map
          audioElementsRef.current.delete(p.mediaKey);
          screenAudioElementsRef.current.set(p.mediaKey, p.element);
          if (activeShareId) {
            bindScreenAudioElement(p.mediaKey, p.element, activeShareId);
            setIncomingOwnershipForMediaKey(remoteUserId, p.mediaKey, `SCREEN_AUDIO(${activeShareId})`, activeShareId, p.element);
          }
        } else {
          stillPending.push(p);
        }
      }
      if (stillPending.length > 0) pendingScreenAudioRef.current.set(remoteUserId, stillPending);
      else pendingScreenAudioRef.current.delete(remoteUserId);

      // React owns visual rendering. ScreenStreamVideo is always muted, so the
      // classified VA.2 playback graph remains the sole audible route.
      setState((prev) => ({
        ...prev,
        screenPresenterId: remoteUserId,
        remoteScreenStreams: stream ? { ...prev.remoteScreenStreams, [remoteUserId]: stream } : prev.remoteScreenStreams,
      }));
      return;
    }

    // Audio track
    const hasVideo = stream !== null && typeof stream.getVideoTracks === "function" && stream.getVideoTracks().length > 0;
    const knownScreenStream = streamId !== "" && screenStreamIdsRef.current.get(remoteUserId)?.has(streamId) === true;
    const mediaKey = remoteMediaKey(remoteUserId, streamId, track.id);
    if (retiredScreenTracksRef.current.has(track) || (stream !== null && retiredScreenStreamsRef.current.has(stream))) return;
    const mappedShareId = subscribedToActiveShare
      ? screenShareIdsByMediaStreamRef.current.get(mediaStreamKey) || activeShareId
      : undefined;
    const knownMicrophoneKey = microphoneMediaKeysByPresenterRef.current.get(remoteUserId);
    const isAdditionalAudioForActiveShare = Boolean(mappedShareId && knownMicrophoneKey && knownMicrophoneKey !== mediaKey);
    if (!subscribedToActiveShare && activeShareId && knownMicrophoneKey && knownMicrophoneKey !== mediaKey) return;
    if (hasVideo || knownScreenStream || isAdditionalAudioForActiveShare) {
      // SCREEN_AUDIO (from display stream)
      const el = screenAudioElementsRef.current.get(mediaKey) || (() => {
        const a = attachRemoteAudio(mediaKey, track);
        a.dataset.remoteMediaKey = mediaKey;
        screenAudioElementsRef.current.set(mediaKey, a);
        return a;
      })();
      if (stream) screenMediaStreamsByKeyRef.current.set(mediaStreamKey, stream);
      if (streamId && mappedShareId) screenShareIdsByMediaStreamRef.current.set(mediaStreamKey, mappedShareId);
      el.dataset.screenTrackId = track.id;
      el.dataset.screenStreamId = streamId;
      el.dataset.screenRemoteUserId = remoteUserId;
      if (mappedShareId) bindScreenAudioElement(mediaKey, el, mappedShareId);
      else playbackOwnerRef.current?.keepPending(mediaKey);
      if (incomingDiagnostic) {
        setIncomingTrackOwnership(incomingDiagnostic.diagnosticKey, {
          semanticOwner: mappedShareId ? `SCREEN_AUDIO(${mappedShareId})` : "PENDING/UNKNOWN",
          remoteMediaKey: mediaKey,
          shareId: mappedShareId || null,
          audioElement: el,
        });
      }
      return;
    }

    // Unknown audio: could be MIC_AUDIO, or SCREEN_AUDIO arriving before video ontrack.
    // Render as mic now; if a video later arrives in the same stream, it is reclassified.
    const el = audioElementsRef.current.get(mediaKey) || (() => {
      const a = attachRemoteAudio(mediaKey, track);
      a.dataset.remoteMediaKey = mediaKey;
      audioElementsRef.current.set(mediaKey, a);
      return a;
    })();
    el.dataset.remoteTrackId = track.id;
    el.dataset.remoteStreamId = streamId;
    el.dataset.remoteUserId = remoteUserId;
    // The DOM node is only a permanently muted playout consumer. Keep the
    // established semantic label for diagnostics while the Web Audio source
    // itself remains disconnected until the short classification window ends.
    el.dataset.audioOwner = "CALL_MIC_AUDIO";
    el.muted = true;
    el.volume = 0;
    playbackOwnerRef.current?.keepPending(mediaKey);
    const previousMicrophoneAudio = knownMicrophoneKey
      ? audioElementsRef.current.get(knownMicrophoneKey)
      : undefined;
    const previousMicrophoneTrack = knownMicrophoneKey
      ? remoteAudioTracksByMediaKeyRef.current.get(knownMicrophoneKey)
      : undefined;
    const previousMicrophoneEnded = previousMicrophoneTrack?.readyState === "ended";
    const isMicrophoneTrack = !knownMicrophoneKey
      || knownMicrophoneKey === mediaKey
      || previousMicrophoneEnded;
    if (isMicrophoneTrack) {
      if (knownMicrophoneKey && knownMicrophoneKey !== mediaKey && previousMicrophoneAudio) {
        captureRef.current?.transport.releaseReceiver(knownMicrophoneKey);
        playbackOwnerRef.current?.release(knownMicrophoneKey);
        previousMicrophoneAudio.pause();
        previousMicrophoneAudio.srcObject = null;
        previousMicrophoneAudio.remove();
        audioElementsRef.current.delete(knownMicrophoneKey);
        remoteAudioTracksByMediaKeyRef.current.delete(knownMicrophoneKey);
      }
      microphoneMediaKeysByPresenterRef.current.set(remoteUserId, mediaKey);
      if (stream) {
        const member = voiceStateRef.current.members.find((candidate) => candidate.userId === remoteUserId);
        ensureSpeakingAnalysis().attach(
          remoteUserId,
          stream,
          track,
          !member || member.isMuted || member.isDeafened,
        );
      }
      const previousTimer = callClassificationTimersRef.current.get(mediaKey);
      if (previousTimer) clearTimeout(previousTimer);
      const timer = setTimeout(() => {
        callClassificationTimersRef.current.delete(mediaKey);
        if (microphoneMediaKeysByPresenterRef.current.get(remoteUserId) !== mediaKey
          || !audioElementsRef.current.has(mediaKey)) return;
        el.dataset.audioOwner = "CALL_MIC_AUDIO";
        const preference = getVoicePersonalMixPreference(remoteUserId);
        playbackOwnerRef.current?.setCallPolicy(remoteUserId, {
          volume: preference.volumePercent / 100,
          allowed: isVoicePersonalMixReady() && !voiceStateRef.current.isDeafened && !preference.locallyMuted,
        });
        playbackOwnerRef.current?.classifyCall(mediaKey, remoteUserId);
        if (e.receiver) captureRef.current?.transport.bindReceiver(mediaKey, remoteUserId, pc, e.receiver);
      }, 50);
      callClassificationTimersRef.current.set(mediaKey, timer);
      if (incomingDiagnostic) {
        setIncomingTrackOwnership(incomingDiagnostic.diagnosticKey, {
          semanticOwner: "CALL_MIC_AUDIO",
          remoteMediaKey: mediaKey,
          shareId: null,
          audioElement: el,
        });
      }
    } else if (streamId) {
      if (!pendingScreenAudioRef.current.has(remoteUserId)) pendingScreenAudioRef.current.set(remoteUserId, []);
      const pending = pendingScreenAudioRef.current.get(remoteUserId)!;
      if (!pending.some((item) => item.mediaKey === mediaKey)) pending.push({ streamId, mediaKey, element: el });
      if (incomingDiagnostic) {
        setIncomingTrackOwnership(incomingDiagnostic.diagnosticKey, {
          semanticOwner: "PENDING/UNKNOWN",
          remoteMediaKey: mediaKey,
          shareId: activeShareId || null,
          audioElement: el,
        });
      }
    } else {
      if (incomingDiagnostic) {
        setIncomingTrackOwnership(incomingDiagnostic.diagnosticKey, {
          semanticOwner: "PENDING/UNKNOWN",
          remoteMediaKey: mediaKey,
          shareId: activeShareId || null,
          audioElement: el,
        });
      }
    }
  }, [attachRemoteAudio, bindScreenAudioElement, ensureSpeakingAnalysis, getLocalSocketId, getVoicePersonalMixPreference, isVoicePersonalMixReady, myUserId, recordDiagnostic, setIncomingOwnershipForMediaKey, setIncomingTrackOwnership]);

  const setRemoteScreenAudioHidden = useCallback((shareId: string, hidden: boolean) => {
    if (hidden) hiddenScreenAudioShareIdsRef.current.add(shareId);
    else hiddenScreenAudioShareIdsRef.current.delete(shareId);
    ensureStreamAudioState(shareId);
    reconcileStreamAudioShare(shareId);
    if (isVoiceDebugEnabled()) captureVoiceDiagnosticSnapshot(hidden ? "presentation-hidden" : "presentation-restored");
  }, [captureVoiceDiagnosticSnapshot, ensureStreamAudioState, reconcileStreamAudioShare]);

  const getStreamVolume = useCallback((shareId: string) =>
    streamAudioByShareIdRef.current.get(shareId)?.volume ?? DEFAULT_STREAM_AUDIO_STATE.volume, []);

  const isStreamMuted = useCallback((shareId: string) =>
    streamAudioByShareIdRef.current.get(shareId)?.muted ?? DEFAULT_STREAM_AUDIO_STATE.muted, []);

  const setStreamVolume = useCallback((shareId: string, volume: number) => {
    const current = ensureStreamAudioState(shareId);
    const next = { ...current, volume: clampStreamAudioVolume(volume) };
    streamAudioByShareIdRef.current.set(shareId, next);
    setState((prev) => ({
      ...prev,
      streamAudioByShareId: { ...prev.streamAudioByShareId, [shareId]: next },
    }));
    reconcileStreamAudioShare(shareId);
  }, [ensureStreamAudioState, reconcileStreamAudioShare]);

  const setStreamMuted = useCallback((shareId: string, muted: boolean) => {
    const current = ensureStreamAudioState(shareId);
    const next = { ...current, muted };
    streamAudioByShareIdRef.current.set(shareId, next);
    setState((prev) => ({
      ...prev,
      streamAudioByShareId: { ...prev.streamAudioByShareId, [shareId]: next },
    }));
    reconcileStreamAudioShare(shareId);
  }, [ensureStreamAudioState, reconcileStreamAudioShare]);

  const requestRenegotiation = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    if (pc.signalingState === "closed") return;
    if (pc.signalingState !== "stable" || renegotiationInFlightRef.current.has(userId)) {
      pendingRenegotiation.current.set(userId, true);
      addEvent(`Queued renegotiation for ${userId}: signaling=${pc.signalingState}`);
      return;
    }

    renegotiationInFlightRef.current.add(userId);
    pendingRenegotiation.current.delete(userId);
    try {
      const offer = await pc.createOffer();
      if (pc.signalingState !== "stable") {
        pendingRenegotiation.current.set(userId, true);
        return;
      }
      await pc.setLocalDescription(offer);
      const sock = getSocket();
      if (sock?.connected && channelIdRef.current) {
        sock.emit("voice:offer", {
          channelId: channelIdRef.current,
          toUserId: userId,
          sdp: offer.sdp,
        });
        recordDiagnostic("signaling", "renegotiation-offer-sent", {
          direction: "sent",
          signal: "offer",
          remoteUserId: userId,
          remoteSocketId: null,
          pcId: getVoiceDiagnosticId(pc, "pc"),
        });
        addEvent(`Sent renegotiation offer to ${userId}`);
      }
    } catch (err: unknown) {
      addEvent(`Renegotiation error ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      renegotiationInFlightRef.current.delete(userId);
      if (pendingRenegotiation.current.get(userId) && pc.signalingState === "stable") {
        void requestRenegotiationRef.current(userId, pc);
      }
    }
  }, [recordDiagnostic]);
  requestRenegotiationRef.current = requestRenegotiation;

  const processPendingRenegotiation = useCallback((userId: string) => {
    if (!pendingRenegotiation.current.get(userId)) return;
    const pc = peerConnectionsRef.current.get(userId);
    if (!pc || pc.signalingState !== "stable") return;
    void requestRenegotiationRef.current(userId, pc);
  }, []);

  const stopScreenTracks = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    isScreenSharingRef.current = false;
    screenShareStatusRef.current = "idle";
    setState((prev) => ({ ...prev, isScreenSharing: false, screenShareStatus: "idle", localScreenStream: null }));
  }, []);

  const applyScreenSenderPolicies = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    const record = screenSendersRef.current.get(userId);
    if (!record) return;
    const current = () => screenSendersRef.current.get(userId) === record
      && peerConnectionsRef.current.get(userId) === pc && pc.connectionState !== "closed"
      && localScreenShareIdRef.current === record.shareId;
    const report = (phase: string, evidence: unknown) => {
      recordDiagnostic("screen-audio-quality", phase, { shareId: record.shareId, remoteUserId: userId, evidence });
      voiceLog("Screen audio quality", phase, JSON.stringify(evidence));
    };
    await Promise.all(record.audio.map(async (sender) => {
      await applyScreenAudioSenderPolicy(sender, current, report);
      if (isVoiceDebugEnabled() && pc.signalingState === "stable") void sampleScreenAudioSender(sender, current, report);
    }));
  }, [recordDiagnostic]);

  const reconcileScreenTransportForPeer = useCallback(async (
    userId: string,
    pc: RTCPeerConnection,
    renegotiate: boolean,
  ) => {
    const shareId = localScreenShareIdRef.current;
    const subscribed = shareId !== null
      && authoritativeScreenViewersRef.current.get(shareId)?.has(userId) === true;
    const changed = reconcileScreenSendersForPeer(
      screenSendersRef.current,
      userId,
      pc,
      shareId,
      screenStreamRef.current,
      subscribed,
    );
    if (!changed) return false;

    const record = screenSendersRef.current.get(userId);
    if (record) {
      for (const sender of record.audio) {
        const transceiver = pc.getTransceivers?.().find((entry) => entry.sender === sender);
        recordDiagnostic("screen-audio-quality", "codec-preference", {
          shareId: record.shareId, remoteUserId: userId, ...configureScreenAudioCodecPolicy(transceiver),
        });
      }
      await applyScreenSenderPolicies(userId, pc);
      if (screenSendersRef.current.get(userId) !== record) return false;
    }
    addEvent(record
      ? `Enabled screen share ${record.shareId} for ${userId}: video=${record.video.length} audio=${record.audio.length}`
      : `Disabled screen share transport for ${userId}`);
    if (renegotiate) await requestRenegotiationRef.current(userId, pc);
    return true;
  }, [applyScreenSenderPolicies, recordDiagnostic]);

  const reconcileAllScreenTransports = useCallback(async () => {
    for (const [userId, pc] of peerConnectionsRef.current) {
      await reconcileScreenTransportForPeer(userId, pc, true);
    }
  }, [reconcileScreenTransportForPeer]);

  const removeScreenTracksFromPeers = useCallback(async () => {
    for (const [userId, pc] of peerConnectionsRef.current) {
      const changed = reconcileScreenSendersForPeer(
        screenSendersRef.current,
        userId,
        pc,
        null,
        null,
        false,
      );
      if (changed) await requestRenegotiationRef.current(userId, pc);
      capturePeerDiagnostic("presenter-after-screen-stop", userId, pc);
    }
  }, [capturePeerDiagnostic]);

  const startScreenShare = useCallback(async () => {
    if (!channelIdRef.current || screenShareStatusRef.current !== "idle") return;
    const s = getSocket();
    if (!s?.connected) return;
    markUserInteracted(myUserId);
    screenShareStatusRef.current = "starting";
    setState((prev) => ({ ...prev, screenShareStatus: "starting" }));

    const startedPromise = new Promise<void>((resolve, reject) => {
      const onStarted = (data: { presenterId?: string }) => {
        if (data.presenterId && data.presenterId !== myUserId) return;
        s.off("screen:share-started", onStarted); s.off("screen:share-error", onError); resolve();
      };
      const onError = (data: any) => { s.off("screen:share-started", onStarted); s.off("screen:share-error", onError); reject(new Error(data?.code || "SCREEN_SHARE_REJECTED")); };
      s.on("screen:share-started", onStarted);
      s.on("screen:share-error", onError);
      setTimeout(() => reject(new Error("Timeout")), 10000);
    });

    // Request presenter slot before acquiring browser capture.
    s.emit("screen:share-start", { channelId: channelIdRef.current });

    try {
      await startedPromise;
    } catch {
      screenShareStatusRef.current = "idle";
      setState((prev) => ({ ...prev, screenShareStatus: "idle" }));
      return; // Server rejected
    }

    try {
      const captureShareId = localScreenShareIdRef.current;
      const captureSession = joinAttemptRef.current;
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: screenAudioCaptureConstraints() });
      for (const track of stream.getAudioTracks()) {
        const evidence = await configureScreenCaptureAudioTrack(track);
        recordDiagnostic("screen-audio-quality", "capture", { shareId: captureShareId, trackId: track.id, ...evidence });
        voiceLog("Screen audio capture", JSON.stringify(evidence));
      }
      // Capture/tuning can finish after disconnect or authoritative share loss.
      if (joinAttemptRef.current !== captureSession || localScreenShareIdRef.current !== captureShareId
        || screenShareStatusRef.current !== "starting") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      screenStreamRef.current = stream;
      if (isVoiceDebugEnabled()) {
        const diagnosticShareId = localScreenShareIdRef.current || "unknown-share";
        stream.getTracks().forEach((track) => {
          knownLocalScreenTrackOwnersRef.current.set(
            track.id,
            track.kind === "audio" ? `SCREEN_AUDIO(${diagnosticShareId})` : `SCREEN_VIDEO(${diagnosticShareId})`,
          );
        });
      }
      isScreenSharingRef.current = true;
      screenShareStatusRef.current = "live";
      setState((prev) => ({ ...prev, isScreenSharing: true, screenShareStatus: "live", localScreenStream: stream }));
      addEvent(`Screen share acquired: ${stream.getTracks().length} tracks`);
      playScreenShareStartedSound(myUserId);

      stream.getVideoTracks().forEach((t) => {
        t.onended = () => stopScreenShare();
      });

      await reconcileAllScreenTransports();
      peerConnectionsRef.current.forEach((pc, remoteUserId) => {
        capturePeerDiagnostic("presenter-after-screen-start", remoteUserId, pc);
      });
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        addEvent(`Screen share failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      screenShareStatusRef.current = "idle";
      setState((prev) => ({ ...prev, screenShareStatus: "idle" }));
      s.emit("screen:share-stop", { channelId: channelIdRef.current });
    }
  }, [capturePeerDiagnostic, reconcileAllScreenTransports, myUserId, recordDiagnostic]);

  const stopScreenShare = useCallback(async () => {
    const s = getSocket();
    if (!isScreenSharingRef.current || screenShareStatusRef.current !== "live") return;
    screenShareStatusRef.current = "stopping";
    setState((prev) => ({ ...prev, screenShareStatus: "stopping" }));
    await removeScreenTracksFromPeers();
    stopScreenTracks();
    const shareId = localScreenShareIdRef.current;
    localScreenShareIdRef.current = null;
    if (shareId) authoritativeScreenViewersRef.current.delete(shareId);
    if (s?.connected && channelIdRef.current) {
      s.emit("screen:share-stop", { channelId: channelIdRef.current });
    }
  }, [removeScreenTracksFromPeers, stopScreenTracks]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const requestVoiceAction = useCallback((
    event: "voice:authorize-join" | "voice:join" | "voice:mute",
    payload: Record<string, unknown>,
  ): Promise<VoiceActionResult> => new Promise((resolve) => {
    const socket = getSocket();
    if (!socket?.connected) {
      resolve({ ok: false, code: "SOCKET_DISCONNECTED", message: "Not connected to server" });
      return;
    }
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, code: "VOICE_ACTION_TIMEOUT", message: "Voice authorization timed out" });
    }, 10000);
    socket.emit(event, payload, (result: VoiceActionResult | undefined) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(result?.ok ? result : {
        ok: false,
        code: result?.code ?? "VOICE_ACTION_REJECTED",
        message: result?.message ?? "Voice action was rejected",
        isMuted: result?.isMuted,
      });
    });
  }), []);

  const resetVoiceSession = useCallback((withLeaveSound: boolean) => {
    syncCapturePolicy({ membership: false, selfMuted: true });
    cancelVoiceSoundSession(myUserId);
    joinAttemptRef.current += 1;
    muteRequestRef.current += 1;
    stopScreenTracks();
    cleanup();
    setState((prev) => ({
      ...prev,
      channelId: null,
      members: [],
      speakingUserIds: [],
      status: "disconnected",
      isMuted: false,
      isDeafened: false,
      screenPresenterId: null,
      screenShares: [],
      subscribedShareIds: [],
      presenterViewerIds: {},
      remoteScreenStreams: {},
      streamNotice: null,
      screenShareStatus: "idle",
      streamAudioByShareId: {},
    }));
    subscribedShareIdsRef.current.clear();
    if (withLeaveSound) playLeaveSound(myUserId);
  }, [cleanup, stopScreenTracks, myUserId, syncCapturePolicy]);

  const leave = useCallback(async () => {
    addEvent(`Leaving voice channel`);
    const s = getSocket();
    if (s?.connected && channelIdRef.current) {
      s.emit("voice:leave", { channelId: channelIdRef.current });
    }
    resetVoiceSession(true);
  }, [resetVoiceSession]);

  const joinScreenShare = useCallback((shareId: string) => {
    const s = getSocket();
    if (!s?.connected || !channelIdRef.current) return;
    s.emit("screen:viewer-join", { shareId });
  }, []);

  const leaveScreenShare = useCallback((shareId: string) => {
    const s = getSocket();
    if (!s?.connected) return;
    s.emit("screen:viewer-leave", { shareId });
  }, []);

  // Create a peer connection to a remote user (existing user initiates offer)
  const createPeerConnection = useCallback(async (remoteUserId: string) => {
    if (peerConnectionsRef.current.has(remoteUserId)) {
      addEvent(`PC to ${remoteUserId} already exists, skipping`);
      return;
    }
    if (!localStreamRef.current) {
      addEvent(`No local stream for PC to ${remoteUserId}`);
      return;
    }
    addEvent(`Creating PC to ${remoteUserId}`);

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      iceTransportPolicy: forceRelay ? "relay" : "all",
    });

    peerConnectionsRef.current.set(remoteUserId, pc);
    if (!await captureRef.current?.senders.register(remoteUserId, pc, async () => {
      if (peerConnectionsRef.current.get(remoteUserId) === pc) await requestRenegotiationRef.current(remoteUserId, pc);
    })) { pc.close(); return; }
    await reconcileScreenTransportForPeer(remoteUserId, pc, false);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const sock = getSocket();
        if (sock?.connected) {
          sock.emit("voice:ice-candidate", {
            channelId: channelIdRef.current, toUserId: remoteUserId, candidate: e.candidate,
          });
          recordDiagnostic("signaling", "ice-sent", {
            direction: "sent",
            signal: "ice",
            remoteUserId,
            remoteSocketId: null,
            pcId: getVoiceDiagnosticId(pc, "pc"),
          });
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      addEvent(`ICE state ${remoteUserId}: ${pc.iceConnectionState}`);
    };
    pc.onconnectionstatechange = () => {
      addEvent(`Conn state ${remoteUserId}: ${pc.connectionState}`);
      if (pc.connectionState === "connected") captureRef.current?.transport.negotiated(remoteUserId, pc);
    };
    pc.onsignalingstatechange = () => {
      if (pc.signalingState === "stable") {
        processPendingRenegotiation(remoteUserId);
        captureRef.current?.transport.negotiated(remoteUserId, pc);
        void applyScreenSenderPolicies(remoteUserId, pc);
        capturePeerDiagnostic("renegotiation-stable", remoteUserId, pc);
      }
    };

    pc.ontrack = (e) => {
      handleRemoteTrack(e, remoteUserId, pc);
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    capturePeerDiagnostic("voice-peer-created", remoteUserId, pc);

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    addEvent(`Created offer for ${remoteUserId}`);

    const sock = getSocket();
    if (sock?.connected) {
      sock.emit("voice:offer", {
        channelId: channelIdRef.current, toUserId: remoteUserId, sdp: offer.sdp,
      });
      recordDiagnostic("signaling", "offer-sent", {
        direction: "sent",
        signal: "offer",
        remoteUserId,
        remoteSocketId: null,
        pcId: getVoiceDiagnosticId(pc, "pc"),
      });
      addEvent(`Sent offer to ${remoteUserId}`);
    }

    return pc;
  }, [applyScreenSenderPolicies, capturePeerDiagnostic, handleRemoteTrack, processPendingRenegotiation, reconcileScreenTransportForPeer, recordDiagnostic]);

  const join = useCallback(async (channelId: string) => {
    if (!authenticated || !serverId) return;
    if (!hasChannelCapability(channelId, "CONNECT")) {
      setState((prev) => ({ ...prev, status: "failed", error: "You do not have permission to connect to this voice channel", channelId: null }));
      return;
    }
    addEvent(`Joining channel ${channelId}`);
    markUserInteracted(myUserId);

    const s = getSocket();
    if (!s?.connected) {
      setState((prev) => ({ ...prev, status: "failed", error: "Not connected to server" }));
      return;
    }

    // Leave existing channel
    if (channelIdRef.current && channelIdRef.current !== channelId) {
      await leave();
    }

    const attempt = ++joinAttemptRef.current;
    setState((prev) => ({ ...prev, status: "connecting", error: null }));
    channelIdRef.current = channelId;
    callServerIdRef.current = serverId;
    callCapabilitiesRef.current = { connect: true, speak: hasChannelCapability(channelId, "SPEAK") };
    let serverJoined = false;

    try {
      const authorization = await requestVoiceAction("voice:authorize-join", { serverId, channelId });
      if (!authorization.ok) throw new Error(authorization.message || "Voice join was rejected");
      if (attempt !== joinAttemptRef.current) return;

      const capture = getVoiceCaptureOwner();
      if (!capture) throw new Error("Protected microphone capture is unavailable");
      captureRef.current = capture;
      captureSubscriptionRef.current?.();
      captureSubscriptionRef.current = capture.subscribe(() => {
        if (captureRef.current === capture && myUserId) speakingAnalysisRef.current?.setEffectiveMuted(myUserId, !capture.snapshot().transmitting);
      });
      capturePolicyRef.current = { membership: false, selfMuted: true, serverMuted: false, deafened: false, speakRevoked: false };
      const account = myUserId;
      const current = () => attempt === joinAttemptRef.current && captureIdentityRef.current.authenticated
        && captureIdentityRef.current.myUserId === account && callCapabilitiesRef.current.connect;
      const stream = await capture.startCall(current, (processed) => {
        if (!current()) return;
        localStreamRef.current = processed;
        const track = processed.getAudioTracks()[0];
        if (account && track) ensureSpeakingAnalysis().attach(account, processed, track, true);
      });
      if (attempt !== joinAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = stream;
      addEvent(`Local stream acquired: ${stream.getAudioTracks().length} audio tracks`);

      await fetchIceServers();
      if (attempt !== joinAttemptRef.current) return;

      const joined = await requestVoiceAction("voice:join", { serverId, channelId });
      if (!joined.ok) throw new Error(joined.message || "Voice join was rejected");
      serverJoined = true;
      if (attempt !== joinAttemptRef.current) {
        s.emit("voice:leave", { channelId });
        return;
      }
      const joinedMuted = joined.isMuted === true || joined.serverMuted === true;
      syncCapturePolicy({ membership: true, selfMuted: joinedMuted, serverMuted: joined.serverMuted === true });
      const microphoneTrack = stream.getAudioTracks()[0];
      if (myUserId && microphoneTrack) {
        ensureSpeakingAnalysis().attach(myUserId, stream, microphoneTrack, joinedMuted);
      }
      s.emit("screen:share-state", { channelId });
      s.emit("screen:viewer-state");
      addEvent(`Emitted voice:join`);

      setState((prev) => ({ ...prev, channelId, status: "connected", isMuted: joinedMuted, serverMuted: joined.serverMuted === true }));
      playJoinSound(myUserId);
    } catch (err: unknown) {
      if (attempt !== joinAttemptRef.current) return;
      if (serverJoined) s.emit("voice:leave", { channelId });
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Microphone permission denied"
        : err instanceof Error ? err.message : "Failed to join voice channel";
      addEvent(`Join failed: ${msg}`);
      setState((prev) => ({ ...prev, status: "failed", error: msg, channelId: null }));
      channelIdRef.current = null;
      stopLocalTracks();
    }
  }, [authenticated, serverId, fetchIceServers, hasChannelCapability, leave, requestVoiceAction, stopLocalTracks, ensureSpeakingAnalysis, myUserId, syncCapturePolicy]);

  const toggleMute = useCallback(async () => {
    if (state.serverMuted) {
      addEvent(`Cannot toggle mute: server-muted`);
      return;
    }
    const channelId = channelIdRef.current;
    if (!channelId) return;
    const newMuted = !state.isMuted;
    if (!newMuted && serverId === callServerIdRef.current && !hasChannelCapability(channelId, "SPEAK")) {
      syncCapturePolicy({ selfMuted: true });
      setState((prev) => ({ ...prev, isMuted: true, error: "You do not have permission to speak in this channel" }));
      return;
    }

    const request = ++muteRequestRef.current;
    if (newMuted) {
      syncCapturePolicy({ selfMuted: true });
      setState((prev) => ({ ...prev, isMuted: true, error: null }));
      playMuteSound(myUserId);
    }
    const result = await requestVoiceAction("voice:mute", { channelId, muted: newMuted, serverId: callServerIdRef.current });
    if (request !== muteRequestRef.current) return;
    if (!result.ok) {
      syncCapturePolicy({ selfMuted: true });
      setState((prev) => ({ ...prev, isMuted: true, error: result.message || "Voice state was rejected" }));
      return;
    }
    if (newMuted) return;

    callCapabilitiesRef.current.speak = true; // Current server's successful unmute ACK.
    syncCapturePolicy({ selfMuted: newMuted, deafened: false, speakRevoked: false });
    setState((prev) => {
      const newDeafened = newMuted ? prev.isDeafened : false;
      if (newDeafened !== prev.isDeafened) {
        reconcileAllCallAudio(newDeafened);
        getSocket()?.emit("voice:deafen", { channelId, deafened: newDeafened });
      }
      return { ...prev, isMuted: newMuted, isDeafened: newDeafened, error: null };
    });
    if (!newMuted) playUnmuteSound(myUserId);
  }, [hasChannelCapability, reconcileAllCallAudio, requestVoiceAction, serverId, state.isMuted, state.serverMuted, myUserId, syncCapturePolicy]);

  const toggleDeafen = useCallback(() => {
    muteRequestRef.current++;
    syncCapturePolicy({ selfMuted: true, deafened: !voiceStateRef.current.isDeafened });
    setState((prev) => {
      const newDeafened = !prev.isDeafened;
      addEvent(`Toggle deafen: ${newDeafened}`);
      if (newDeafened) playDeafenSound(myUserId); else playUndeafenSound(myUserId);
      reconcileAllCallAudio(newDeafened);
      // Deafen mutes locally and server-side. Undeafen never implicitly opens
      // the microphone; a deliberate, permission-checked Unmute is required.
      const s = getSocket();
      if (s?.connected && channelIdRef.current) {
        s.emit("voice:deafen", { channelId: channelIdRef.current, deafened: newDeafened });
      }
      const newMuted = newDeafened ? true : prev.isMuted;
      if (newMuted !== prev.isMuted) {
        if (s?.connected && channelIdRef.current) {
          s.emit("voice:mute", { channelId: channelIdRef.current, muted: newMuted, serverId });
        }
      }
      return { ...prev, isDeafened: newDeafened, isMuted: newMuted };
    });
  }, [reconcileAllCallAudio, serverId, myUserId, syncCapturePolicy]);

  // Add local user to member list after joining
  const ensureLocalMember = useCallback(() => {
    if (!channelIdRef.current || !myUserId) return;
    setState((prev) => {
      if (prev.members.some((m) => m.userId === myUserId)) return prev;
      addEvent(`Adding local user to member list`);
      return {
        ...prev,
        members: [{
          userId: myUserId,
          username: myUsername || myUserId,
          displayName: myDisplayName || myUsername || myUserId,
          isMuted: prev.isMuted,
          isDeafened: prev.isDeafened,
        }, ...prev.members],
      };
    });
  }, [myUserId, myUsername, myDisplayName]);

  // Effect: add local user when channel changes to connected
  useEffect(() => {
    if (state.status === "connected" && state.channelId) {
      ensureLocalMember();
    }
  }, [state.status, state.channelId, ensureLocalMember]);

  // VoiceState mute/deafen remains authoritative. Analysis only decorates
  // media that is already present and clears immediately when that media is
  // not effectively allowed to speak.
  useEffect(() => {
    const analysis = speakingAnalysisRef.current;
    if (!analysis) return;
    if (myUserId) {
      analysis.setEffectiveMuted(myUserId, state.isMuted || state.serverMuted || state.isDeafened);
    }
    for (const member of state.members) {
      if (member.userId === myUserId) continue;
      analysis.setEffectiveMuted(member.userId, member.isMuted || member.isDeafened);
    }
  }, [myUserId, state.isDeafened, state.isMuted, state.members, state.serverMuted]);

  // WebSocket signaling handlers
  useEffect(() => {
    if (!authenticated) return;

    const s = getSocket();
    if (!s) return;

    const handleState = (data: { members: Array<VoiceMember> }) => {
      addEvent(`voice:state received with ${data.members?.length || 0} members`);
      if (data.members) {
        for (const m of data.members) {
          addEvent(`  member: ${m.displayName} (${m.userId.slice(0, 8)}...) muted=${m.isMuted} deaf=${m.isDeafened}`);
        }
        setState((prev) => {
          // Merge — preserve local user, add remote users
          const existingIds = new Set(prev.members.map((m) => m.userId));
          const newMembers = data.members.filter((m) => !existingIds.has(m.userId) && m.userId !== myUserId);
          return { ...prev, members: [...prev.members, ...newMembers] };
        });
      }
    };

    const handleUserJoined = (data: { userId: string; username?: string; displayName?: string }) => {
      addEvent(`voice:user-joined: ${data.displayName || data.username || data.userId}`);
      if (data.userId !== myUserId) playUserJoinedSound(myUserId);

      // Add to member list
      setState((prev) => {
        if (prev.members.some((m) => m.userId === data.userId)) return prev;
        return {
          ...prev,
          members: [...prev.members, {
            userId: data.userId,
            username: data.username || data.userId,
            displayName: data.displayName || data.username || data.userId,
            isMuted: false,
            isDeafened: false,
          }],
        };
      });

      // Existing user creates peer connection and sends offer to newcomer
      if (myUserId && data.userId !== myUserId && localStreamRef.current) {
        addEvent(`Creating PC for newcomer ${data.userId}`);
        createPeerConnection(data.userId).catch((err) => {
          addEvent(`Error creating PC for ${data.userId}: ${err.message}`);
        });
      }
    };

    const handleUserLeft = (data: { userId: string }) => {
      addEvent(`voice:user-left: ${data.userId}`);
      if (data.userId !== myUserId) playUserLeftSound(myUserId);
      const pc = peerConnectionsRef.current.get(data.userId);
      captureRef.current?.senders.remove(data.userId, pc);
      if (pc) { pc.close(); peerConnectionsRef.current.delete(data.userId); }
      screenSendersRef.current.delete(data.userId);
      authoritativeScreenViewersRef.current.forEach((viewerIds) => viewerIds.delete(data.userId));
      pendingRenegotiation.current.delete(data.userId);
      renegotiationInFlightRef.current.delete(data.userId);
      const mediaPrefix = `${data.userId}:`;
      for (const [key, audio] of audioElementsRef.current) {
        if (!key.startsWith(mediaPrefix)) continue;
        const timer = callClassificationTimersRef.current.get(key);
        if (timer) clearTimeout(timer);
        callClassificationTimersRef.current.delete(key);
        playbackOwnerRef.current?.release(key);
        audio.pause(); audio.srcObject = null; audio.remove(); audioElementsRef.current.delete(key);
        remoteAudioTracksByMediaKeyRef.current.delete(key);
      }
      for (const [key, audio] of screenAudioElementsRef.current) {
        if (!key.startsWith(mediaPrefix)) continue;
        playbackOwnerRef.current?.release(key);
        audio.pause(); audio.srcObject = null; audio.remove(); screenAudioElementsRef.current.delete(key);
        screenAudioShareIdsRef.current.delete(key);
        remoteAudioTracksByMediaKeyRef.current.delete(key);
      }
      screenStreamIdsRef.current.delete(data.userId);
      const departedShareId = screenShareIdsByPresenterRef.current.get(data.userId);
      if (departedShareId) {
        subscribedShareIdsRef.current.delete(departedShareId);
        removeStreamAudioState(departedShareId);
      }
      screenShareIdsByPresenterRef.current.delete(data.userId);
      microphoneMediaKeysByPresenterRef.current.delete(data.userId);
      for (const key of screenShareIdsByMediaStreamRef.current.keys()) {
        if (key.startsWith(`${data.userId}:`)) {
          screenShareIdsByMediaStreamRef.current.delete(key);
          screenMediaStreamsByKeyRef.current.delete(key);
        }
      }
      pendingScreenAudioRef.current.delete(data.userId);
      playbackOwnerRef.current?.releaseTarget(data.userId);
      speakingAnalysisRef.current?.detach(data.userId);

      setState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== data.userId),
        presenterViewerIds: Object.fromEntries(
          Object.entries(prev.presenterViewerIds).map(([shareId, viewerIds]) => [
            shareId,
            viewerIds.filter((viewerId) => viewerId !== data.userId),
          ]),
        ),
        screenShares: prev.screenShares.filter((share) => share.presenterId !== data.userId),
        subscribedShareIds: prev.subscribedShareIds.filter((shareId) =>
          prev.screenShares.find((share) => share.shareId === shareId)?.presenterId !== data.userId,
        ),
        remoteScreenStreams: Object.fromEntries(
          Object.entries(prev.remoteScreenStreams).filter(([presenterId]) => presenterId !== data.userId),
        ),
      }));
    };

    const handleOffer = async (data: { fromUserId: string; sdp: string }) => {
      addEvent(`Received offer from ${data.fromUserId}`);
      recordDiagnostic("signaling", "offer-received", {
        direction: "received",
        signal: "offer",
        remoteUserId: data.fromUserId,
        remoteSocketId: null,
        pcId: peerConnectionsRef.current.get(data.fromUserId)
          ? getVoiceDiagnosticId(peerConnectionsRef.current.get(data.fromUserId)!, "pc")
          : null,
      });
      if (data.fromUserId === myUserId) {
        addEvent(`  Ignoring own offer`);
        return;
      }
      if (!localStreamRef.current) {
        addEvent(`  No local stream yet, skipping`);
        return;
      }

      let pc = peerConnectionsRef.current.get(data.fromUserId);
      if (pc) {
        addEvent(`  PC already exists, reusing`);
      } else {
        pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

        peerConnectionsRef.current.set(data.fromUserId, pc);
        if (!await captureRef.current?.senders.register(data.fromUserId, pc, async () => {
          if (peerConnectionsRef.current.get(data.fromUserId) === pc) await requestRenegotiationRef.current(data.fromUserId, pc!);
        })) { pc.close(); return; }
        await reconcileScreenTransportForPeer(data.fromUserId, pc, false);

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            const sock = getSocket();
            if (sock?.connected) {
              sock.emit("voice:ice-candidate", {
                channelId: channelIdRef.current, toUserId: data.fromUserId, candidate: e.candidate,
              });
              recordDiagnostic("signaling", "ice-sent", {
                direction: "sent",
                signal: "ice",
                remoteUserId: data.fromUserId,
                remoteSocketId: null,
                pcId: getVoiceDiagnosticId(pc!, "pc"),
              });
            }
          }
        };

        pc.oniceconnectionstatechange = () => {
          addEvent(`  ICE state ${data.fromUserId}: ${pc!.iceConnectionState}`);
        };

        pc.onconnectionstatechange = () => {
          addEvent(`  Conn state ${data.fromUserId}: ${pc!.connectionState}`);
          if (pc!.connectionState === "connected") captureRef.current?.transport.negotiated(data.fromUserId, pc!);
        };

        pc.onsignalingstatechange = () => {
          if (pc!.signalingState === "stable") {
            processPendingRenegotiation(data.fromUserId);
            captureRef.current?.transport.negotiated(data.fromUserId, pc!);
            void applyScreenSenderPolicies(data.fromUserId, pc!);
            capturePeerDiagnostic("renegotiation-stable", data.fromUserId, pc!);
          }
        };

        pc.ontrack = (e) => {
          handleRemoteTrack(e, data.fromUserId, pc!);
        };

        peerConnectionsRef.current.set(data.fromUserId, pc);
        capturePeerDiagnostic("voice-peer-created-from-offer", data.fromUserId, pc);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: data.sdp }));
        addEvent(`  Set remote description (offer) from ${data.fromUserId}`);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        addEvent(`  Created and set local answer`);

        const sock = getSocket();
        if (sock?.connected) {
          sock.emit("voice:answer", {
            channelId: channelIdRef.current, toUserId: data.fromUserId, sdp: answer.sdp,
          });
          recordDiagnostic("signaling", "answer-sent", {
            direction: "sent",
            signal: "answer",
            remoteUserId: data.fromUserId,
            remoteSocketId: null,
            pcId: getVoiceDiagnosticId(pc, "pc"),
          });
          addEvent(`  Sent answer to ${data.fromUserId}`);
        }

        // Add to member list if not already there
        setState((prev) => {
          if (prev.members.some((m) => m.userId === data.fromUserId)) return prev;
          return {
            ...prev,
            members: [...prev.members, {
              userId: data.fromUserId,
              username: data.fromUserId,
              displayName: data.fromUserId,
              isMuted: false,
              isDeafened: false,
            }],
          };
        });
      } catch (err: unknown) {
        addEvent(`  Offer/answer error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    const handleAnswer = async (data: { fromUserId: string; sdp: string }) => {
      addEvent(`Received answer from ${data.fromUserId}`);
      const pc = peerConnectionsRef.current.get(data.fromUserId);
      recordDiagnostic("signaling", "answer-received", {
        direction: "received",
        signal: "answer",
        remoteUserId: data.fromUserId,
        remoteSocketId: null,
        pcId: pc ? getVoiceDiagnosticId(pc, "pc") : null,
      });
      if (!pc) {
        addEvent(`  No PC for ${data.fromUserId}, ignoring`);
        return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: data.sdp }));
        addEvent(`  Set remote description (answer) from ${data.fromUserId}`);
      } catch (err: unknown) {
        addEvent(`  Answer error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    const handleIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionsRef.current.get(data.fromUserId);
      recordDiagnostic("signaling", "ice-received", {
        direction: "received",
        signal: "ice",
        remoteUserId: data.fromUserId,
        remoteSocketId: null,
        pcId: pc ? getVoiceDiagnosticId(pc, "pc") : null,
      });
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch { /* ignore */ }
    };

    const handleStateUpdated = (data: { userId: string; channelId?: string; isMuted?: boolean; isDeafened?: boolean; serverMuted?: boolean }) => {
      if (!channelIdRef.current || (data.channelId && data.channelId !== channelIdRef.current)) return;
      addEvent(`voice:state-updated: ${data.userId} mute=${data.isMuted} deaf=${data.isDeafened} srvMuted=${data.serverMuted}`);
      if (data.userId === myUserId) {
        if (data.isMuted || data.serverMuted || data.isDeafened) muteRequestRef.current++;
        syncCapturePolicy({
          // Notifications may close transmission. Only the current deliberate
          // Unmute acknowledgement may reopen it; an old echo has no request ID.
          selfMuted: data.isMuted === true || data.serverMuted === true || data.isDeafened === true
            ? true : capturePolicyRef.current.selfMuted,
          serverMuted: data.serverMuted ?? capturePolicyRef.current.serverMuted,
          deafened: data.isDeafened ?? capturePolicyRef.current.deafened,
        });
        setState((prev) => {
          const newServerMuted = data.serverMuted ?? prev.serverMuted;
          const newIsMuted = data.isMuted === true || data.serverMuted === true || data.isDeafened === true
            ? true : prev.isMuted;
          const newIsDeafened = data.isDeafened ?? prev.isDeafened;
          return { ...prev, isMuted: newIsMuted, isDeafened: newIsDeafened, serverMuted: newServerMuted };
        });
      } else {
        setState((prev) => ({
          ...prev,
          members: prev.members.map((m) =>
            m.userId === data.userId
              ? { ...m, isMuted: data.isMuted ?? m.isMuted, isDeafened: data.isDeafened ?? m.isDeafened }
              : m
          ),
        }));
      }
    };

    const handleVoiceError = (data: { code: string; message: string }) => {
      addEvent(`voice:error: ${data.code} — ${data.message}`);
      if (data.code === "SERVER_MUTED") {
        setState((prev) => ({ ...prev, serverMuted: true, isMuted: true }));
        muteRequestRef.current++;
        syncCapturePolicy({ serverMuted: true, selfMuted: true });
      } else if (data.code === "MISSING_SPEAK_PERMISSION") {
        setState((prev) => ({ ...prev, isMuted: true, error: data.message }));
        muteRequestRef.current++;
        syncCapturePolicy({ speakRevoked: true, selfMuted: true });
      } else {
        syncCapturePolicy({ selfMuted: true });
        setState((prev) => ({ ...prev, status: "failed", error: data.message }));
      }
    };

    const handleVoicePermissionRevoked = (data: { serverId?: string }) => {
      if (!callServerIdRef.current || data?.serverId !== callServerIdRef.current) return;
      void leave().then(() => {
        setState((prev) => ({ ...prev, error: "Voice access was revoked for this channel" }));
      });
    };

    const handleSpeakPermissionRevoked = (data: { serverId?: string }) => {
      if (!callServerIdRef.current || data?.serverId !== callServerIdRef.current) return;
      muteRequestRef.current++;
      syncCapturePolicy({ speakRevoked: true, selfMuted: true });
      setState((prev) => ({ ...prev, isMuted: true }));
    };

    const handleSocketDisconnect = () => {
      if (!channelIdRef.current) return;
      addEvent(`Voice socket disconnected; failing session closed`);
      resetVoiceSession(false);
    };

    s.on("voice:state", handleState);
    s.on("voice:user-joined", handleUserJoined);
    s.on("voice:user-left", handleUserLeft);
    s.on("voice:offer", handleOffer);
    s.on("voice:answer", handleAnswer);
    s.on("voice:ice-candidate", handleIceCandidate);
    s.on("voice:state-updated", handleStateUpdated);
    s.on("voice:error", handleVoiceError);
    s.on("voice:permission-revoked", handleVoicePermissionRevoked);
    s.on("voice:speak-permission-revoked", handleSpeakPermissionRevoked);
    s.on("disconnect", handleSocketDisconnect);

    // Screen share handlers
    const handleScreenStarted = (data: { channelId: string; presenterId: string }) => {
      const share = data as ScreenShareInfo;
      if (!share.shareId || share.channelId !== channelIdRef.current) return;
      addEvent(`screen:share-started by ${share.presenterId}`);
      screenPresenterUserIdRef.current = share.presenterId;
      if (share.presenterId !== myUserId) {
        screenShareIdsByPresenterRef.current.set(share.presenterId, share.shareId);
        ensureStreamAudioState(share.shareId);
        if (subscribedShareIdsRef.current.has(share.shareId)) {
          bindPendingScreenAudioForShare(share.presenterId, share.shareId);
        }
      }
      if (share.presenterId === myUserId) {
        localScreenShareIdRef.current = share.shareId;
        if (!authoritativeScreenViewersRef.current.has(share.shareId)) {
          authoritativeScreenViewersRef.current.set(share.shareId, new Set());
        }
      }
      setState((prev) => {
        const screenShares = prev.screenShares.some((item) => item.shareId === share.shareId)
          ? prev.screenShares
          : [...prev.screenShares, share];
        return {
          ...prev,
          screenShares,
          screenPresenterId: share.presenterId === myUserId ? prev.screenPresenterId : share.presenterId,
        };
      });
      s.emit("screen:viewer-state");
    };
    const handleScreenStopped = async (data: { shareId?: string; presenterId?: string }) => {
      addEvent(`screen:share-stopped ${data.shareId || ""}`);
      if (data.shareId) {
        subscribedShareIdsRef.current.delete(data.shareId);
        removeStreamAudioState(data.shareId);
      }
      const stopsCurrentLocalShare = data.shareId
        ? data.shareId === localScreenShareIdRef.current
        : data.presenterId === myUserId;
      if (stopsCurrentLocalShare) {
        await removeScreenTracksFromPeers();
        stopScreenTracks();
        const stoppedShareId = data.shareId || localScreenShareIdRef.current;
        if (stoppedShareId) authoritativeScreenViewersRef.current.delete(stoppedShareId);
        localScreenShareIdRef.current = null;
      }
      setState((prev) => {
        const removed = prev.screenShares.find((share) => share.shareId === data.shareId);
        const screenShares = data.shareId
          ? prev.screenShares.filter((share) => share.shareId !== data.shareId)
          : prev.screenShares.filter((share) => share.presenterId !== data.presenterId);
        const removedPresenterId = data.presenterId || removed?.presenterId;
        const presenterViewerIds = { ...prev.presenterViewerIds };
        delete presenterViewerIds[data.shareId || ""];
        const remoteScreenStreams = { ...prev.remoteScreenStreams };
        const presenterStillSharing = removedPresenterId
          ? screenShares.some((share) => share.presenterId === removedPresenterId)
          : false;
        if (removedPresenterId && !presenterStillSharing) {
          delete remoteScreenStreams[removedPresenterId];
          removeRemoteScreenMedia(removedPresenterId);
        }
        const subscribedShareIds = data.shareId
          ? prev.subscribedShareIds.filter((id) => id !== data.shareId)
          : prev.subscribedShareIds;
        const nextRemote = screenShares.find((share) => share.presenterId !== myUserId)?.presenterId || null;
        return { ...prev, screenShares, subscribedShareIds, presenterViewerIds, remoteScreenStreams, screenPresenterId: nextRemote };
      });
    };
    const handleScreenState = (data: { channelId: string; shares?: ScreenShareInfo[] }) => {
      if (data.channelId !== channelIdRef.current) return;
      const shares = data.shares || [];
      const activeShareIds = new Set(shares.map((share) => share.shareId));
      for (const shareId of subscribedShareIdsRef.current) {
        if (!activeShareIds.has(shareId)) subscribedShareIdsRef.current.delete(shareId);
      }
      for (const shareId of streamAudioByShareIdRef.current.keys()) {
        if (!activeShareIds.has(shareId)) removeStreamAudioState(shareId);
      }
      const activeRemotePresenters = new Set<string>();
      for (const share of shares) {
        if (share.presenterId === myUserId) continue;
        activeRemotePresenters.add(share.presenterId);
        screenShareIdsByPresenterRef.current.set(share.presenterId, share.shareId);
        ensureStreamAudioState(share.shareId);
        if (subscribedShareIdsRef.current.has(share.shareId)) {
          bindPendingScreenAudioForShare(share.presenterId, share.shareId);
        }
      }
      for (const presenterId of screenShareIdsByPresenterRef.current.keys()) {
        if (!activeRemotePresenters.has(presenterId)) {
          const endedShareId = screenShareIdsByPresenterRef.current.get(presenterId);
          if (endedShareId) {
            subscribedShareIdsRef.current.delete(endedShareId);
            teardownScreenAudioPlaybackForShare(endedShareId, presenterId);
            removeStreamAudioState(endedShareId);
          }
          screenShareIdsByPresenterRef.current.delete(presenterId);
        }
      }
      setState((prev) => {
        const activePresenterIds = new Set(shares.map((share) => share.presenterId));
        const remoteScreenStreams = Object.fromEntries(
          Object.entries(prev.remoteScreenStreams).filter(([presenterId]) => activePresenterIds.has(presenterId)),
        );
        return {
          ...prev,
          screenShares: shares,
          subscribedShareIds: prev.subscribedShareIds.filter((shareId) => shares.some((share) => share.shareId === shareId)),
          remoteScreenStreams,
          screenPresenterId: shares.find((share) => share.presenterId !== myUserId)?.presenterId || null,
        };
      });
    };
    const handleViewerState = async (data: { subscribedShareIds?: string[]; presenterShares?: Array<{ shareId: string; viewerIds: string[] }> }) => {
      const channelAtStart = channelIdRef.current;
      if (!channelAtStart) return;
      const nextSubscribedShareIds = new Set(data.subscribedShareIds || []);
      for (const previousShareId of subscribedShareIdsRef.current) {
        if (!nextSubscribedShareIds.has(previousShareId)) {
          teardownScreenAudioPlaybackForShare(previousShareId);
        }
      }
      subscribedShareIdsRef.current = nextSubscribedShareIds;
      const presenterShares = data.presenterShares || [];
      if (!localScreenShareIdRef.current && presenterShares.length > 0) {
        localScreenShareIdRef.current = presenterShares[0].shareId;
      }
      const localShareId = localScreenShareIdRef.current;
      if (localShareId) {
        const authoritativeShare = presenterShares.find((share) => share.shareId === localShareId);
        authoritativeScreenViewersRef.current.set(localShareId, new Set(authoritativeShare?.viewerIds || []));
      }
      peerConnectionsRef.current.forEach((pc, remoteUserId) => {
        capturePeerDiagnostic("before-viewer-state-reconciliation", remoteUserId, pc);
      });
      await reconcileAllScreenTransports();
      peerConnectionsRef.current.forEach((pc, remoteUserId) => {
        capturePeerDiagnostic("after-viewer-state-reconciliation", remoteUserId, pc);
      });
      recordDiagnostic("subscription", "viewer-state", {
        subscribedShareIds: [...nextSubscribedShareIds],
        presenterShares: presenterShares.map((share) => ({ shareId: share.shareId, viewerIds: [...share.viewerIds] })),
      });
      if (channelIdRef.current !== channelAtStart) return;
      for (const [presenterId, shareId] of screenShareIdsByPresenterRef.current) {
        if (nextSubscribedShareIds.has(shareId)) bindPendingScreenAudioForShare(presenterId, shareId);
      }
      setState((prev) => ({
        ...prev,
        subscribedShareIds: [...nextSubscribedShareIds],
        presenterViewerIds: Object.fromEntries(presenterShares.map((share) => [share.shareId, [...new Set(share.viewerIds)] ])),
        remoteScreenStreams: Object.fromEntries(Object.entries(prev.remoteScreenStreams).filter(([presenterId]) => {
          return prev.screenShares.some((share) =>
            share.presenterId === presenterId && nextSubscribedShareIds.has(share.shareId),
          );
        })),
      }));
    };
    const handleViewerJoined = async (data: { shareId: string; viewerId: string }) => {
      const channelAtStart = channelIdRef.current;
      if (!channelAtStart) return;
      if (data.shareId === localScreenShareIdRef.current) {
        if (!authoritativeScreenViewersRef.current.has(data.shareId)) {
          authoritativeScreenViewersRef.current.set(data.shareId, new Set());
        }
        const viewerIds = authoritativeScreenViewersRef.current.get(data.shareId)!;
        const wasAlreadyAuthoritative = viewerIds.has(data.viewerId);
        viewerIds.add(data.viewerId);
        if (!wasAlreadyAuthoritative) playScreenViewerJoinedSound(myUserId);
        const pc = peerConnectionsRef.current.get(data.viewerId);
        if (pc) {
          capturePeerDiagnostic("presenter-before-screen-join-reconciliation", data.viewerId, pc);
          await reconcileScreenTransportForPeer(data.viewerId, pc, true);
          if (isVoiceDebugEnabled()) {
            const joinKey = `${data.shareId}:${data.viewerId}`;
            const joinCount = wasAlreadyAuthoritative
              ? screenViewerJoinCountsRef.current.get(joinKey) || 1
              : (screenViewerJoinCountsRef.current.get(joinKey) || 0) + 1;
            screenViewerJoinCountsRef.current.set(joinKey, joinCount);
            capturePeerDiagnostic(joinCount > 1 ? "presenter-after-screen-rejoin" : "presenter-after-screen-join", data.viewerId, pc);
          }
        }
      }
      if (data.viewerId === myUserId) {
        subscribedShareIdsRef.current.add(data.shareId);
        ensureStreamAudioState(data.shareId);
        const presenterId = [...screenShareIdsByPresenterRef.current]
          .find(([, shareId]) => shareId === data.shareId)?.[0];
        if (presenterId) bindPendingScreenAudioForShare(presenterId, data.shareId);
        if (isVoiceDebugEnabled()) {
          const joinKey = `local-viewer:${data.shareId}`;
          const joinCount = (screenViewerJoinCountsRef.current.get(joinKey) || 0) + 1;
          screenViewerJoinCountsRef.current.set(joinKey, joinCount);
          captureVoiceDiagnosticSnapshot(joinCount > 1 ? "viewer-after-screen-rejoin" : "viewer-after-screen-join");
        }
      }
      recordDiagnostic("subscription", "viewer-joined", {
        shareId: data.shareId,
        viewerUserId: data.viewerId,
        localUserId: myUserId || null,
        localIsViewer: data.viewerId === myUserId,
        localIsPresenter: data.shareId === localScreenShareIdRef.current,
        locallySubscribed: subscribedShareIdsRef.current.has(data.shareId),
      });
      if (channelIdRef.current !== channelAtStart) return;
      setState((prev) => {
        const ownShare = prev.screenShares.find((share) => share.shareId === data.shareId && share.presenterId === myUserId);
        const alreadyWatching = prev.subscribedShareIds.includes(data.shareId);
        const existingViewerIds = prev.presenterViewerIds[data.shareId] || [];
        const alreadyListed = existingViewerIds.includes(data.viewerId);
        const viewerName = prev.members.find((member) => member.userId === data.viewerId)?.displayName || data.viewerId;
        return {
          ...prev,
          subscribedShareIds: data.viewerId === myUserId && !alreadyWatching ? [...prev.subscribedShareIds, data.shareId] : prev.subscribedShareIds,
          presenterViewerIds: ownShare && !alreadyListed
            ? { ...prev.presenterViewerIds, [data.shareId]: [...existingViewerIds, data.viewerId] }
            : prev.presenterViewerIds,
          streamNotice: ownShare && !alreadyListed ? `${viewerName} joined your stream` : prev.streamNotice,
        };
      });
    };
    const handleViewerLeft = async (data: { shareId: string; viewerId: string }) => {
      const channelAtStart = channelIdRef.current;
      if (!channelAtStart) return;
      let presenterPeer: RTCPeerConnection | undefined;
      if (data.shareId === localScreenShareIdRef.current) {
        const viewerIds = authoritativeScreenViewersRef.current.get(data.shareId);
        const wasAuthoritativeViewer = viewerIds?.has(data.viewerId) === true;
        viewerIds?.delete(data.viewerId);
        if (wasAuthoritativeViewer) playScreenViewerLeftSound(myUserId);
        presenterPeer = peerConnectionsRef.current.get(data.viewerId);
        if (presenterPeer) {
          capturePeerDiagnostic("presenter-before-screen-leave-reconciliation", data.viewerId, presenterPeer);
        }
      }
      if (data.viewerId === myUserId) {
        subscribedShareIdsRef.current.delete(data.shareId);
        const presenterId = [...screenShareIdsByPresenterRef.current]
          .find(([, shareId]) => shareId === data.shareId)?.[0];
        teardownScreenAudioPlaybackForShare(data.shareId, presenterId);
        if (isVoiceDebugEnabled()) captureVoiceDiagnosticSnapshot("viewer-after-screen-leave");
      }
      recordDiagnostic("subscription", "viewer-left", {
        shareId: data.shareId,
        viewerUserId: data.viewerId,
        localUserId: myUserId || null,
        localIsViewer: data.viewerId === myUserId,
        localIsPresenter: data.shareId === localScreenShareIdRef.current,
        locallySubscribed: subscribedShareIdsRef.current.has(data.shareId),
      });
      setState((prev) => {
        const ownShare = prev.screenShares.find((share) => share.shareId === data.shareId && share.presenterId === myUserId);
        const watchedShare = prev.screenShares.find((share) => share.shareId === data.shareId);
        const existingViewerIds = prev.presenterViewerIds[data.shareId] || [];
        const viewerName = prev.members.find((member) => member.userId === data.viewerId)?.displayName || data.viewerId;
        const remoteScreenStreams = { ...prev.remoteScreenStreams };
        if (data.viewerId === myUserId && watchedShare) {
          delete remoteScreenStreams[watchedShare.presenterId];
        }
        return {
          ...prev,
          subscribedShareIds: data.viewerId === myUserId
            ? prev.subscribedShareIds.filter((shareId) => shareId !== data.shareId)
            : prev.subscribedShareIds,
          presenterViewerIds: ownShare
            ? { ...prev.presenterViewerIds, [data.shareId]: existingViewerIds.filter((id) => id !== data.viewerId) }
            : prev.presenterViewerIds,
          remoteScreenStreams,
          streamNotice: ownShare && existingViewerIds.includes(data.viewerId) ? `${viewerName} left your stream` : prev.streamNotice,
        };
      });
      if (channelIdRef.current !== channelAtStart || !presenterPeer) return;
      await reconcileScreenTransportForPeer(data.viewerId, presenterPeer, true);
      capturePeerDiagnostic("presenter-after-screen-leave", data.viewerId, presenterPeer);
    };

    s.on("screen:share-started", handleScreenStarted);
    s.on("screen:share-stopped", handleScreenStopped);
    s.on("screen:share-state", handleScreenState);
    s.on("screen:viewer-state", handleViewerState);
    s.on("screen:viewer-joined", handleViewerJoined);
    s.on("screen:viewer-left", handleViewerLeft);

    return () => {
      s.off("screen:share-started", handleScreenStarted);
      s.off("screen:share-stopped", handleScreenStopped);
      s.off("screen:share-state", handleScreenState);
      s.off("screen:viewer-state", handleViewerState);
      s.off("screen:viewer-joined", handleViewerJoined);
      s.off("screen:viewer-left", handleViewerLeft);
      s.off("voice:state", handleState);
      s.off("voice:user-joined", handleUserJoined);
      s.off("voice:user-left", handleUserLeft);
      s.off("voice:offer", handleOffer);
      s.off("voice:answer", handleAnswer);
      s.off("voice:ice-candidate", handleIceCandidate);
      s.off("voice:state-updated", handleStateUpdated);
      s.off("voice:error", handleVoiceError);
      s.off("voice:permission-revoked", handleVoicePermissionRevoked);
      s.off("voice:speak-permission-revoked", handleSpeakPermissionRevoked);
      s.off("disconnect", handleSocketDisconnect);
    };
  }, [authenticated, myUserId, serverId, leave, applyScreenSenderPolicies, bindPendingScreenAudioForShare, capturePeerDiagnostic, captureVoiceDiagnosticSnapshot, createPeerConnection, ensureStreamAudioState, processPendingRenegotiation, reconcileAllScreenTransports, reconcileScreenTransportForPeer, recordDiagnostic, removeRemoteScreenMedia, removeScreenTracksFromPeers, removeStreamAudioState, resetVoiceSession, stopScreenTracks, teardownScreenAudioPlaybackForShare]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const s = getSocket();
      if (s?.connected && channelIdRef.current) {
        s.emit("voice:leave", { channelId: channelIdRef.current });
      }
      cleanup();
    };
  }, [cleanup]);

  // Beforeunload: stop local tracks on tab close/refresh.
  // WS voice:leave is unreliable here — server-side disconnect handles it authoritatively.
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopSpeakingAnalysis();
      stopLocalTracks();
      closePeerConnections();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [stopSpeakingAnalysis, stopLocalTracks, closePeerConnections]);

  return {
    ...state,
    screenAudioAvailableByShareId,
    screenShareFeedback,
    getVoicePersonalMixPreference,
    setVoicePersonalMixPreference,
    getVoicePersonalMixStatus,
    retryVoicePersonalMix,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    clearError,
    startScreenShare,
    stopScreenShare,
    joinScreenShare,
    leaveScreenShare,
    setRemoteScreenAudioHidden,
    getStreamVolume,
    setStreamVolume,
    isStreamMuted,
    setStreamMuted,
    voiceSoundsEnabled: isVoiceSoundsEnabled(myUserId),
    setVoiceSoundsEnabled: (enabled: boolean) => setVoiceSoundsEnabled(enabled, myUserId),
    debugEvents: debugEvents,
  };
}
