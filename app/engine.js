// Backroll pricing engine.
// Plain, deterministic math. No AI, no randomness. Every number can be traced.
// Works in the browser and in Node (for tests).

/**
 * Starter rates. Each one carries a `source` so the app can show the painter
 * where the number came from. Anything marked "placeholder" is a guess that
 * must be replaced with real numbers before being relied on.
 */
export const DEFAULT_RATES = {
  labor: {
    loadedCostPerHour: { value: 35, unit: "$/hr", label: "Labor cost per crew hour (wage + payroll taxes + comp)", source: "placeholder" },
    burdenPct: { value: 25, unit: "%", label: "Payroll taxes, workers' comp and benefits on top of wage", source: "placeholder" },
  },
  business: {
    overheadPerHour: { value: 12, unit: "$/hr", label: "Overhead per crew hour (truck, insurance, phone, gear)", source: "placeholder" },
    riskPct: { value: 10, unit: "%", label: "Risk allowance on cost", source: "placeholder" },
    targetMarginPct: { value: 30, unit: "%", label: "Target gross margin", source: "placeholder" },
    storyHeightFt: { value: 10, unit: "ft", label: "Wall height per story", source: "Paint Pals published" },
  },
  // Body painting rates: sq ft per crew hour.
  body: {
    sprayBackroll: { first: 200, more: 300, unit: "sq ft/hr", label: "Spray + backroll", sourceFirst: "Paint Pals published (spray)", source: "placeholder" },
    brushRoll:     { first: 110, more: 160, unit: "sq ft/hr", label: "Brush + roll", source: "placeholder" },
  },
  // How much slower each siding type paints than smooth lap siding (1.00 = same speed).
  siding: {
    lap:         { factor: 1.00, label: "Lap siding (wood / fiber cement)", source: "placeholder" },
    shake:       { factor: 1.35, label: "Cedar shake", source: "placeholder" },
    boardBatten: { factor: 1.10, label: "Board & batten", source: "placeholder" },
    stucco:      { factor: 1.25, label: "Stucco", source: "placeholder" },
    brick:       { factor: 1.30, label: "Brick / masonry", source: "placeholder" },
  },
  // Condition 1-4. Share of the wall that needs scraping, and whether it needs prime.
  condition: {
    1: { scrapeShare: 0.00, label: "Sound — wash and paint", source: "placeholder" },
    2: { scrapeShare: 0.10, label: "Light — some failing paint", source: "placeholder" },
    3: { scrapeShare: 0.35, label: "Rough — peeling in areas", source: "placeholder" },
    4: { scrapeShare: 0.75, label: "Failed — peeling everywhere", source: "placeholder" },
  },
  prep: {
    washSqftPerHr:   { value: 1500, unit: "sq ft/hr", label: "Power wash", source: "Paint Pals published" },
    scrapeSqftPerHr: { value: 60, unit: "sq ft/hr", label: "Scrape + sand (on the scraped area only)", source: "placeholder" },
    primeSqftPerHr:  { value: 150, unit: "sq ft/hr", label: "Prime (brush/roll)", source: "placeholder" },
    caulkLnftPerHr:  { value: 40, unit: "lin ft/hr", label: "Caulk", source: "placeholder" },
  },
  // Multiplier on body + prep hours for working height and how you get up there.
  height: {
    1: { factor: 1.00, label: "1 story", source: "placeholder" },
    2: { factor: 1.20, label: "2 stories", source: "placeholder" },
    3: { factor: 1.45, label: "3 stories", source: "placeholder" },
  },
  access: {
    ground:    { factor: 1.00, setupHrs: 0,   label: "Ground / step ladder", source: "placeholder" },
    ladder:    { factor: 1.10, setupHrs: 0.5, label: "Extension ladder", source: "placeholder" },
    walkBoard: { factor: 1.20, setupHrs: 1.5, label: "Walk board / roof work", source: "placeholder" },
    lift:      { factor: 1.05, setupHrs: 1.0, rentalPerDay: 350, label: "Lift", source: "placeholder" },
  },
  // Trim items: minutes per item or lin ft per hour.
  trim: {
    window:     { first: 20, more: 10, unit: "min each", label: "Windows", source: "Paint Pals published" },
    door:       { first: 30, more: 15, unit: "min each", label: "Doors", source: "Paint Pals published" },
    garageDoor: { first: 60, more: 30, unit: "min each", label: "Garage doors", source: "placeholder" },
    fascia:     { first: 14.5, more: 20, unit: "lin ft/hr", label: "Fascia & soffit", source: "Paint Pals published" },
  },
  materials: {
    paintPerGal:    { value: 55, unit: "$/gal", label: "Body paint", source: "placeholder" },
    primerPerGal:   { value: 40, unit: "$/gal", label: "Primer", source: "placeholder" },
    coverageSqft:   { value: 300, unit: "sq ft/gal", label: "Coverage per gallon (body)", source: "placeholder" },
    sprayLossPct:   { value: 30, unit: "%", label: "Extra paint lost to spraying", source: "placeholder" },
    sundriesPerHr:  { value: 2.5, unit: "$/crew hr", label: "Sundries (tape, plastic, caulk, rags)", source: "placeholder" },
  },
};

const round2 = (n) => Math.round(n * 100) / 100;
const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

/** Wall area of one side, in sq ft. */
export function sideArea(side, rates = DEFAULT_RATES) {
  const h = num(side.stories) * rates.business.storyHeightFt.value;
  return num(side.lengthFt) * h + num(side.gableSqft) - num(side.deductSqft);
}

/** Problems that stop a side from being priced reliably. */
export function sideFlags(side) {
  const flags = [];
  if (!num(side.lengthFt)) flags.push("Wall length missing");
  if (!num(side.stories)) flags.push("Number of stories missing");
  if (!side.condition) flags.push("Condition not picked");
  if (!side.siding) flags.push("Siding type not picked");
  if (!side.access) flags.push("Access not picked");
  if (num(side.lengthFt) > 200) flags.push("Wall over 200 ft — double-check the length");
  return flags;
}

/**
 * Hours for one side, broken down so the app can explain each number.
 * Returns { area, lines: [{label, hours, detail}], hours, gallons, primerGallons, liftDays }.
 */
export function priceSide(side, rates = DEFAULT_RATES) {
  const area = Math.max(0, sideArea(side, rates));
  const coats = Math.max(1, num(side.coats) || 2);
  const method = rates.body[side.method] || rates.body.sprayBackroll;
  const siding = rates.siding[side.siding] || rates.siding.lap;
  const cond = rates.condition[side.condition] || rates.condition[1];
  const height = rates.height[side.stories] || rates.height[1];
  const access = rates.access[side.access] || rates.access.ground;
  const heightAccess = height.factor * access.factor;

  const lines = [];
  const add = (label, hours, detail) => { if (hours > 0) lines.push({ label, hours: round2(hours), detail }); };

  // Prep
  if (side.wash !== false && area > 0) {
    add("Power wash", area / rates.prep.washSqftPerHr.value, `${Math.round(area)} sq ft ÷ ${rates.prep.washSqftPerHr.value} sq ft/hr`);
  }
  const scrapeArea = area * cond.scrapeShare;
  if (scrapeArea > 0) {
    const hrs = (scrapeArea / rates.prep.scrapeSqftPerHr.value) * heightAccess;
    add("Scrape + sand", hrs, `${Math.round(scrapeArea)} sq ft (${Math.round(cond.scrapeShare * 100)}% of wall, condition ${side.condition}) ÷ ${rates.prep.scrapeSqftPerHr.value} sq ft/hr × ${round2(heightAccess)} height/access`);
  }
  let primeArea = 0;
  if (side.prime === "full") primeArea = area;
  else if (side.prime === "spot") primeArea = scrapeArea;
  if (primeArea > 0) {
    const hrs = (primeArea / rates.prep.primeSqftPerHr.value) * heightAccess;
    add(side.prime === "full" ? "Full prime" : "Spot prime", hrs, `${Math.round(primeArea)} sq ft ÷ ${rates.prep.primeSqftPerHr.value} sq ft/hr × ${round2(heightAccess)} height/access`);
  }
  if (num(side.caulkLnft) > 0) {
    add("Caulk", (side.caulkLnft / rates.prep.caulkLnftPerHr.value) * heightAccess, `${side.caulkLnft} lin ft ÷ ${rates.prep.caulkLnftPerHr.value} lin ft/hr × ${round2(heightAccess)} height/access`);
  }

  // Body
  if (area > 0) {
    const firstHrs = area / method.first;
    const moreHrs = (coats - 1) * (area / method.more);
    const hrs = (firstHrs + moreHrs) * siding.factor * heightAccess;
    add(`Body — ${coats} coat${coats > 1 ? "s" : ""}, ${method.label.toLowerCase()}`, hrs,
      `${Math.round(area)} sq ft: 1st coat at ${method.first}, ${coats > 1 ? `${coats - 1} more at ${method.more} sq ft/hr` : "no 2nd coat"} × ${siding.factor} siding × ${round2(heightAccess)} height/access`);
  }

  // Trim
  const trimCoats = Math.max(1, num(side.trimCoats) || coats);
  const perItem = (rate, count) => count * (rate.first + (trimCoats - 1) * rate.more) / 60;
  if (num(side.windows)) add("Windows", perItem(rates.trim.window, side.windows) * height.factor, `${side.windows} × (${rates.trim.window.first} + ${trimCoats - 1}×${rates.trim.window.more} min) × ${height.factor} height`);
  if (num(side.doors)) add("Doors", perItem(rates.trim.door, side.doors), `${side.doors} × (${rates.trim.door.first} + ${trimCoats - 1}×${rates.trim.door.more} min)`);
  if (num(side.garageDoors)) add("Garage doors", perItem(rates.trim.garageDoor, side.garageDoors), `${side.garageDoors} × (${rates.trim.garageDoor.first} + ${trimCoats - 1}×${rates.trim.garageDoor.more} min)`);
  if (num(side.fasciaLnft)) {
    const f = rates.trim.fascia;
    const hrs = (side.fasciaLnft / f.first + (trimCoats - 1) * side.fasciaLnft / f.more) * heightAccess;
    add("Fascia & soffit", hrs, `${side.fasciaLnft} lin ft at ${f.first} then ${f.more} lin ft/hr × ${round2(heightAccess)} height/access`);
  }

  if (access.setupHrs) add(`Set-up — ${access.label.toLowerCase()}`, access.setupHrs, "Moving and setting equipment for this side");

  const hours = round2(lines.reduce((s, l) => s + l.hours, 0));

  // Materials
  const sprayLoss = side.method === "brushRoll" ? 0 : rates.materials.sprayLossPct.value / 100;
  const gallons = area > 0 ? (area * coats * siding.factor * (1 + sprayLoss)) / rates.materials.coverageSqft.value : 0;
  const primerGallons = primeArea > 0 ? primeArea / rates.materials.coverageSqft.value : 0;

  return { area: round2(area), lines, hours, gallons: round2(gallons), primerGallons: round2(primerGallons), usesLift: side.access === "lift" };
}

/**
 * Price the whole job.
 * price = total cost ÷ (1 − target margin). Margin is profit as a share of price, not markup on cost.
 */
export function priceJob(job, rates = DEFAULT_RATES) {
  const sides = (job.sides || []).map((s) => ({ side: s, result: priceSide(s, rates), flags: sideFlags(s) }));
  const hours = round2(sides.reduce((s, x) => s + x.result.hours, 0));
  const gallons = sides.reduce((s, x) => s + x.result.gallons, 0);
  const primerGallons = sides.reduce((s, x) => s + x.result.primerGallons, 0);
  const paintGal = Math.ceil(gallons);
  const primerGal = Math.ceil(primerGallons);

  const crewSize = Math.max(1, num(job.crewSize) || 2);
  const crewDays = hours / (crewSize * 8);
  const liftDays = sides.some((x) => x.result.usesLift) ? Math.max(1, Math.ceil(num(job.liftDays) || crewDays)) : 0;

  const labor = hours * rates.labor.loadedCostPerHour.value;
  const materials = paintGal * rates.materials.paintPerGal.value + primerGal * rates.materials.primerPerGal.value + hours * rates.materials.sundriesPerHr.value;
  const equipment = liftDays * rates.access.lift.rentalPerDay;
  const overhead = hours * rates.business.overheadPerHour.value;
  const direct = labor + materials + equipment;
  const risk = (direct + overhead) * (rates.business.riskPct.value / 100);
  const cost = direct + overhead + risk;
  const margin = rates.business.targetMarginPct.value / 100;
  if (margin >= 1) throw new Error("Target margin must be under 100%");
  const price = cost / (1 - margin);
  const profit = price - cost;

  const flags = [];
  sides.forEach((x) => x.flags.forEach((f) => flags.push(`${x.side.name || "Side"}: ${f}`)));
  if (!sides.length) flags.push("No sides added yet");
  if ((job.sides || []).length > 0 && (job.sides || []).length < 4 && !job.partialOk) flags.push(`Only ${(job.sides || []).length} side${(job.sides || []).length === 1 ? "" : "s"} entered — most houses have 4`);

  return {
    sides,
    hours,
    crewDays: round2(crewDays),
    paintGal,
    primerGal,
    liftDays,
    cost: { labor: round2(labor), materials: round2(materials), equipment: round2(equipment), overhead: round2(overhead), risk: round2(risk), total: round2(cost) },
    price: round2(price),
    profit: round2(profit),
    marginPct: price > 0 ? round2((profit / price) * 100) : 0,
    flags,
    ready: flags.length === 0,
  };
}

/** Wage plus payroll burden = what an hour of labor really costs you. */
export function loadedFromWage(wage, burdenPct) {
  return round2(num(wage) * (1 + num(burdenPct) / 100));
}

/** Compare logged actual hours against the estimate. */
export function variance(estimatedHours, actualHours) {
  if (!num(estimatedHours) || !num(actualHours)) return null;
  const diff = actualHours - estimatedHours;
  return { diff: round2(diff), pct: round2((diff / estimatedHours) * 100) };
}

/** Deep copy of the default rates, for a new user's editable profile. */
export function freshRates() {
  return JSON.parse(JSON.stringify(DEFAULT_RATES));
}
