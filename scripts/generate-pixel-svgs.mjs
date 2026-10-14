// scripts/generate-pixel-svgs.mjs
//
// Generates every SVG used by the profile README as plain geometry — no
// <text>, no web fonts. Text is drawn pixel-by-pixel from a hand-made 5x7
// bitmap font so the SVGs render identically everywhere, including when
// GitHub loads them through a plain <img>/<source> tag (which never
// executes JS and never fetches external fonts).
//
// Run with: node scripts/generate-pixel-svgs.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "..", "assets");
mkdirSync(ASSETS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Palette — vivid blue/purple/cyan/pink neon on a near-black (or near-white)
// base. All four accents clear 4.5:1+ against the dark bg, so they can be
// used directly as pixel-text color on dark. On the light bg they drop
// below AA as text, so light-variant text always uses DARK_INK and the
// accents stay fills-only there (chips/badges/buttons).
// ---------------------------------------------------------------------------
const PALETTE = {
  bgDark: "#0B0B18",
  bgLight: "#F3F1FF",
  blue: "#3D8BFF",
  purple: "#9D4EFF",
  cyan: "#2EE6D6",
  pink: "#FF4FD8",
  borderDark: "#3A3570",
  borderLight: "#C9C3EC",
};
const ACCENTS = [PALETTE.blue, PALETTE.purple, PALETTE.cyan, PALETTE.pink];
const LIGHT_INK = "#F1EEFB";
const DARK_INK = "#120F26";

function ink(variant) {
  return variant === "dark" ? LIGHT_INK : DARK_INK;
}
function bg(variant) {
  return variant === "dark" ? PALETTE.bgDark : PALETTE.bgLight;
}
function borderColor(variant) {
  return variant === "dark" ? PALETTE.borderDark : PALETTE.borderLight;
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits ('1' = pixel on).
// ---------------------------------------------------------------------------
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "00110", "00001", "00001", "11110"],
  4: ["10010", "10010", "10010", "11111", "00010", "00010", "00010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "'": ["01100", "01100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00100", "00100", "01000", "10000", "00000"],
  "&": ["01100", "10010", "10010", "01100", "10101", "10010", "01101"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
};

function measureText(text, scale, spacing = 1) {
  const n = text.length;
  return n * 5 * scale + Math.max(0, n - 1) * spacing * scale;
}

// colorOrFn: a single fill color, or (index, char) => color for per-glyph
// coloring (used for the neon "rainbow" cycling titles).
function pixelText(text, x, y, scale, colorOrFn, { spacing = 1 } = {}) {
  const rects = [];
  let cursorX = x;
  let i = 0;
  for (const ch of text.toUpperCase()) {
    const color = typeof colorOrFn === "function" ? colorOrFn(i, ch) : colorOrFn;
    const glyph = FONT[ch] ?? FONT[" "];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if (bits[col] === "1") {
          rects.push(
            `<rect x="${cursorX + col * scale}" y="${y + row * scale}" width="${scale}" height="${scale}" fill="${color}"/>`
          );
        }
      }
    }
    cursorX += (5 + spacing) * scale;
    i++;
  }
  return rects.join("");
}

function pixelTextCentered(text, centerXpos, y, scale, colorOrFn, opts = {}) {
  const w = measureText(text, scale, opts.spacing ?? 1);
  return pixelText(text, centerXpos - w / 2, y, scale, colorOrFn, opts);
}

// Accents only clear AA as *text* color against the dark bg (~4.7:1+). On
// the light bg they drop to ~2.5:1, so any text drawn straight on the page
// background must fall back to plain ink there — accents stay fills-only.
function accentOrInk(variant, accent) {
  return variant === "dark" ? accent : ink(variant);
}
function cycleAccentOrInk(variant, colors) {
  return (i) => accentOrInk(variant, colors[i % colors.length]);
}

function glow(markup) {
  return `<g filter="url(#${GLOW_FILTER_ID})">${markup}</g>`;
}

// ---------------------------------------------------------------------------
// Shared decoration: defs (glow filter), scanlines, outer frame
// ---------------------------------------------------------------------------
const GLOW_FILTER_ID = "neonGlow";
const DEFS_BLOCK = `<defs><filter id="${GLOW_FILTER_ID}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

function scanlines(width, height, variant) {
  const lines = [];
  for (let y = 0; y < height; y += 4) {
    lines.push(`<rect x="0" y="${y}" width="${width}" height="1" fill="${borderColor(variant)}"/>`);
  }
  return `<g class="scanlines" opacity="${variant === "dark" ? 0.06 : 0.08}">${lines.join("")}</g>`;
}

function frame(width, height, color, strokeWidth = 4) {
  const inset = strokeWidth / 2;
  return `<rect x="${inset}" y="${inset}" width="${width - strokeWidth}" height="${height - strokeWidth}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
}

const STYLE_BLOCK = `
  .blink { animation: blink 1.1s steps(2, start) infinite; }
  @keyframes blink { to { visibility: hidden; } }
  .scanlines { animation: flicker 6s linear infinite; }
  @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) {
    .blink { animation: none; }
    .scanlines { animation: none; }
  }
`;

function svgDocument({ width, height, variant, title, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
<title>${escapeXml(title)}</title>
<style>${STYLE_BLOCK}</style>
${DEFS_BLOCK}
<rect x="0" y="0" width="${width}" height="${height}" fill="${bg(variant)}"/>
${body}
${scanlines(width, height, variant)}
${frame(width, height, borderColor(variant))}
</svg>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function write(name, variant, svg) {
  const path = join(ASSETS_DIR, `${name}-${variant}.svg`);
  writeFileSync(path, svg, "utf-8");
  console.log(`wrote ${path}`);
}

// ---------------------------------------------------------------------------
// HERO — title screen
// ---------------------------------------------------------------------------
function buildHero(variant) {
  const width = 840;
  const height = 340;
  const textColor = ink(variant);
  const cx = width / 2;

  const body = [
    pixelTextCentered("DANNY OSPINO", cx, 90, 6, textColor),
    glow(pixelTextCentered("FRONTEND AI ARCHITECT", cx, 160, 3, cycleAccentOrInk(variant, ACCENTS))),
    `<rect x="${cx - 160}" y="200" width="320" height="2" fill="${PALETTE.purple}"/>`,
    glow(`<g class="blink">${pixelTextCentered("PRESS START", cx, 245, 4, accentOrInk(variant, PALETTE.cyan))}</g>`),
  ].join("\n");

  return svgDocument({
    width,
    height,
    variant,
    title: "DANNY OSPINO — FRONTEND AI ARCHITECT — PRESS START",
    body,
  });
}

// ---------------------------------------------------------------------------
// ACHIEVEMENTS — unlocked milestones strip
// ---------------------------------------------------------------------------
const ACHIEVEMENTS = [
  { line1: "PLAYER", line2: "JOINED" },
  { line1: "LEVEL UP", line2: "FINTECH" },
  { line1: "SENIOR", line2: "UNLOCKED" },
  { line1: "AI ARCHITECT", line2: "UNLOCKED" },
];

function buildAchievements(variant) {
  const width = 840;
  const height = 170;
  const textColor = ink(variant);
  const nodeY = 50;
  const colWidth = width / ACHIEVEMENTS.length;

  const line = `<rect x="${colWidth / 2}" y="${nodeY}" width="${width - colWidth}" height="2" fill="${borderColor(variant)}"/>`;

  const nodes = ACHIEVEMENTS.map((item, i) => {
    const cx = colWidth * i + colWidth / 2;
    const accent = ACCENTS[i % ACCENTS.length];
    const badge = glow(`<rect x="${cx - 10}" y="${nodeY - 10}" width="20" height="20" fill="${accent}"/>`);
    const l1 = pixelTextCentered(item.line1, cx, 90, 2, textColor);
    const l2 = pixelTextCentered(item.line2, cx, 112, 2, accentOrInk(variant, accent));
    return badge + l1 + l2;
  }).join("\n");

  const body = [line, nodes].join("\n");

  return svgDocument({
    width,
    height,
    variant,
    title: "Achievements unlocked: player joined, level up fintech, senior unlocked, AI architect unlocked",
    body,
  });
}

// ---------------------------------------------------------------------------
// INVENTORY — small category icons (transparent bg, no dark/light variant
// needed since they carry no background rect — only accent-colored pixels).
// ---------------------------------------------------------------------------
function drawBitmap(mask, x, y, scale, color) {
  const rects = [];
  for (let row = 0; row < mask.length; row++) {
    const bits = mask[row];
    for (let col = 0; col < bits.length; col++) {
      if (bits[col] === "1") {
        rects.push(`<rect x="${x + col * scale}" y="${y + row * scale}" width="${scale}" height="${scale}" fill="${color}"/>`);
      }
    }
  }
  return rects.join("");
}

const CATEGORY_ICONS = {
  "icon-frontend": {
    color: PALETTE.blue,
    mask: ["11111111", "10000001", "10000001", "11111111", "10000001", "10000001", "10000001", "11111111"],
    title: "Frontend",
  },
  "icon-state": {
    color: PALETTE.purple,
    mask: ["00011000", "00111100", "01100110", "11000011", "11000011", "01100110", "00111100", "00011000"],
    title: "Estado y Reactividad",
  },
  "icon-ai": {
    color: PALETTE.cyan,
    mask: ["00011000", "00011000", "00011000", "11111111", "11111111", "00011000", "00011000", "00011000"],
    title: "IA y Tooling",
  },
  "icon-testing": {
    color: PALETTE.pink,
    mask: ["00000000", "00000001", "00000011", "10000110", "11001100", "01111000", "00110000", "00000000"],
    title: "Testing y Calidad",
  },
};

function buildCategoryIcon(def) {
  const size = 16;
  const scale = 2;
  const body = drawBitmap(def.mask, 0, 0, scale, def.color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(def.title)}">
<title>${escapeXml(def.title)}</title>
${body}
</svg>`;
}

for (const [name, def] of Object.entries(CATEGORY_ICONS)) {
  writeFileSync(join(ASSETS_DIR, `${name}.svg`), buildCategoryIcon(def), "utf-8");
  console.log(`wrote ${join(ASSETS_DIR, `${name}.svg`)}`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
for (const variant of ["dark", "light"]) {
  write("hero", variant, buildHero(variant));
  write("achievements", variant, buildAchievements(variant));
}

console.log("Done.");
