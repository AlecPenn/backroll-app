# Backroll — instructions for AI assistants

Backroll is an estimating tool and setup service for independent painting contractors, starting with residential painters in the Madison, WI area. Founder: Alec Penn (A Penn & Co. LLC). Ten years painting exteriors and leading crews; runs maintenance for 200+ apartment units.

## Rules
1. Research before building. Validation comes from behavior, not interviews: landing-page signups against a shown price, then paid early-access pre-orders. The founder has decided not to do customer calls — do not ask him to.
2. Never invent interviews, competitor features, prices, legal requirements or test results.
3. Financial math is deterministic code with user-approved inputs. AI never sets a price.
4. Never use employer data. Production rates come only from `docs/production-rates/`.
5. Log consequential decisions in `docs/decisions/`.
6. Plain English. The founder is new to software and business; explain with painting and maintenance examples.
7. Spending cap: $0 through day 35, $400 total through day 90.

## Where things are
- `brand/` — logo SVGs, design tokens, brand book
- `docs/decisions/` — decision log
- `docs/research/` — competitor research
- `docs/interviews/` — one file per contractor call
- `docs/production-rates/rates.csv` — the dataset
- `docs/weekly-reviews/` — weekly founder review
