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
// Palette — only these 5 colors are allowed anywhere in the generated SVGs.
// ---------------------------------------------------------------------------
const PALETTE = {
  bgDark: "#0F0E0C",
  bgLight: "#EDE6D6",
  accent: "#FF5A1F",
  secondary: "#C6F432",
  border: "#3A3833",
};

// Text ("ink") color choice is the one thing that must change between
// variants to keep AA contrast: EDE6D6-on-#0F0E0C and #0F0E0C-on-#EDE6D6
// both clear 15:1+. Accent/secondary are ~6:1 and ~15:1 on the DARK bg
// (fine as text there) but drop to ~2.5:1 on the LIGHT bg (fails AA as
// text) — so on light they're used only as fills behind dark-ink text
// (chips/buttons/badges), never as text color directly on the page bg.
function ink(variant) {
  return variant === "dark" ? PALETTE.bgLight : PALETTE.bgDark;
}
function bg(variant) {
  return variant === "dark" ? PALETTE.bgDark : PALETTE.bgLight;
}
// Ink to use for text sitting on top of an accent/secondary-filled chip —
// always the dark color, since both fills are bright enough for AA against
// dark ink but not against light ink.
const CHIP_INK = PALETTE.bgDark;

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

function pixelText(text, x, y, scale, color, { spacing = 1 } = {}) {
  const rects = [];
  let cursorX = x;
  for (const ch of text.toUpperCase()) {
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
  }
  return rects.join("");
}

function pixelTextCentered(text, centerXpos, y, scale, color, opts = {}) {
  const w = measureText(text, scale, opts.spacing ?? 1);
  return pixelText(text, centerXpos - w / 2, y, scale, color, opts);
}

// ---------------------------------------------------------------------------
// Shared decoration: scanlines + outer frame
// ---------------------------------------------------------------------------
function scanlines(width, height, variant) {
  const lines = [];
  for (let y = 0; y < height; y += 4) {
    lines.push(`<rect x="0" y="${y}" width="${width}" height="1" fill="${PALETTE.border}"/>`);
  }
  return `<g class="scanlines" opacity="${variant === "dark" ? 0.07 : 0.1}">${lines.join("")}</g>`;
}

function frame(width, height, color, strokeWidth = 4) {
  const inset = strokeWidth / 2;
  return `<rect x="${inset}" y="${inset}" width="${width - strokeWidth}" height="${height - strokeWidth}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
}

const STYLE_BLOCK = `
  .blink { animation: blink 1.1s steps(2, start) infinite; }
  @keyframes blink { to { visibility: hidden; } }
  .scanlines { animation: flicker 6s linear infinite; }
  @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  @media (prefers-reduced-motion: reduce) {
    .blink { animation: none; }
    .scanlines { animation: none; }
  }
`;

function svgDocument({ width, height, variant, title, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
<title>${escapeXml(title)}</title>
<style>${STYLE_BLOCK}</style>
<rect x="0" y="0" width="${width}" height="${height}" fill="${bg(variant)}"/>
${body}
${scanlines(width, height, variant)}
${frame(width, height, PALETTE.border)}
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
  const height = 320;
  const textColor = ink(variant);
  const cx = width / 2;

  const body = [
    pixelTextCentered("DANNY OSPINO", cx, 90, 6, textColor),
    pixelTextCentered("FRONTEND AI ARCHITECT", cx, 150, 3, PALETTE.accent),
    `<rect x="${cx - 160}" y="190" width="320" height="2" fill="${PALETTE.secondary}"/>`,
    `<g class="blink">${pixelTextCentered("PRESS START", cx, 230, 4, PALETTE.secondary)}</g>`,
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
// QUESTS — project cartridges
// ---------------------------------------------------------------------------
const QUESTS = [
  { slug: "quest-ai-arch", name: "FRONTEND AI ARCH", chips: ["SH", "MD", "AI"] },
  { slug: "quest-bold-dashboard", name: "BOLD DASHBOARD", chips: ["NG", "TS", "TW"] },
  { slug: "quest-precuenta", name: "PRECUENTA APP", chips: ["NG", "TS"] },
  { slug: "quest-portfolio", name: "MY PORTFOLIO", chips: ["NX", "TS"] },
];

function buildQuest(quest, variant, accentColor) {
  const width = 400;
  const height = 220;
  const textColor = ink(variant);
  const cx = width / 2;

  const chipWidth = 56;
  const chipHeight = 26;
  const chipGap = 14;
  const totalChipsWidth = quest.chips.length * chipWidth + (quest.chips.length - 1) * chipGap;
  let chipX = cx - totalChipsWidth / 2;
  const chipRects = quest.chips
    .map((label) => {
      const rect = `<rect x="${chipX}" y="150" width="${chipWidth}" height="${chipHeight}" fill="${accentColor}"/>`;
      const label2 = pixelTextCentered(label, chipX + chipWidth / 2, 158, 2, CHIP_INK);
      chipX += chipWidth + chipGap;
      return rect + label2;
    })
    .join("\n");

  const body = [
    `<rect x="16" y="16" width="${width - 32}" height="10" fill="${accentColor}"/>`,
    pixelTextCentered(quest.name, cx, 60, 2.6, textColor),
    `<rect x="${cx - 100}" y="110" width="200" height="2" fill="${accentColor}"/>`,
    chipRects,
  ].join("\n");

  return svgDocument({
    width,
    height,
    variant,
    title: `Quest cartridge: ${quest.name}`,
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
  const height = 150;
  const textColor = ink(variant);
  const nodeY = 45;
  const colWidth = width / ACHIEVEMENTS.length;

  const line = `<rect x="${colWidth / 2}" y="${nodeY}" width="${width - colWidth}" height="2" fill="${PALETTE.border}"/>`;

  const nodes = ACHIEVEMENTS.map((item, i) => {
    const cx = colWidth * i + colWidth / 2;
    const accent = i % 2 === 0 ? PALETTE.accent : PALETTE.secondary;
    const badge = `<rect x="${cx - 8}" y="${nodeY - 8}" width="16" height="16" fill="${accent}"/>`;
    const l1 = pixelTextCentered(item.line1, cx, 80, 2, textColor);
    const l2 = pixelTextCentered(item.line2, cx, 100, 2, accent === PALETTE.accent ? PALETTE.accent : PALETTE.secondary);
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
// SAVE POINT — contact buttons
// ---------------------------------------------------------------------------
const CONTACTS = ["LINKEDIN", "EMAIL", "GITHUB"];

function buildSavePoint(variant) {
  const width = 840;
  const height = 110;
  const btnWidth = 220;
  const btnHeight = 50;
  const gap = 30;
  const totalWidth = CONTACTS.length * btnWidth + (CONTACTS.length - 1) * gap;
  let x = (width - totalWidth) / 2;

  const buttons = CONTACTS.map((label, i) => {
    const accent = i % 2 === 0 ? PALETTE.accent : PALETTE.secondary;
    const rect = `<rect x="${x}" y="30" width="${btnWidth}" height="${btnHeight}" fill="${accent}"/>`;
    const text = pixelTextCentered(label, x + btnWidth / 2, 30 + btnHeight / 2 - 7, 3, CHIP_INK);
    x += btnWidth + gap;
    return rect + text;
  }).join("\n");

  return svgDocument({
    width,
    height,
    variant,
    title: "Save point: LinkedIn, Email, GitHub",
    body: buttons,
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
    color: PALETTE.accent,
    mask: ["11111111", "10000001", "10000001", "11111111", "10000001", "10000001", "10000001", "11111111"],
    title: "Frontend",
  },
  "icon-state": {
    color: PALETTE.secondary,
    mask: ["00011000", "00111100", "01100110", "11000011", "11000011", "01100110", "00111100", "00011000"],
    title: "Estado y Reactividad",
  },
  "icon-ai": {
    color: PALETTE.accent,
    mask: ["00011000", "00011000", "00011000", "11111111", "11111111", "00011000", "00011000", "00011000"],
    title: "IA y Tooling",
  },
  "icon-testing": {
    color: PALETTE.secondary,
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
  QUESTS.forEach((quest, i) => {
    const accentColor = i % 2 === 0 ? PALETTE.accent : PALETTE.secondary;
    write(quest.slug, variant, buildQuest(quest, variant, accentColor));
  });
  write("achievements", variant, buildAchievements(variant));
  write("save-point", variant, buildSavePoint(variant));
}

console.log("Done.");
