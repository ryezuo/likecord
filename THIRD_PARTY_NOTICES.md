# Third-party notices

The root [MIT license](LICENSE) covers Likecord-owned material. It does not relicense third-party material or override the licenses of dependencies installed from their own packages.

## Bundled RNNoise/Jitsi component

`apps/web/public/audio/voice/rnnoise-jitsi-0.2.1-v1/rnnoise-sync.js` includes the pinned `@jitsi/rnnoise-wasm@0.2.1` wrapper, engine and default model. Its full retained Apache-2.0, MIT and Xiph/BSD notices are in [THIRD_PARTY_NOTICES.txt](apps/web/public/audio/voice/rnnoise-jitsi-0.2.1-v1/THIRD_PARTY_NOTICES.txt). The adjacent [manifest](apps/web/public/audio/voice/rnnoise-jitsi-0.2.1-v1/manifest.json) records package/source identities and hashes. Preserve those notices when redistributing the bundled component.

## Other materials

The tracked interface uses system fonts and code-native icons; no bundled font or sound file was found in the reviewed source tree. Notification sounds are generated in code. Brand assets are the project's supplied/generated artwork, with provenance recorded in the [visual identity contract](docs/product/visual-identity-refresh.md). Package dependencies retain their own package licenses and notices; the pnpm lockfile identifies the package versions but is not a substitute for their license texts.
