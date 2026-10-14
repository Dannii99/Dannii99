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
  .bob { animation: bob 3s ease-in-out infinite; }
  @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  .sway { animation: sway 4s ease-in-out infinite; }
  @keyframes sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
  .twinkle { animation: twinkle 2.4s ease-in-out infinite; }
  @keyframes twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
  .steam { animation: rise 2.8s ease-out infinite; }
  @keyframes rise { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 0.8; } 100% { transform: translateY(-18px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .blink, .scanlines, .bob, .sway, .twinkle, .steam { animation: none; }
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
// BONUS STAGE — just-for-fun animated pixel office scene (no information,
// purely decorative, same spirit as the contribution snake).
// ---------------------------------------------------------------------------
function buildOffice(variant) {
  const width = 840;
  const height = 280;
  const silhouette = variant === "dark" ? "#1C1B33" : "#D9D4F0";
  const panel = variant === "dark" ? "#14132A" : "#E7E3FA";
  const starColor = ink(variant);
  const codeColors = [PALETTE.blue, PALETTE.purple, PALETTE.cyan];

  const stars = [
    [665, 55],
    [690, 46],
    [712, 70],
    [736, 90],
  ]
    .map(
      ([sx, sy], i) =>
        `<rect class="twinkle" style="animation-delay:${i * 0.4}s" x="${sx}" y="${sy}" width="3" height="3" fill="${starColor}"/>`
    )
    .join("");

  const window_ = [
    `<rect x="640" y="30" width="140" height="90" fill="none" stroke="${borderColor(variant)}" stroke-width="3"/>`,
    `<rect x="648" y="38" width="124" height="74" fill="${panel}"/>`,
    glow(`<rect x="752" y="50" width="16" height="16" fill="${PALETTE.pink}"/>`),
    stars,
  ].join("\n");

  const desk = [
    `<rect x="60" y="210" width="720" height="16" fill="${silhouette}"/>`,
    `<rect x="90" y="226" width="14" height="40" fill="${silhouette}"/>`,
    `<rect x="736" y="226" width="14" height="40" fill="${silhouette}"/>`,
  ].join("\n");

  const chair = `<rect x="235" y="150" width="50" height="60" fill="${silhouette}"/>`;

  const person = `<g class="bob">
    <rect x="240" y="120" width="26" height="26" fill="${silhouette}"/>
    <rect x="232" y="146" width="42" height="50" fill="${silhouette}"/>
    <rect x="220" y="160" width="14" height="10" fill="${silhouette}"/>
    <rect x="276" y="160" width="14" height="10" fill="${silhouette}"/>
  </g>`;

  const monitorX = 330;
  const monitorY = 120;
  const monitorW = 150;
  const monitorH = 90;
  const codeLines = [0, 1, 2]
    .map((i) => {
      const y = monitorY + 18 + i * 16;
      return `<rect class="twinkle" style="animation-delay:${i * 0.6}s" x="${monitorX + 14}" y="${y}" width="${40 + i * 20}" height="4" fill="${codeColors[i % codeColors.length]}"/>`;
    })
    .join("");
  const cursor = `<rect class="blink" x="${monitorX + 114}" y="${monitorY + 50}" width="6" height="10" fill="${PALETTE.cyan}"/>`;

  const monitor = [
    `<rect x="${monitorX - 6}" y="${monitorY - 6}" width="${monitorW + 12}" height="${monitorH + 12}" fill="${silhouette}"/>`,
    `<rect x="${monitorX}" y="${monitorY}" width="${monitorW}" height="${monitorH}" fill="${panel}"/>`,
    codeLines,
    cursor,
    `<rect x="${monitorX + monitorW / 2 - 20}" y="${monitorY + monitorH + 6}" width="40" height="10" fill="${silhouette}"/>`,
  ].join("\n");

  const cup = [
    `<rect x="520" y="190" width="24" height="20" fill="${silhouette}"/>`,
    `<rect x="544" y="194" width="8" height="10" fill="none" stroke="${silhouette}" stroke-width="2"/>`,
    `<rect class="steam" style="animation-delay:0s" x="524" y="178" width="3" height="10" fill="${borderColor(variant)}"/>`,
    `<rect class="steam" style="animation-delay:0.6s" x="532" y="178" width="3" height="10" fill="${borderColor(variant)}"/>`,
    `<rect class="steam" style="animation-delay:1.2s" x="540" y="178" width="3" height="10" fill="${borderColor(variant)}"/>`,
  ].join("\n");

  const plant = `<g class="sway" style="transform-origin:700px 230px">
    <rect x="690" y="210" width="20" height="20" fill="${silhouette}"/>
    <rect x="694" y="190" width="4" height="22" fill="${PALETTE.cyan}"/>
    <rect x="684" y="195" width="4" height="20" fill="${PALETTE.purple}"/>
    <rect x="704" y="195" width="4" height="20" fill="${PALETTE.blue}"/>
  </g>`;

  const body = [window_, desk, chair, person, monitor, cup, plant].join("\n");

  return svgDocument({
    width,
    height,
    variant,
    title: "Escena pixel animada de oficina nocturna: Danny programando frente al monitor, café con vapor, planta y ventana con luna y estrellas",
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
  write("office", variant, buildOffice(variant));
}

console.log("Done.");
