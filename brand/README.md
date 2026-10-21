# Backroll

Estimates you can trust, built by someone who has held the roller.

Backrolling is the pass that works sprayed paint into the surface — the step a shortcut skips and the one that makes the job last. The brand carries that idea: do it properly, show your work, no guessing at a number in a driveway.

## Voice

Plain, direct, jobsite-literate. Write the way a good foreman talks to a new hire: short sentences, real words, no hype.

- Say **"You haven't entered the ceiling height."** not "Oops! Something's missing 😅".
- Say **"This bid is under cost by $180."** not "Your margin could use some love!"
- Use trade words the customer already owns — coats, prep, cut-in, sq ft, production rate. Don't explain them unless asked.
- Never promise profit or guarantee a price. Backroll shows the math; the contractor decides.
- Numbers are the product. Always show the unit (hrs, sq ft, gal, $) and where the number came from.

## Color

One brand color and a quiet neutral set. The interface is mostly surface and ink; color is spent on meaning.

- `tape` is the only brand hue — painter's-tape blue. Primary actions, links, focus rings, the mark. If two things on a screen are `tape`, one of them probably shouldn't be.
- `surface-100` / `surface-200` / `surface-300` stack from page to card to pressed. No shadows; separation is a one-step surface change or a `line` hairline.
- `ink` for text and numbers, `ink-muted` for labels and units.
- `profit`, `caution` and `loss` mean money states only. Always pair them with a sign (+ / −) or a word — a contractor reading a phone in sunlight shouldn't have to tell green from red.

## Type

- **Inter Display** at 600 for titles and the wordmark, tracked −2%.
- **Inter** for everything else — `body` 16px minimum so it reads on a phone at arm's length.
- **JetBrains Mono** for figures: line items, rates, totals. Tabular numbers line up in a column, which is what an estimate is.

## Shape and space

- Spacing runs on a 4px base: `space-1` 4 through `space-8` 32. Phone gutters are `space-4`.
- Corners are soft but not round: `radius-md` 10px on buttons, inputs and cards; `radius-lg` 14px on sheets and the mark tile.
- Touch targets are at least 44px tall. Contractors use this with paint on their hands.

## Logo

The mark is two strokes on a tape-blue tile: a forward pass, and a second pass offset back over it at 60% — the backroll. It is geometry, not a picture of a roller.

| Asset | Use |
| --- | --- |
| `backroll-lockup.svg` | Default. Mark + wordmark, on light surfaces. |
| `backroll-wordmark.svg` | Where the mark is already present (app header next to the icon). |
| `backroll-wordmark-reversed.svg` | Wordmark on dark surfaces. |
| `backroll-mark.svg` | App icon, favicon, avatars. Holds at 16px. |
| `backroll-mark-mono.svg` | One-color contexts: stamps, invoices, fax-grade printing. |

The wordmark is lowercase **backroll**, set in Inter Display SemiBold and converted to outlines, so it renders the same everywhere without the font installed. In running text the name is written **Backroll**.

Clear space around the lockup: the height of one stroke in the mark (≈ 12/64 of the tile) on every side. Don't recolor the tile, rotate the mark, add effects, or set the wordmark in another typeface.

## Licensing

Everything here was made for Backroll and is owned by A Penn & Co. LLC. Inter and JetBrains Mono are both under the SIL Open Font License — free for commercial use, no fee, no attribution required in the product.
