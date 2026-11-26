// Erzeugt die Android-Launcher-Icons (mipmap) aus der App-Grafik. Benötigt Playwright/Chromium.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const glyph = `
  <rect x="120" y="96" width="272" height="336" rx="28" fill="#ffffff"/>
  <path d="M120 400l34 26 34-26 34 26 34-26 34 26 34-26 34 26 34-26v32H120z" fill="#0c6a69"/>
  <path d="M168 168h176M168 216h120" stroke="#0c6a69" stroke-width="22" stroke-linecap="round"/>
  <path d="M176 316l52-58a14 14 0 0 1 10-5h40a14 14 0 0 1 10 5l52 58" fill="none" stroke="#f47230" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M168 316h176v34H168z" fill="#f47230"/>
  <circle cx="204" cy="364" r="14" fill="#0c6a69"/><circle cx="308" cy="364" r="14" fill="#0c6a69"/>`;
const legacy = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="16" y="16" width="480" height="480" rx="110" fill="#0c6a69"/>${glyph}</svg>`;
// Vordergrund für adaptive Icons: Motiv im sicheren Bereich (mittlere 66 %), transparenter Hintergrund
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(256 256) scale(0.58) translate(-256 -264)">${glyph}</g></svg>`;

const dichten = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const browser = await chromium.launch();
const page = await browser.newPage();
const render = async (svg, size, out) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
};
for (const [d, size] of Object.entries(dichten)) {
  mkdirSync(`android/res/mipmap-${d}`, { recursive: true });
  await render(legacy, size, `android/res/mipmap-${d}/ic_launcher.png`);
}
await render(foreground, 432, 'android/res/mipmap-xxxhdpi/ic_launcher_foreground.png');
await browser.close();
console.log('Android-Icons erzeugt');
