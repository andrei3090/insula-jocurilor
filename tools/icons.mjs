// Renders public/icon.svg to the PWA PNG icons with headless Chromium (Playwright). Usage: node tools/icons.mjs
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const out = (f) => new URL(`../public/icons/${f}`, import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, pad] of [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 0.12],
  ['apple-touch-icon.png', 180, 0],
]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<html><body style="margin:0;background:${pad ? '#7fd8ea' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body></html>`,
  );
  await page.screenshot({ path: out(file), omitBackground: !pad });
}
await browser.close();
console.log('icons: done');
