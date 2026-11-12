# Bedrock protocol notes

Offline documentation for a Minecraft Bedrock client, generated from the schema in
`src/engine/bedrockx-lib/protocol/protocol.json` (game 1.26.60, protocol 2225).

| Chapter | File | Covers |
|---|---|---|
| 01 | `index.html` | Overview, stack diagram, sources |
| 02 | `packets.html` | 254 packets by id + 189 reusable types, searchable |
| 03 | `messages.html` | `text` packet, `/me` via command origins, message loops |
| 04 | `movement.html` | `player_auth_input` tick loop, reconciliation |
| 05 | `auth.html` | Device code, Bedrock session, login JWT, devices, token storage |
| 06 | `nethernet.html` | UDP discovery, signalling, WebRTC, framing, join flow |
| 07 | `engine.html` | State machine, handshake, AES framing, API, relay |
| 08 | `rewrite.html` | Design critique and a blueprint for a better client |
| 09 | `exploits.html` | Array/NBT/flood abuse classes, validation code, detection scoring |
| 10 | `automod.html` | A full operator bot: join, decode, score spam/bots, kick and ban |

## Open it

```bash
npx serve documentation
# or, with nothing installed:
node documentation/tools/serve.js 4178
```

Then open <http://localhost:4178/>. Opening `index.html` straight from disk also works —
the dataset is a plain script, never fetched.

## Theme

Light and dark are both hand-tuned in `assets/style.css`: dark mode is a token override
on `html[data-theme="dark"]`, not a filter. The header has a `dark` / `light` toggle that
stores the choice in `localStorage` under `bd-theme`; with no stored choice the pages follow
`prefers-color-scheme`. A tiny inline script in each `<head>` applies the attribute before
the stylesheet loads, so there is no flash of the wrong theme.

## Regenerating the packet data

```bash
node documentation/tools/build-data.js
```

Reads `src/engine/bedrockx-lib/protocol/protocol.json` and writes
`assets/protocol-data.js`. Re-run after replacing the schema.

The generator adds two things the schema does not contain:

* **array paths** — every counted array with its length prefix and element type;
* **directions** — a curated `C → S` / `S → C` table for well-known packets. Unknown
  packets render as `?`; the compiled schema drops upstream's `!bound`.

## Layout

```
documentation/
├── index.html            overview
├── packets.html          packet browser shell (filled by assets/app.js)
├── messages.html         chat, /me, message loops
├── movement.html         player_auth_input and the tick loop
├── auth.html             authentication and devices
├── nethernet.html        transport documentation
├── engine.html           client internals
├── rewrite.html          design notes
├── exploits.html         abuse classes and the checks that stop them
├── automod.html          the operator automod, end to end
├── assets/
│   ├── style.css         theme
│   ├── app.js            browser, type explorer, copy buttons
│   └── protocol-data.js  GENERATED — do not edit
└── tools/
    ├── build-data.js     schema → protocol-data.js
    └── serve.js          zero-dependency static server
```

## Conventions

* `id 11 · 0xb` — value of the `mcpe_packet` mapper, written as a `varint` before the body.
* `C → S` / `S → C` / `both` / `?` — direction (curated; `?` = not in the schema).
* `array` badge — counted array; the table above the fields lists its length prefix.
* `switch (field)` — body depends on another field; each `case` is a row group.
* `mapper<lu16>` — numeric ↔ name table; both accepted when writing.
* `nbt` / `lnbt` — network NBT (varint) vs little-endian NBT; empty compound = 1 byte.

Packets that contain arrays also get a **Sending it in game** recipe: build the payload
once with `Array.from({ length: COUNT }, …)`, then a `setInterval(…, 0)` send loop. Container
elements are expanded to their real fields, and arrays that only exist inside a switch case
say which case to set.

Skeletons on each packet page are starting points: fill every field the server validates,
and remember an omitted field serialises as `0` / empty rather than being rejected.

## Cross-checks

* <https://mojang.github.io/bedrock-protocol-docs/> — official, per-version
* <https://github.com/CloudburstMC/protocol-docs/tree/master/packets> — one Markdown file per packet
* <https://github.com/Sandertv/gophertunnel/tree/master/minecraft/protocol/packet> — Go reference
* <https://github.com/PrismarineJS/minecraft-data/blob/master/data/bedrock/latest/proto.yml> — has `!bound`
