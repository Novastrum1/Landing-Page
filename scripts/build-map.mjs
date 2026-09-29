// Generates public/assets/world.json (projected country outlines) and copies the
// matching flags into public/assets/flags/. Run with `npm run build:map`; the output is committed so
// the page itself needs no mapping libraries.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"));
const flagDir = require.resolve("flag-icons/package.json").replace("package.json", "flags/4x3/");

// Natural Earth shapes without an ISO numeric code.
const BY_NAME = { Kosovo: "xk", "N. Cyprus": "cy", Somaliland: "so" };

const WIDTH = 1216;
const HEIGHT = 676;

const world = feature(topo, topo.objects.countries);
world.features = world.features.filter((f) => f.properties.name !== "Antarctica");

const projection = geoMercator().fitSize([WIDTH, HEIGHT], world);
const path = geoPath(projection);
const round = (d) => d.replace(/\d+\.\d+/g, (n) => (+n).toFixed(1));

const out = [];
for (const f of world.features) {
  const code = (BY_NAME[f.properties.name] || countries.numericToAlpha2(f.id) || "").toLowerCase();
  const d = path(f);
  if (!d) continue;
  out.push({ code, name: f.properties.name, d: round(d) });
}

mkdirSync("public/assets", { recursive: true });
writeFileSync("public/assets/world.json", JSON.stringify({ width: WIDTH, height: HEIGHT, countries: out }));

rmSync("public/assets/flags", { recursive: true, force: true });
mkdirSync("public/assets/flags", { recursive: true });
const missing = [];
for (const code of new Set(out.map((c) => c.code))) {
  const src = flagDir + code + ".svg";
  if (code && existsSync(src)) copyFileSync(src, `public/assets/flags/${code}.svg`);
  else missing.push(code || "(none)");
}

console.log(`${out.length} countries written, flags missing for: ${missing.join(", ") || "none"}`);
