// Median hourly wage for "Painters, Construction and Maintenance" (SOC 47-2141).
// Source: U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics (OEWS), May 2025.
// Pulled from the BLS public API on 2026-10-21. Series OEUS/OEUM/OEUN …47214108 (hourly median).
export const WAGE_SOURCE = "BLS OEWS, May 2025 — median hourly wage, painters (SOC 47-2141)";
export const WAGES = {
  metro: {
    "Madison, WI": 27.16, "Milwaukee-Waukesha, WI": 24.34, "Green Bay, WI": 23.02, "Appleton, WI": 24.34,
    "Oshkosh-Neenah, WI": 24.54, "Eau Claire, WI": 22.71, "La Crosse-Onalaska, WI-MN": 23.79, "Wausau-Weston, WI": 22.90,
    "Janesville-Beloit, WI": 25.04, "Racine, WI": 24.50, "Sheboygan, WI": 23.78, "Fond du Lac, WI": 23.76,
  },
  state: {
    Alabama: 21.12, Alaska: 29.32, Arizona: 23.20, Arkansas: 19.28, California: 28.38, Colorado: 25.47, Connecticut: 28.12,
    Delaware: 28.14, "District of Columbia": 28.61, Florida: 22.85, Georgia: 23.24, Hawaii: 32.80, Idaho: 21.58, Illinois: 29.45,
    Indiana: 24.16, Iowa: 23.90, Kansas: 21.88, Kentucky: 23.13, Louisiana: 22.31, Maine: 28.50, Maryland: 23.62,
    Massachusetts: 27.65, Michigan: 24.35, Minnesota: 27.54, Mississippi: 21.54, Missouri: 27.65, Montana: 28.03,
    Nebraska: 22.73, Nevada: 27.11, "New Hampshire": 23.88, "New Jersey": 28.49, "New Mexico": 22.23, "New York": 28.64,
    "North Carolina": 21.21, "North Dakota": 26.38, Ohio: 23.77, Oklahoma: 21.59, Oregon: 23.51, Pennsylvania: 25.06,
    "Rhode Island": 20.00, "South Carolina": 19.64, "South Dakota": 23.15, Tennessee: 20.78, Texas: 21.86, Utah: 22.14,
    Vermont: 25.54, Virginia: 22.82, Washington: 28.68, "West Virginia": 21.26, Wisconsin: 24.08, Wyoming: 22.70,
  },
  national: 23.75,
};
export function wageFor(area) {
  if (!area) return null;
  if (WAGES.metro[area] != null) return { area, wage: WAGES.metro[area], level: "metro" };
  if (WAGES.state[area] != null) return { area, wage: WAGES.state[area], level: "state" };
  if (area === "United States") return { area, wage: WAGES.national, level: "national" };
  return null;
}
