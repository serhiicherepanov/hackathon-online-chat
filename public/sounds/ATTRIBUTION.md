# Notification sound clips

The four OGG Vorbis files in this directory (`dm.ogg`, `mention.ogg`,
`room.ogg`, `friend.ogg`) are **synthesized short sine-wave blips** generated
in-repo by the `add-desktop-notifications` change. They are not sourced from
any third-party sound library.

| File          | Intent          | Pitch (Hz) | Duration |
| ------------- | --------------- | ---------- | -------- |
| `dm.ogg`      | Direct message  | 880        | ~350 ms  |
| `mention.ogg` | @-mention       | 1174.7     | ~350 ms  |
| `room.ogg`    | Room message    | 659.3      | ~350 ms  |
| `friend.ogg`  | Friend request  | 987.8      | ~350 ms  |

They are licensed identically to the rest of the repository. Replace any of
them by dropping a matching-named OGG Vorbis clip in this directory; the
client loads them by URL via `HTMLAudioElement` and does not assume any
particular length or amplitude envelope.
