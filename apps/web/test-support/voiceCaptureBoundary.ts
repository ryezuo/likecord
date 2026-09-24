import { CallSenderRegistry } from "../src/lib/callSenders";

// Hook/Screen regression suites supply a track at the processed-owner boundary.
// Real acquisition, graph, failure and switching are tested in voice-capture.
export function captureBoundary() {
  let stream: MediaStream | null = null;
  let current = () => false;
  const senders = new CallSenderRegistry();
  return {
    subscribe: () => () => undefined,
    senders,
    transport: {
      releaseReceiver: jest.fn(),
      bindReceiver: jest.fn(),
      negotiated: jest.fn(),
    },
    startCall: async (valid: () => boolean, publish: (value: MediaStream) => void) => {
      current = valid;
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!valid()) { acquired.getTracks().forEach((t) => t.stop()); throw new Error("Obsolete capture"); }
      stream = acquired;
      stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      senders.publish({ generation: 1, track: stream.getAudioTracks()[0], stream });
      publish(stream); return stream;
    },
    setTransmission: (allowed: boolean) => stream?.getAudioTracks().forEach((track) => { track.enabled = allowed && current(); }),
    stop: () => { stream = null; current = () => false; senders.clear(); },
  };
}
