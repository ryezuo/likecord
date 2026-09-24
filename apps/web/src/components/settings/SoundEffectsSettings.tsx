"use client";
import CaptureSettings from "./CaptureSettings";

import { useEffect, useState } from "react";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import type { AudioOutputRole, AudioOutputRoleSettings } from "../../lib/audioOutput";
import { testVoiceSound } from "../../lib/voiceSounds";

const ROLE_LABELS: Record<AudioOutputRole, string> = {
  receive: "Calls and streams",
  sfx: "Sound effects",
};

function formatNumber(value: number | null, unit: string) {
  return value === null ? "Not exposed" : `${Math.round(value * 100) / 100} ${unit}`;
}

function AdvancedOutputRole({
  role,
  settings,
  effective,
  applying,
  onUpdate,
  onReset,
}: {
  role: AudioOutputRole;
  settings: AudioOutputRoleSettings;
  effective: ReturnType<typeof useUserPreferences>["playback"]["output"]["effective"][AudioOutputRole];
  applying: boolean;
  onUpdate: (settings: Partial<AudioOutputRoleSettings>) => void;
  onReset: () => void;
}) {
  const latencyMode = typeof settings.latencyHint === "number" ? "custom" : settings.latencyHint;
  return <fieldset className="audio-output-advanced-role" disabled={applying}>
    <legend>{ROLE_LABELS[role]}</legend>
    <div className="audio-output-control-grid">
      <div className="user-settings-field">
        <label htmlFor={`${role}-latency-hint`}>Latency balance</label>
        <select id={`${role}-latency-hint`} value={latencyMode} onChange={(event) => {
          const value = event.target.value;
          onUpdate({ latencyHint: value === "custom" ? 20 : value as AudioOutputRoleSettings["latencyHint"] });
        }}>
          <option value="auto">Auto</option>
          <option value="interactive">Interactive</option>
          <option value="balanced">Balanced</option>
          <option value="playback">Playback stability</option>
          <option value="custom">Custom milliseconds</option>
        </select>
        {typeof settings.latencyHint === "number" && <input type="number" min={0} max={1000} step={1}
          aria-label={`${ROLE_LABELS[role]} custom latency in milliseconds`}
          value={settings.latencyHint}
          onChange={(event) => onUpdate({ latencyHint: Number(event.target.value) })} />}
        <p className="user-settings-field-help">Constructor hint; the browser may choose a different effective latency.</p>
      </div>

      <div className="user-settings-field">
        <label htmlFor={`${role}-sample-rate`}>Processing sample rate</label>
        <select id={`${role}-sample-rate`} value={settings.sampleRate ?? "auto"}
          onChange={(event) => onUpdate({ sampleRate: event.target.value === "auto" ? null : Number(event.target.value) })}>
          <option value="auto">Auto</option>
          <option value="44100">44,100 Hz</option>
          <option value="48000">48,000 Hz</option>
          <option value="96000">96,000 Hz</option>
        </select>
        <p className="user-settings-field-help">Recreates this output context; it does not change microphone capture.</p>
      </div>

      <div className="user-settings-field">
        <label htmlFor={`${role}-render-size`}>Render block</label>
        <select id={`${role}-render-size`} value={settings.renderSizeHint}
          onChange={(event) => onUpdate({ renderSizeHint: event.target.value === "auto" || event.target.value === "hardware"
            ? event.target.value : Number(event.target.value) })}>
          <option value="auto">Auto</option>
          <option value="hardware">Hardware</option>
          {[64, 128, 256, 512, 1024].map((size) => <option key={size} value={size}>{size} frames</option>)}
        </select>
        <p className="user-settings-field-help">Effective quantum is shown only when the browser exposes it.</p>
      </div>

      <div className="user-settings-field">
        <label htmlFor={`${role}-channel-layout`}>Channel layout</label>
        <select id={`${role}-channel-layout`} value={settings.channelLayout}
          onChange={(event) => onUpdate({ channelLayout: event.target.value as AudioOutputRoleSettings["channelLayout"] })}>
          <option value="auto">Auto — preserve source layout</option>
          <option value="mono">Mono</option>
          <option value="stereo">Stereo</option>
        </select>
        <p className="user-settings-field-help">Mono deliberately downmixes. Auto preserves stereo when the source and browser support it.</p>
      </div>
    </div>

    <dl className="audio-output-effective">
      <div><dt>Context</dt><dd>{effective?.contextState ?? "Not started"}</dd></div>
      <div><dt>Effective rate</dt><dd>{formatNumber(effective?.sampleRate ?? null, "Hz")}</dd></div>
      <div><dt>Render quantum</dt><dd>{formatNumber(effective?.renderQuantumSize ?? null, "frames")}</dd></div>
      <div><dt>Base latency</dt><dd>{formatNumber(effective?.baseLatencyMs ?? null, "ms")}</dd></div>
      <div><dt>Output latency</dt><dd>{formatNumber(effective?.outputLatencyMs ?? null, "ms")}</dd></div>
      <div><dt>Output clock</dt><dd>{effective?.outputTimestamp
        ? `${effective.outputTimestamp.contextTime.toFixed(3)} s / ${effective.outputTimestamp.performanceTime.toFixed(1)} ms`
        : "Not exposed"}</dd></div>
    </dl>
    {effective?.note && <p className="user-settings-field-help">{effective.note}</p>}
    <button type="button" className="btn btn-secondary" onClick={onReset}>Reset this context to Auto</button>
  </fieldset>;
}

export default function SoundEffectsSettings() {
  const {
    status, error, retry,
    soundEffects: sound,
    updateSoundEffectsEnabled, updateSoundEffectsVolume, commitSoundEffects,
    importLegacySoundEffects, retrySoundEffects,
    playback, updateCallAndStreamVolume, commitCallAndStreamVolume, retryCallAndStreamVolume,
    chooseAudioOutput, applyListedAudioOutput, resetAudioOutput, retryAudioOutput, refreshAudioOutputs,
    updateAudioOutputRole, resetAudioOutputRole,
  } = useUserPreferences();
  const [testMessage, setTestMessage] = useState("");
  const [listedDevice, setListedDevice] = useState(playback.output.profile.deviceId);
  const output = playback.output;
  const applyingOutput = output.status === "applying";
  const selectedDevice = output.devices.find((device) => device.deviceId === output.profile.deviceId);
  const effectiveDevice = output.devices.find((device) => device.deviceId === output.effectiveDeviceId);
  const directCustomOutput = output.capabilities.contextSink;

  useEffect(() => { setListedDevice(output.profile.deviceId); }, [output.profile.deviceId]);

  const desiredOutputLabel = output.profile.deviceId === ""
    ? "System default"
    : selectedDevice?.label || "Previously authorized output";
  const effectiveOutputLabel = output.effectiveDeviceId === ""
    ? "System default"
    : effectiveDevice?.label || "Authorized output";

  return <section className="sound-effects-settings voice-audio-settings" aria-labelledby="voice-audio-title">
    <header className="user-settings-heading">
      <h3 id="voice-audio-title">Voice &amp; Audio</h3>
      <p>Configure microphone input, received calls, streams and Likecord sound effects.</p>
    </header>

    {status === "loading" && <div className="user-settings-sync-status" role="status" aria-busy="true">Loading audio preferences…</div>}
    {status === "error" && <div className="error-banner user-settings-sync-error" role="alert">
      <span>{error || "Unable to load audio preferences."} {sound.ready || playback.ready ? "Known settings remain active." : "Received audio and effects stay silent until preferences load."}</span>
      <button type="button" className="btn btn-secondary" onClick={retry}>Retry</button>
    </div>}

    <CaptureSettings />

    <section className="voice-audio-section" aria-labelledby="voice-output-title">
      <h4 id="voice-output-title">Output</h4>
      <div className="user-settings-field call-stream-master">
        <label htmlFor="call-stream-master">Volume de chamadas e transmissões <output htmlFor="call-stream-master">{playback.masterPercent}%</output></label>
        <input id="call-stream-master" type="range" min={0} max={200} step={1} value={playback.masterPercent}
          disabled={!playback.ready} aria-valuetext={`${playback.masterPercent}%`} aria-describedby="call-stream-master-description"
          onChange={(event) => updateCallAndStreamVolume(Number(event.target.value))}
          onPointerUp={commitCallAndStreamVolume} onKeyUp={commitCallAndStreamVolume} onBlur={commitCallAndStreamVolume} />
        <p id="call-stream-master-description" className="user-settings-field-help">Applies once to received call and Screen Share audio. Personal mix stays 0–100%; effects stay independent.</p>
      </div>

      <div className="audio-output-device" aria-busy={applyingOutput}>
        <div className="audio-output-device-heading">
          <div><strong>Output device</strong><span>Requested: {desiredOutputLabel}. Effective: {effectiveOutputLabel}.</span></div>
          <button type="button" className="btn btn-secondary" disabled={applyingOutput}
            onClick={() => { void refreshAudioOutputs(); }}>Refresh</button>
        </div>

        {directCustomOutput && output.capabilities.picker && <div className="user-settings-actions">
          <button type="button" className="btn btn-secondary" disabled={applyingOutput}
            onClick={() => { void chooseAudioOutput(); }}>Choose output device</button>
          {output.profile.deviceId !== "" && <button type="button" className="btn btn-secondary" disabled={applyingOutput} onClick={resetAudioOutput}>Use system default</button>}
        </div>}

        {directCustomOutput && !output.capabilities.picker && output.capabilities.enumeration && output.devices.length > 0 && <div className="audio-output-list-choice">
          <label htmlFor="audio-output-list">Available output</label>
          <select id="audio-output-list" value={listedDevice} disabled={applyingOutput}
            onChange={(event) => setListedDevice(event.target.value)}>
            <option value="">System default</option>
            {output.devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Output device ${index + 1}`}</option>)}
          </select>
          <button type="button" className="btn btn-secondary" disabled={applyingOutput || listedDevice === output.profile.deviceId}
            onClick={() => applyListedAudioOutput(listedDevice)}>Apply output</button>
        </div>}

        {!directCustomOutput && <p className="user-settings-field-help">
          Likecord is using the system default. {output.capabilities.elementSink
            ? "This browser exposes element-only routing, but the unproven element bridge is not enabled for the protected direct graph."
            : "This browser does not expose a usable custom route for the direct graph."}
        </p>}
        {directCustomOutput && !output.capabilities.picker && output.devices.length === 0 && <p className="user-settings-field-help">
          No authorized output alternatives are exposed. Likecord will not open your microphone to reveal labels; system default remains available.
        </p>}
        <p className="user-settings-field-help">
          Speaker permission: {output.capabilities.permission === "not-queryable" ? "not queryable (not the same as denied)" : output.capabilities.permission}.
          System-default hardware can be rerouted by the operating system before Likecord is notified.
        </p>
        {output.storage === "memory" && <p className="user-settings-field-help" role="status">Browser storage is blocked. Output choices are kept only for this session.</p>}
        {applyingOutput && <p className="user-settings-sync-status" role="status">Applying output to calls, streams and effects…</p>}
        {(output.status === "failed" || output.status === "device-lost") && <div className="error-banner user-settings-sync-error" role="alert">
          <span>{output.error}</span><button type="button" className="btn btn-secondary" onClick={retryAudioOutput}>Retry</button>
        </div>}
      </div>

      {playback.mutationStatus !== "idle" && <div className="user-settings-preference-status" aria-live="polite">
        {playback.mutationStatus === "saving" && <span role="status">Saving master volume…</span>}
        {playback.mutationStatus === "saved" && <span className="user-settings-save-status" role="status">Master volume saved.</span>}
        {playback.mutationStatus === "error" && <div className="error-banner user-settings-sync-error" role="alert">
          <span>{playback.error || "Unable to save master volume."} Unsaved — the current quieter value remains active for this session.</span>
          <button type="button" className="btn btn-secondary" onClick={retryCallAndStreamVolume}>Retry</button>
        </div>}
      </div>}

      <details className="audio-output-advanced">
        <summary>Advanced output</summary>
        <p className="user-settings-field-help">These settings are local to this account and device. Changes recreate only the selected output context; they do not reconnect your call.</p>
        {(["receive", "sfx"] as const).map((role) => <AdvancedOutputRole key={role} role={role}
          settings={output.profile.roles[role]} effective={output.effective[role]} applying={applyingOutput}
          onUpdate={(settings) => updateAudioOutputRole(role, settings)}
          onReset={() => resetAudioOutputRole(role)} />)}
      </details>
    </section>

    <section className="voice-audio-section" aria-labelledby="sound-effects-title">
      <h4 id="sound-effects-title">Sons e efeitos</h4>
      <p className="user-settings-field-help">Uses the common output choice above. Call, microphone and Screen Share mix controls stay independent.</p>
      <label className="user-settings-preference">
        <span className="user-settings-preference-copy"><strong>Enable sound effects</strong>
          <span id="sound-enabled-description">Play feedback for voice and screen share actions.</span></span>
        <input type="checkbox" checked={sound.enabled} disabled={!sound.ready} aria-describedby="sound-enabled-description"
          onChange={(event) => { setTestMessage(""); updateSoundEffectsEnabled(event.target.checked); }} />
      </label>
      <div className="user-settings-field sound-effects-volume">
        <label htmlFor="sound-effects-volume">Effects volume <output htmlFor="sound-effects-volume">{sound.volume}%</output></label>
        <input id="sound-effects-volume" type="range" min={0} max={100} step={1} value={sound.volume}
          disabled={!sound.ready} aria-valuetext={`${sound.volume}%`} aria-describedby="sound-volume-description"
          onChange={(event) => { setTestMessage(""); updateSoundEffectsVolume(Number(event.target.value)); }}
          onPointerUp={commitSoundEffects} onKeyUp={commitSoundEffects} onBlur={commitSoundEffects} />
        <p id="sound-volume-description" className="user-settings-field-help">Applies immediately. Your volume is kept when effects are disabled.</p>
      </div>
      <div className="user-settings-actions">
        <button type="button" className="btn btn-secondary" disabled={!sound.ready || !sound.enabled || sound.volume === 0 || output.status === "device-lost"}
          aria-describedby="sound-test-description" onClick={() => setTestMessage(testVoiceSound()
            ? "Test sound requested at your current effects volume."
            : "Sound output is not ready. Try Test sound again after the output is ready.")}>Test sound</button>
        <span id="sound-test-description" className="user-settings-field-help">
          {!sound.enabled ? "Enable effects to test a sound." : sound.volume === 0 ? "Raise effects volume above 0% to test a sound." : "Plays the existing join sound. No microphone needed."}
        </span>
      </div>
      {testMessage && <p className="user-settings-field-help" role="status">{testMessage}</p>}
      {sound.ready && sound.legacyCandidate !== null && <div className="sound-effects-legacy">
        <p className="user-settings-field-help">This browser previously had sound effects {sound.legacyCandidate ? "enabled" : "disabled"}. Keep that choice for this account?</p>
        <button type="button" className="btn btn-secondary" disabled={sound.mutationStatus === "saving"}
          onClick={importLegacySoundEffects}>Keep browser sound setting</button>
      </div>}
      {sound.mutationStatus !== "idle" && <div className="user-settings-preference-status" aria-live="polite">
        {sound.mutationStatus === "saving" && <span role="status">Saving sound preferences…</span>}
        {sound.mutationStatus === "saved" && <span className="user-settings-save-status" role="status">Sound preferences saved.</span>}
        {sound.mutationStatus === "error" && <div className="error-banner user-settings-sync-error" role="alert">
          <span>{sound.error || "Unable to save sound preferences."} Unsaved — your intended settings remain active for this session.</span>
          <button type="button" className="btn btn-secondary" onClick={retrySoundEffects}>Retry</button>
        </div>}
      </div>}
    </section>
  </section>;
}
