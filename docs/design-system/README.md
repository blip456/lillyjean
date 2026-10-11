# Design system

Lillyjean's visual direction is **Media layout + iOS Glass palette**, light by default (decisions T16
and D8 in [`../decisions.md`](../decisions.md)). Start with [`DESIGN.md`](../../DESIGN.md) at the repo root:
it is the rulebook for UI work.

| What                        | Where                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Rules, patterns, components | [`DESIGN.md`](../../DESIGN.md)                                                                                             |
| Design tokens (source)      | [`design/tokens/`](../../design/tokens/) (W3C DTCG 2025.10; start at `lillyjean.resolver.json`)                            |
| Generated CSS               | [`src/app/tokens.css`](../../src/app/tokens.css), built with `pnpm tokens:build`                                           |
| Generator and tests         | [`scripts/tokens/`](../../scripts/tokens/)                                                                                 |
| Visual prototype            | [`prototype/index.html`](prototype/index.html) (design 1 "Lillyjean" uses the real tokens) · [README](prototype/README.md) |
| Research and options        | [`research.md`](research.md) (DESIGN.md and tokens, UI kits, iOS glass, PWA specifics)                                     |
| Wireframes (screen IDs)     | [`../wireframes/v2/`](../wireframes/v2/README.md)                                                                          |
