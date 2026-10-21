// Run: node --test site/app/
// Every expected number below was worked out by hand first, then checked against the engine.
import test from "node:test";
import assert from "node:assert/strict";
import { priceSide, priceJob, sideArea, sideFlags, variance, loadedFromWage, DEFAULT_RATES } from "./engine.js";
import { wageFor } from "./wages.js";

const simple = { name: "Front", lengthFt: 40, stories: 1, siding: "lap", method: "sprayBackroll", coats: 2, condition: 1, access: "ground", wash: true };

test("wall area = length × stories × 10 ft + gable − deductions", () => {
  assert.equal(sideArea(simple), 400);
  assert.equal(sideArea({ ...simple, stories: 2, gableSqft: 120, deductSqft: 20 }), 900);
});

test("simple sound side: wash + two sprayed coats", () => {
  const r = priceSide(simple);
  // wash 400/1500 = 0.27, body 400/200 + 400/300 = 3.33
  assert.deepEqual(r.lines.map((l) => [l.label, l.hours]), [["Power wash", 0.27], ["Body — 2 coats, spray + backroll", 3.33]]);
  assert.equal(r.hours, 3.6);
  // 400 sq ft × 2 coats × 1.3 spray loss ÷ 300 = 3.47 gal
  assert.equal(r.gallons, 3.47);
});

test("rough two-story side on a ladder with spot prime and windows", () => {
  const side = { ...simple, stories: 2, condition: 3, access: "ladder", prime: "spot", windows: 4 };
  const r = priceSide(side);
  const byLabel = Object.fromEntries(r.lines.map((l) => [l.label, l.hours]));
  // height/access = 1.2 × 1.1 = 1.32; area = 800; scraped = 280
  assert.equal(byLabel["Power wash"], 0.53);         // 800/1500
  assert.equal(byLabel["Scrape + sand"], 6.16);      // 280/60 × 1.32
  assert.equal(byLabel["Spot prime"], 2.46);         // 280/150 × 1.32
  assert.equal(byLabel["Body — 2 coats, spray + backroll"], 8.8); // (4 + 2.667) × 1.32
  assert.equal(byLabel["Windows"], 2.4);             // 4 × 30 min × 1.2
  assert.equal(byLabel["Set-up — extension ladder"], 0.5);
  assert.equal(r.hours, 20.85);
});

test("job price uses margin on price, not markup on cost", () => {
  const j = priceJob({ crewSize: 2, sides: [simple] });
  // labor 3.6×35=126; materials 4 gal×55 + 3.6×2.5 = 229; overhead 3.6×12 = 43.2
  // risk 10% × (126+229+43.2) = 39.82; cost 438.02; price = 438.02 / 0.70 = 625.74
  assert.equal(j.cost.labor, 126);
  assert.equal(j.cost.materials, 229);
  assert.equal(j.cost.overhead, 43.2);
  assert.equal(j.cost.risk, 39.82);
  assert.equal(j.cost.total, 438.02);
  assert.equal(j.price, 625.74);
  assert.equal(j.marginPct, 30);
  // With 30% MARKUP the price would be 569.43 — the classic underbid.
  assert.ok(j.price > j.cost.total * 1.3);
});

test("lift adds rental days", () => {
  const j = priceJob({ crewSize: 2, sides: [{ ...simple, access: "lift" }] });
  assert.equal(j.liftDays, 1);
  assert.equal(j.cost.equipment, DEFAULT_RATES.access.lift.rentalPerDay);
});

test("missing inputs are flagged, never guessed", () => {
  assert.deepEqual(sideFlags({ name: "North" }), ["Wall length missing", "Number of stories missing", "Condition not picked", "Siding type not picked", "Access not picked"]);
  const j = priceJob({ sides: [simple] });
  assert.equal(j.ready, false);
  assert.match(j.flags[0], /Only 1 side/);
  assert.equal(priceJob({ sides: [] }).flags[0], "No sides added yet");
});

test("four complete sides with no problems is ready", () => {
  const sides = ["Front", "Back", "Left", "Right"].map((name) => ({ ...simple, name }));
  const j = priceJob({ sides });
  assert.equal(j.ready, true);
  assert.equal(j.hours, 14.4);
});

test("actual vs estimate", () => {
  assert.deepEqual(variance(20, 25), { diff: 5, pct: 25 });
  assert.equal(variance(0, 5), null);
});

test("local wage → loaded labor cost", () => {
  assert.deepEqual(wageFor("Madison, WI"), { area: "Madison, WI", wage: 27.16, level: "metro" });
  assert.equal(wageFor("Wisconsin").wage, 24.08);
  assert.equal(wageFor("Nowhere"), null);
  // 27.16 × 1.25 = 33.95
  assert.equal(loadedFromWage(27.16, 25), 33.95);
});
