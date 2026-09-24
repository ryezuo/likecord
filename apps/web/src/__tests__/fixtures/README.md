# Avatar preview fixtures

These two files are deterministic, valid AV2.2 inputs shared by automated and
manual browser-preview checks. They are derived from the accepted API fixture
generators in `apps/api/src/user/avatar/avatar-animation.fixtures.ts`.

| File | Format | Size | Canvas | Frames | Normalized cycle | Effective FPS | SHA-256 |
|---|---|---:|---:|---:|---:|---:|---|
| `valid-animated-avatar.gif` | GIF89a | 219 bytes | 8×6 | 3 | 300 ms | 10 | `AA042A5C41AFDDCFC975E32EE6A3EEED7FF52F1F82C458F4B9B132EB6AC66456` |
| `valid-animated-avatar.webp` | animated WebP | 200 bytes | 8×6 | 3 | 300 ms | 10 | `7E6F4B40E4676A7A082C2EE2A0E62D3913C7BA3EE9B6D039D0FE4672841F4E8E` |

Both use an infinite loop, remain far below all accepted AV2.2 byte, axis,
pixel-frame, decoded-RGBA, cycle, and FPS ceilings, and are suitable as the
first inputs for renewed manual acceptance. The browser preview is expected to
be a static PNG consumed by the existing crop editor; animation is preserved
only by the later server-authoritative upload path.
