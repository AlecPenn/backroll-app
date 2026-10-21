# 0006 — Local medians: wages now, production rates later

Date: 2026-10-21
Idea (Alec): pick a location and see the local median for each number.
What exists publicly: median painter wage by state and metro — BLS OEWS, May 2025, SOC 47-2141. Loaded into `site/app/wages.js` (51 states + DC, 12 Wisconsin metros, national).
What doesn't: local production rates. Nobody publishes them.
Decision: ship local wage medians now. Build production-rate medians from Backroll users' logged jobs once a shared database exists; show a median only when 5+ painters in an area contribute.
Approved by: Alec Penn
