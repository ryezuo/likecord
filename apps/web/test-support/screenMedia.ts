/** Minimal track-preserving MediaStream for screen presentation tests. */
export class TestMediaStream extends EventTarget {
  private tracks: MediaStreamTrack[];
  constructor(tracks: MediaStreamTrack[] = []) { super(); this.tracks = [...tracks]; }
  getTracks() { return [...this.tracks]; }
  getAudioTracks() { return this.tracks.filter((track) => track.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === "video"); }
  addTrack(track: MediaStreamTrack) {
    if (!this.tracks.includes(track)) { this.tracks.push(track); this.dispatchEvent(new Event("addtrack")); }
  }
  removeTrack(track: MediaStreamTrack) {
    this.tracks = this.tracks.filter((entry) => entry !== track);
    this.dispatchEvent(new Event("removetrack"));
  }
}

/** jsdom has no layout. Supply measured workspace/tray rectangles, never browser presentation state. */
export function installScreenLayout() {
  const original = HTMLElement.prototype.getBoundingClientRect;
  return jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("screen-share-presentation-workspace")) return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} };
    if (this.classList.contains("screen-share-tray")) return { x: 0, y: 520, left: 0, top: 520, right: 800, bottom: 600, width: 800, height: this.childElementCount ? 80 : 0, toJSON() {} };
    return original.call(this);
  });
}
