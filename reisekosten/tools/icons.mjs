// Erzeugt die PNG-Icons aus den SVG-Vorlagen (benötigt Playwright/Chromium).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
const browser = await chromium.launch();
const page = await browser.newPage();
const jobs = [
  ['public/icons/icon.svg', 'public/icons/icon-192.png', 192],
  ['public/icons/icon.svg', 'public/icons/icon-512.png', 512],
  ['public/icons/icon.svg', 'public/icons/apple-touch-icon.png', 180],
  ['public/icons/icon-maskable.svg', 'public/icons/icon-maskable-512.png', 512],
];
for (const [src, out, size] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${readFileSync(src, 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log('Icons erzeugt');
