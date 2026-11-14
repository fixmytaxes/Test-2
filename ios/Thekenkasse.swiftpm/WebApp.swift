// Automatisch erzeugt von tools/build.py – bitte nicht von Hand bearbeiten.
// Enthält die komplette Oberfläche der Thekenkasse (HTML, CSS und JavaScript).

enum WebApp {
    static let html = ##"""
<!doctype html>
<!-- Thekenkasse · erstellt 2026-11-14 -->
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Thekenkasse</title>
<meta name="description" content="Kasse für Getränkeverkauf und Thekendienst: Kacheln antippen, Rückgeld berechnen, Deckel führen, Abrechnung erstellen.">
<meta name="theme-color" content="#F1F4F2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1311" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Theke">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjExMiIgZmlsbD0iIzEyNTk0RiIvPgogIDxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMTc4IiBmaWxsPSIjRjJFMUM0Ii8+CiAgPGNpcmNsZSBjeD0iMjU2IiBjeT0iMjU2IiByPSIxNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0M5OUE1NSIgc3Ryb2tlLXdpZHRoPSI3IiBzdHJva2UtZGFzaGFycmF5PSIxNiAxNCIvPgogIDxnIHN0cm9rZT0iIzRGMzIwQiIgc3Ryb2tlLXdpZHRoPSIyMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIj4KICAgIDxwYXRoIGQ9Ik0xODYgMTc4bC0yIDE1Nk0yMjkgMTc2bDIgMTU4TTI3MiAxNzhsLTEgMTU2TTMxNSAxNzdsMiAxNTciLz4KICAgIDxwYXRoIGQ9Ik0xNjAgMzAwbDE5Ni04OCIvPgogIDwvZz4KPC9zdmc+Cg==" type="image/svg+xml">
<link rel="apple-touch-icon" href="data:image/png;base64,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">
<style>
/* Thekenkasse
   Layout: App-Shell mit Kopfnavigation. Kasse = Kachelraster + Bestellspalte rechts (Tablet)
   bzw. Bestellleiste unten (Handy). Deckel erscheinen als runde Bierdeckel mit Strichliste. */

:root {
  /* Farben – hell */
  --bg: #F1F4F2;
  --surface: #FFFFFF;
  --surface-2: #E7ECE9;
  --surface-3: #D9E0DC;
  --fg: #15201B;
  --muted: #5A6862;
  --line: #D2DAD5;
  --accent: #12594F;          /* Flaschengrün: Barzahlung, aktive Auswahl */
  --accent-strong: #0C463E;
  --accent-fg: #FFFFFF;
  --accent-soft: #D5E9E3;
  --coaster: #9C6118;         /* Bierdeckel-Karton: alles, was mit Deckeln zu tun hat */
  --coaster-strong: #7E4D10;
  --coaster-fg: #FFFFFF;
  --coaster-soft: #F2E1C4;
  --coaster-ring: #D3AE73;
  --coaster-ink: #4F320B;
  --danger: #B42318;
  --danger-soft: #FBE3DF;
  --ok: #17703C;
  --scrim: rgba(12, 20, 17, 0.45);
  --shadow: 0 1px 2px rgba(15, 25, 20, 0.06), 0 6px 20px rgba(15, 25, 20, 0.07);
  --shadow-lg: 0 10px 40px rgba(10, 20, 15, 0.22);

  /* Kachelfarben (Hintergrund / Schrift) */
  --amber-bg: #F7E2B3;  --amber-fg: #613E03;
  --gold-bg: #F2EBAE;   --gold-fg: #574C04;
  --orange-bg: #F9D7BC; --orange-fg: #743108;
  --red-bg: #F4CFCD;    --red-fg: #771B1B;
  --rose-bg: #F6D4E3;   --rose-fg: #741E48;
  --violet-bg: #E3D9F4; --violet-fg: #47297F;
  --blue-bg: #D2E2F6;   --blue-fg: #1B4373;
  --teal-bg: #CBE9E4;   --teal-fg: #0E4E45;
  --green-bg: #D7ECCE;  --green-fg: #2A5716;
  --slate-bg: #E0E4E8;  --slate-fg: #313D49;

  /* Schrift */
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-display: "Barlow Semi Condensed", "Avenir Next Condensed", "Arial Narrow", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Maße */
  --radius: 14px;
  --radius-sm: 10px;
  --tile-min: 140px;
  --tile-h: 96px;
  --gutter-l: max(16px, env(safe-area-inset-left, 0px));
  --gutter-r: max(16px, env(safe-area-inset-right, 0px));

  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0E1311;
    --surface: #171E1B;
    --surface-2: #202925;
    --surface-3: #2B3631;
    --fg: #E6EDEA;
    --muted: #93A29B;
    --line: #2C3833;
    --accent: #3DB39C;
    --accent-strong: #5CC9B3;
    --accent-fg: #06201B;
    --accent-soft: #163631;
    --coaster: #DDA052;
    --coaster-strong: #EBB670;
    --coaster-fg: #2A1A04;
    --coaster-soft: #3A2C17;
    --coaster-ring: #6E5228;
    --coaster-ink: #F3D9AE;
    --danger: #F2837A;
    --danger-soft: #3D1D1A;
    --ok: #63CF8D;
    --scrim: rgba(0, 0, 0, 0.62);
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 6px 20px rgba(0, 0, 0, 0.25);
    --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.55);
    --amber-bg: #3D2D0F;  --amber-fg: #F5D38B;
    --gold-bg: #36321A;   --gold-fg: #ECDF8A;
    --orange-bg: #422613; --orange-fg: #F6B88A;
    --red-bg: #431F1E;    --red-fg: #F2A8A5;
    --rose-bg: #421F2E;   --rose-fg: #F1A9CA;
    --violet-bg: #2D2444; --violet-fg: #CCB8F1;
    --blue-bg: #1A2B42;   --blue-fg: #A8C8F1;
    --teal-bg: #133532;   --teal-fg: #8ED8CA;
    --green-bg: #1E3318;  --green-fg: #B3DC9F;
    --slate-bg: #252C33;  --slate-fg: #C5CDD5;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --bg: #0E1311;
  --surface: #171E1B;
  --surface-2: #202925;
  --surface-3: #2B3631;
  --fg: #E6EDEA;
  --muted: #93A29B;
  --line: #2C3833;
  --accent: #3DB39C;
  --accent-strong: #5CC9B3;
  --accent-fg: #06201B;
  --accent-soft: #163631;
  --coaster: #DDA052;
  --coaster-strong: #EBB670;
  --coaster-fg: #2A1A04;
  --coaster-soft: #3A2C17;
  --coaster-ring: #6E5228;
  --coaster-ink: #F3D9AE;
  --danger: #F2837A;
  --danger-soft: #3D1D1A;
  --ok: #63CF8D;
  --scrim: rgba(0, 0, 0, 0.62);
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 6px 20px rgba(0, 0, 0, 0.25);
  --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.55);
  --amber-bg: #3D2D0F;  --amber-fg: #F5D38B;
  --gold-bg: #36321A;   --gold-fg: #ECDF8A;
  --orange-bg: #422613; --orange-fg: #F6B88A;
  --red-bg: #431F1E;    --red-fg: #F2A8A5;
  --rose-bg: #421F2E;   --rose-fg: #F1A9CA;
  --violet-bg: #2D2444; --violet-fg: #CCB8F1;
  --blue-bg: #1A2B42;   --blue-fg: #A8C8F1;
  --teal-bg: #133532;   --teal-fg: #8ED8CA;
  --green-bg: #1E3318;  --green-fg: #B3DC9F;
  --slate-bg: #252C33;  --slate-fg: #C5CDD5;
  color-scheme: dark;
}

/* ---------- Schrift (Barlow Semi Condensed, SIL OFL 1.1 – siehe fonts/OFL.txt) ---------- */

/* ---------- Grundgerüst ---------- */
*, *::before, *::after { box-sizing: border-box; }
html { height: 100%; }
body {
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-ui);
  font-size: 15px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  overscroll-behavior: none;
  -webkit-touch-callout: none;
}
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; touch-action: manipulation; }
button:disabled { cursor: default; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
h1, h2, h3 { font-family: var(--font-display); font-weight: 600; letter-spacing: 0.005em; text-wrap: balance; margin: 0; }
h1 { font-size: 30px; line-height: 1.1; }
h2 { font-size: 21px; line-height: 1.2; }
h3 { font-size: 17px; }
p { margin: 0; }
.muted { color: var(--muted); }
.num, .tabular { font-variant-numeric: tabular-nums; }
[hidden] { display: none !important; }
svg { flex: none; }

.app {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding-left: var(--gutter-l);
  padding-right: var(--gutter-r);
}
.app[data-tiles="s"] { --tile-min: 112px; --tile-h: 78px; }
.app[data-tiles="l"] { --tile-min: 184px; --tile-h: 128px; }

/* ---------- Kopfzeile ---------- */
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-block: 10px;
  border-bottom: 1px solid var(--line);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 21px;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.brand-mark { width: 30px; height: 30px; color: var(--coaster); }
.nav {
  display: flex;
  gap: 4px;
  margin-left: auto;
  background: var(--surface-2);
  padding: 4px;
  border-radius: 999px;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  -webkit-user-select: none;
  user-select: none;
}
.nav-item svg { width: 20px; height: 20px; }
.nav-item[aria-current="page"] { background: var(--surface); color: var(--fg); box-shadow: var(--shadow); }
.nav-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--coaster);
  color: var(--coaster-fg);
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ---------- Views ---------- */
.main { min-height: 0; position: relative; }
.view { height: 100%; min-height: 0; }
.view-scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
.view-inner { max-width: 1100px; margin: 0 auto; padding-block: 20px 48px; display: flex; flex-direction: column; gap: 24px; }
.view-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 20px; }
.view-head > div:first-child { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.head-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.section { display: flex; flex-direction: column; gap: 12px; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

/* ---------- Buttons ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 10px 18px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--fg);
  font-weight: 650;
  font-size: 16px;
  line-height: 1.15;
  text-align: center;
  -webkit-user-select: none;
  user-select: none;
  transition: transform 0.08s ease, background-color 0.15s ease, opacity 0.15s ease;
}
.btn svg { width: 20px; height: 20px; }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { opacity: 0.45; }
.btn-primary { background: var(--accent); color: var(--accent-fg); }
.btn-primary:hover:not(:disabled) { background: var(--accent-strong); }
.btn-coaster { background: var(--coaster); color: var(--coaster-fg); }
.btn-coaster:hover:not(:disabled) { background: var(--coaster-strong); }
.btn-outline { background: transparent; border-color: var(--line); }
.btn-danger { background: var(--danger-soft); color: var(--danger); }
.btn-ghost { background: transparent; }
.btn-sm { min-height: 36px; padding: 6px 12px; font-size: 14px; border-radius: 10px; }
.btn-lg { min-height: 58px; font-size: 18px; border-radius: 14px; }
.btn-block { width: 100%; }
.btn[data-armed] { background: var(--danger); color: #fff; }
.icon-btn {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
}
.icon-btn svg { width: 22px; height: 22px; }
.icon-btn:hover { background: var(--surface-2); color: var(--fg); }
.link-btn { border: 0; background: none; padding: 6px 4px; color: var(--accent); font-weight: 600; }
.link-btn:disabled { color: var(--muted); opacity: 0.6; }

/* ---------- Kasse ---------- */
.view-kasse { display: flex; flex-direction: column; }
.products { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.chips {
  display: flex;
  gap: 8px;
  padding-block: 12px 10px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: none;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: none;
  min-height: 38px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  font-weight: 600;
  font-size: 15px;
}
.chip[aria-pressed="true"] { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.grid-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; padding-bottom: 16px; }
.hint {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 10px 10px 14px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--fg);
  font-size: 14px;
}
.hint p { flex: 1; min-width: 0; }
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--tile-min), 1fr));
  gap: 10px;
}
.grid-title {
  grid-column: 1 / -1;
  padding-top: 8px;
  font-size: 13px;
  font-family: var(--font-ui);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.grid-title:first-child { padding-top: 0; }
.tile {
  --t-bg: var(--slate-bg);
  --t-fg: var(--slate-fg);
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
  min-height: var(--tile-h);
  padding: 12px 14px;
  border: 0;
  border-radius: var(--radius);
  background: var(--t-bg);
  color: var(--t-fg);
  text-align: left;
  -webkit-user-select: none;
  user-select: none;
  transition: transform 0.07s ease, box-shadow 0.15s ease;
}
.tile:active { transform: scale(0.96); }
.tile.in-cart { box-shadow: inset 0 0 0 3px var(--t-fg); }
.tile-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 19px;
  line-height: 1.1;
  overflow-wrap: break-word;
  -webkit-hyphens: auto;
  hyphens: auto;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.app[data-tiles="l"] .tile-name { font-size: 23px; }
.app[data-tiles="s"] .tile-name { font-size: 17px; }
.tile-price { font-size: 15px; font-weight: 600; opacity: 0.85; font-variant-numeric: tabular-nums; }
.tile-qty {
  position: absolute;
  bottom: 8px;
  right: 8px;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border-radius: 15px;
  background: var(--t-fg);
  color: var(--t-bg);
  font-weight: 800;
  font-size: 16px;
  line-height: 30px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.tile-qty.pop { animation: pop 0.22s ease; }
@keyframes pop { 0% { transform: scale(0.6); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }

.tc-amber { --t-bg: var(--amber-bg); --t-fg: var(--amber-fg); }
.tc-gold { --t-bg: var(--gold-bg); --t-fg: var(--gold-fg); }
.tc-orange { --t-bg: var(--orange-bg); --t-fg: var(--orange-fg); }
.tc-red { --t-bg: var(--red-bg); --t-fg: var(--red-fg); }
.tc-rose { --t-bg: var(--rose-bg); --t-fg: var(--rose-fg); }
.tc-violet { --t-bg: var(--violet-bg); --t-fg: var(--violet-fg); }
.tc-blue { --t-bg: var(--blue-bg); --t-fg: var(--blue-fg); }
.tc-teal { --t-bg: var(--teal-bg); --t-fg: var(--teal-fg); }
.tc-green { --t-bg: var(--green-bg); --t-fg: var(--green-fg); }
.tc-slate { --t-bg: var(--slate-bg); --t-fg: var(--slate-fg); }

/* Bestellung */
.order {
  flex: none;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-top: 1px solid var(--line);
  margin-left: calc(-1 * var(--gutter-l));
  margin-right: calc(-1 * var(--gutter-r));
  padding: 8px var(--gutter-r) 12px var(--gutter-l);
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.06);
}
.order-head { display: flex; align-items: center; gap: 8px; }
.order-toggle {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border: 0;
  background: none;
  text-align: left;
}
.order-title { font-family: var(--font-display); font-weight: 600; font-size: 20px; }
.order-count { color: var(--muted); font-size: 14px; font-variant-numeric: tabular-nums; }
.order-toggle svg { width: 20px; height: 20px; color: var(--muted); transition: transform 0.2s ease; }
.order.is-open .order-toggle svg { transform: rotate(180deg); }
.order-lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: none;
  max-height: 42vh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.order.is-open .order-lines { display: block; }
.order-empty { display: none; padding: 20px 4px; color: var(--muted); text-align: center; }
.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 78px;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}
.line:last-child { border-bottom: 0; }
.line-info { min-width: 0; display: flex; flex-direction: column; }
.line-name { font-weight: 600; overflow-wrap: anywhere; }
.line-unit { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.line-sum { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.stepper { display: flex; align-items: center; gap: 2px; background: var(--surface-2); border-radius: 12px; padding: 3px; }
.stepper button {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 9px;
  background: var(--surface);
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
  display: grid;
  place-items: center;
}
.stepper button:active { background: var(--surface-3); }
.stepper-n { min-width: 28px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.order-foot { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }
.order-total { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.order-total span { color: var(--muted); font-weight: 600; }
.order-total output { font-family: var(--font-display); font-weight: 700; font-size: 34px; line-height: 1; font-variant-numeric: tabular-nums; }
.order-actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; }
.order-actions .btn { min-height: 56px; font-size: 17px; }

@media (min-width: 760px) {
  .view-kasse { display: grid; grid-template-columns: minmax(0, 1fr) clamp(300px, 34vw, 390px); gap: 0; }
  .products { padding-right: 16px; }
  .order {
    margin: 0 calc(-1 * var(--gutter-r)) 0 0;
    padding: 14px var(--gutter-r) 16px 18px;
    border-top: 0;
    border-left: 1px solid var(--line);
    box-shadow: none;
    min-height: 0;
  }
  .order-toggle { pointer-events: none; }
  .order-toggle svg { display: none; }
  .order-lines { display: block; flex: 1; max-height: none; min-height: 0; }
  .order.is-empty .order-lines { display: none; }
  .order.is-empty .order-empty { display: block; flex: 1; }
  .order-foot { border-top: 1px solid var(--line); padding-top: 12px; }
  .order-total output { font-size: 40px; }
  .order-actions { grid-template-columns: 1fr; }
  .order-actions .btn-primary { order: -1; min-height: 64px; font-size: 19px; }
}

/* ---------- Dialoge ---------- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  background: var(--scrim);
  animation: fade 0.15s ease;
}
@keyframes fade { from { opacity: 0; } }
@keyframes rise { from { transform: translateY(14px); opacity: 0; } }
.modal {
  width: min(560px, 100%);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--fg);
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: rise 0.18s ease;
}
.modal-wide { width: min(940px, 100%); }
.modal-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 18px 6px 22px; }
.modal-head > div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.modal-head h2 { font-size: 24px; overflow-wrap: anywhere; }
.modal-body { padding: 10px 22px 18px; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.modal-foot { display: flex; gap: 10px; padding: 14px 22px 20px; border-top: 1px solid var(--line); flex-wrap: wrap; }
.modal-foot .spacer { flex: 1; }
.modal-foot .btn { flex: 1 1 auto; }

@media (max-width: 640px) {
  .modal-backdrop.full { padding: 0; }
  .modal-backdrop.full .modal {
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }
  .modal-head { padding: 14px 12px 4px 16px; }
  .modal-body { padding: 8px 16px 14px; }
  .modal-foot { padding: 12px 16px 14px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}

/* Formulare */
.field { display: flex; flex-direction: column; gap: 6px; }
.field > span, .field-label { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.input {
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  font-size: 17px;
}
.input:focus { outline: 2px solid var(--accent); outline-offset: 0; border-color: transparent; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.row > .input { flex: 1; min-width: 0; }
.seg { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 4px; border-radius: 12px; background: var(--surface-2); }
.seg button { min-height: 38px; padding: 6px 14px; border: 0; border-radius: 9px; background: transparent; font-weight: 600; color: var(--muted); }
.seg button[aria-pressed="true"] { background: var(--surface); color: var(--fg); box-shadow: var(--shadow); }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 0;
  background: var(--t-bg);
  color: var(--t-fg);
  display: grid;
  place-items: center;
  font-weight: 800;
}
.swatch-btn[aria-pressed="true"] { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--t-fg); }
.switch {
  position: relative;
  width: 52px;
  height: 32px;
  flex: none;
  border: 0;
  border-radius: 16px;
  background: var(--surface-3);
  transition: background-color 0.15s ease;
}
.switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
}
.switch[aria-checked="true"] { background: var(--accent); }
.switch[aria-checked="true"]::after { transform: translateX(20px); }
.setting { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.setting:last-child { border-bottom: 0; }
.setting > div:first-child { min-width: 0; flex: 1 1 220px; display: flex; flex-direction: column; gap: 2px; }
.setting-title { font-weight: 650; }
.setting-desc { font-size: 14px; color: var(--muted); }

/* ---------- Zahlung ---------- */
.pay { display: grid; grid-template-columns: minmax(250px, 300px) minmax(0, 1fr); gap: 24px; }
.pay-summary { display: flex; flex-direction: column; gap: 14px; }
.pay-figure { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; border-radius: 14px; background: var(--surface-2); }
.pay-figure .label { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.pay-figure .value { font-family: var(--font-display); font-weight: 700; font-size: 34px; line-height: 1.05; font-variant-numeric: tabular-nums; }
.pay-figure .sub { font-size: 14px; color: var(--muted); min-height: 20px; overflow-wrap: anywhere; }
.pay-given { position: relative; }
.pay-given .clear { position: absolute; top: 8px; right: 8px; }
.pay-change { background: var(--accent-soft); }
.pay-change .value { font-size: 46px; color: var(--accent); }
.pay-change.is-missing { background: var(--danger-soft); }
.pay-change.is-missing .value { color: var(--danger); }
.pay-input { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.money-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.money-btn {
  position: relative;
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  -webkit-user-select: none;
  user-select: none;
  transition: transform 0.07s ease;
}
.money-btn:active { transform: scale(0.93); }
.money-btn svg { width: 100%; height: auto; display: block; filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.25)); }
.money-btn.coin svg { width: 78%; }
.money-btn .count {
  position: absolute;
  top: -4px;
  right: -2px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--fg);
  color: var(--bg);
  font-size: 12px;
  font-weight: 800;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
}
.pay-quick { display: flex; gap: 8px; }
.pay-quick .btn { flex: 1; }
.keypad { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.key {
  min-height: 56px;
  border: 0;
  border-radius: 12px;
  background: var(--surface-2);
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  -webkit-user-select: none;
  user-select: none;
  display: grid;
  place-items: center;
}
.key:active { background: var(--surface-3); }
.key svg { width: 26px; height: 26px; }
.denoms { display: flex; flex-wrap: wrap; gap: 6px; }
.denom { padding: 2px 8px; border-radius: 6px; background: var(--surface); font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }

@media (max-width: 640px) {
  .pay { grid-template-columns: 1fr; gap: 12px; }
  .pay-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pay-change { grid-column: 1 / -1; }
  .pay-figure { padding: 10px 12px; }
  .pay-figure .value { font-size: 26px; }
  .pay-change .value { font-size: 36px; }
  .key { min-height: 50px; font-size: 22px; }
  .money-row { gap: 6px; }
}

/* ---------- Deckel ---------- */
.coasters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
  gap: 18px;
}
.coaster {
  position: relative;
  width: 100%;
  max-width: 220px;
  justify-self: center;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 0;
  padding: 18% 14%;
  background: var(--coaster-soft);
  color: var(--coaster-ink);
  box-shadow: inset 0 0 0 5px var(--coaster-soft), inset 0 0 0 6.5px var(--coaster-ring), var(--shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  text-align: center;
  transition: transform 0.08s ease;
}
.coaster:active { transform: scale(0.96) rotate(-2deg); }
.coaster::before {
  content: "";
  position: absolute;
  inset: 11px;
  border-radius: 50%;
  border: 1.5px dashed var(--coaster-ring);
  pointer-events: none;
}
.coaster-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 20px;
  line-height: 1.05;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.coaster-tally { width: 78%; height: auto; color: var(--coaster-ink); }
.coaster-empty { font-size: 13px; opacity: 0.75; }
.coaster-total { font-family: var(--font-display); font-weight: 700; font-size: 22px; font-variant-numeric: tabular-nums; }
.coaster-more { font-size: 12px; font-weight: 700; }

.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.list-row:last-child { border-bottom: 0; }
.list-row .grow { flex: 1 1 200px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.list-row .amount { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.list-row .meta { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }

.tab-total { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 14px; background: var(--coaster-soft); color: var(--coaster-ink); }
.tab-total strong { font-family: var(--font-display); font-size: 34px; line-height: 1; font-variant-numeric: tabular-nums; }
.picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.picker-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 64px;
  padding: 10px 14px;
  border: 1px solid var(--coaster-ring);
  border-radius: 12px;
  background: var(--coaster-soft);
  color: var(--coaster-ink);
  text-align: left;
}
.picker-btn:active { transform: scale(0.97); }
.picker-btn strong { font-family: var(--font-display); font-size: 19px; line-height: 1.1; overflow-wrap: anywhere; }
.picker-btn span { font-size: 13px; font-variant-numeric: tabular-nums; }

/* ---------- Abrechnung ---------- */
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--line);
  min-width: 0;
}
.kpi-label { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.kpi-value { font-family: var(--font-display); font-weight: 700; font-size: 32px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.kpi-sub { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.kpi-accent { background: var(--accent-soft); border-color: transparent; }
.kpi-accent .kpi-value { color: var(--accent); }
.kpi-coaster { background: var(--coaster-soft); border-color: transparent; color: var(--coaster-ink); }
.kpi-coaster .kpi-label, .kpi-coaster .kpi-sub { color: var(--coaster-ink); opacity: 0.85; }
@media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 380px) { .kpi-value { font-size: 26px; } }

.card { padding: 18px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--line); display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.cash-count { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: end; }
.cash-count .figure { display: flex; flex-direction: column; gap: 2px; }
.cash-count .figure strong { font-family: var(--font-display); font-size: 26px; font-variant-numeric: tabular-nums; }
.diff-pos { color: var(--ok); }
.diff-neg { color: var(--danger); }
@media (max-width: 640px) { .cash-count { grid-template-columns: 1fr 1fr; } .cash-count .field { grid-column: 1 / -1; } }

.table-wrap { overflow-x: auto; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); }
.table { width: 100%; border-collapse: collapse; font-size: 15px; }
.table th, .table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--line); white-space: nowrap; }
.table td:first-child { white-space: normal; min-width: 140px; }
.table thead th { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); background: var(--surface-2); }
.table .num { text-align: right; font-variant-numeric: tabular-nums; }
.table tr.group th { background: var(--bg); font-family: var(--font-display); font-size: 16px; font-weight: 600; }
.table tr.subtotal td { color: var(--muted); font-weight: 600; }
.table tfoot td { font-weight: 800; border-bottom: 0; background: var(--surface-2); }
.qbar { display: block; height: 4px; margin-top: 6px; border-radius: 2px; background: var(--surface-2); overflow: hidden; max-width: 220px; }
.qbar i { display: block; height: 100%; background: var(--accent); border-radius: 2px; }

.journal { list-style: none; margin: 0; padding: 0; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); }
.jrow {
  display: grid;
  grid-template-columns: 44px 48px auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
}
.jrow:last-child { border-bottom: 0; }
.jrow .jno, .jrow .jtime { color: var(--muted); font-variant-numeric: tabular-nums; }
.jrow .jdesc { min-width: 0; overflow-wrap: anywhere; }
.jrow .jamt { font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.jrow.is-void .jdesc, .jrow.is-void .jamt { text-decoration: line-through; color: var(--muted); }
.pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.pill-cash { background: var(--accent-soft); color: var(--accent); }
.pill-tab { background: var(--coaster-soft); color: var(--coaster-ink); }
.pill-tabpay { background: var(--coaster); color: var(--coaster-fg); }
.pill-void { background: var(--danger-soft); color: var(--danger); }
@media (max-width: 640px) {
  .jrow { grid-template-columns: auto auto minmax(0, 1fr) auto; grid-template-areas: "no time pill amt" "desc desc desc act"; row-gap: 4px; }
  .jrow .jno { grid-area: no; }
  .jrow .jtime { grid-area: time; }
  .jrow .pill { grid-area: pill; justify-self: start; }
  .jrow .jamt { grid-area: amt; }
  .jrow .jdesc { grid-area: desc; }
  .jrow .jact { grid-area: act; }
}
.archive-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; border-radius: 12px; background: var(--surface-2); }
.empty-state { padding: 28px 16px; text-align: center; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }

/* ---------- Sortiment ---------- */
.sort-cat { display: flex; flex-direction: column; gap: 8px; }
.sort-cat-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sort-cat-head h2 { flex: 1; min-width: 0; }
.sort-list { list-style: none; margin: 0; padding: 0; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); }
.sort-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px 8px 12px; border-bottom: 1px solid var(--line); }
.sort-row:last-child { border-bottom: 0; }
.sort-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 6px 0; border: 0; background: none; text-align: left; }
.sort-dot { width: 34px; height: 34px; flex: none; border-radius: 9px; background: var(--t-bg); box-shadow: inset 0 0 0 1.5px var(--t-fg); }
.sort-name { flex: 1; min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
.sort-price { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.sort-row.is-hidden .sort-name, .sort-row.is-hidden .sort-price { color: var(--muted); }
.sort-row.is-hidden .sort-dot { opacity: 0.4; }
.sort-move { display: flex; gap: 2px; }
.sort-move .icon-btn { width: 34px; height: 34px; }
@media (max-width: 480px) { .sort-move { display: none; } }

.toast-root {
  position: fixed;
  left: 50%;
  top: calc(env(safe-area-inset-top, 0px) + 68px);
  transform: translateX(-50%);
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(480px, calc(100% - 32px));
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 16px;
  border-radius: 14px;
  background: var(--fg);
  color: var(--bg);
  box-shadow: var(--shadow-lg);
  font-weight: 600;
  pointer-events: auto;
  animation: rise 0.2s ease;
}
.toast p { flex: 1; min-width: 0; }
.toast strong { font-variant-numeric: tabular-nums; }
.toast button { flex: none; border: 0; border-radius: 10px; padding: 8px 12px; background: var(--bg); color: var(--fg); font-weight: 700; }
.toast.is-error { background: var(--danger); color: #fff; }

/* ---------- Handy-Anpassungen ---------- */
@media (max-width: 759px) {
  .order-actions .btn svg { display: none; }
  .topbar { padding-block: 6px; }
  .brand { display: none; }
  .nav { margin: 0; flex: 1; border-radius: 14px; }
  .nav-item { flex: 1; flex-direction: column; gap: 2px; padding: 6px 4px; border-radius: 10px; font-size: 12px; }
  .nav-item svg { width: 22px; height: 22px; }
  .nav-badge { position: absolute; top: 2px; left: calc(50% + 6px); min-width: 18px; height: 18px; line-height: 18px; font-size: 11px; padding: 0 5px; }
  .app { --tile-min: 104px; --tile-h: 84px; }
  .app[data-tiles="s"] { --tile-min: 92px; --tile-h: 70px; }
  .app[data-tiles="l"] { --tile-min: 150px; --tile-h: 108px; }
  .tile { padding: 10px 11px; }
  .tile-name { font-size: 17px; }
  .app[data-tiles="l"] .tile-name { font-size: 20px; }
  .app[data-tiles="s"] .tile-name { font-size: 15px; }
  .product-grid { gap: 8px; }
  h1 { font-size: 26px; }
  .view-inner { padding-block: 16px 40px; gap: 20px; }
  .coasters { grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); gap: 12px; }
  .coaster-name { font-size: 17px; }
  .coaster-total { font-size: 19px; }
}
@media (max-width: 759px) and (orientation: landscape) and (max-height: 500px) {
  .order-lines { max-height: 30vh; }
}

/* ---------- Druck ---------- */
@media print {
  body { overflow: visible; height: auto; background: #fff; color: #000; }
  .app { display: block; height: auto; }
  .topbar, .head-actions, .toast-root, .modal-backdrop, .no-print, .jact { display: none !important; }
  .view { height: auto; }
  .view-scroll { overflow: visible; }
  .view[data-name]:not(.is-active) { display: none !important; }
}

/* ---------- Ergänzungen ---------- */
.form-error { color: var(--danger); font-size: 14px; font-weight: 600; min-height: 20px; }
.field-hint { font-size: 13px; color: var(--muted); }
.pe-preview { display: grid; grid-template-columns: minmax(0, 180px); }
.pe-preview .tile { pointer-events: none; }
.data-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.cloud-line { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); }
.cloud-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); flex: none; }
.cloud-dot.on { background: var(--ok); }
.cloud-dot.err { background: var(--danger); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

</style>
</head>
<body>
<!-- APP:START -->
<div id="app" class="app" data-tiles="m" lang="de">
  <header class="topbar">
    <div class="brand">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="currentColor"/><circle cx="16" cy="16" r="11" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="2.2 2"/><g stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M10.5 11v10M13.5 11v10M16.5 11v10M19.5 11v10M8.5 19.5l13-7"/></g></svg>
      <span>Thekenkasse</span>
    </div>
    <nav class="nav" aria-label="Bereiche">
      <a class="nav-item" href="#kasse" data-nav="kasse">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>
        <span>Kasse</span>
      </a>
      <a class="nav-item" href="#deckel" data-nav="deckel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 8.5v7M12 8.5v7M15 8.5v7M7.5 14l9-4.5"/></svg>
        <span>Deckel</span>
        <b class="nav-badge" id="navTabBadge" hidden>0</b>
      </a>
      <a class="nav-item" href="#abrechnung" data-nav="abrechnung">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/></svg>
        <span>Abrechnung</span>
      </a>
      <a class="nav-item" href="#sortiment" data-nav="sortiment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>
        <span>Sortiment</span>
      </a>
    </nav>
  </header>

  <main class="main" id="main">
    <section class="view view-kasse" data-name="kasse" id="view-kasse">
      <div class="products">
        <div class="chips" id="catChips" role="toolbar" aria-label="Kategorien"></div>
        <div class="grid-scroll" id="gridScroll">
          <div id="sampleHint"></div>
          <div class="product-grid" id="productGrid"></div>
        </div>
      </div>
      <aside class="order" id="orderPanel" aria-label="Aktuelle Bestellung"></aside>
    </section>
    <section class="view view-scroll" data-name="deckel" id="view-deckel" hidden></section>
    <section class="view view-scroll" data-name="abrechnung" id="view-abrechnung" hidden></section>
    <section class="view view-scroll" data-name="sortiment" id="view-sortiment" hidden></section>
  </main>

  <div id="modalRoot"></div>
  <div class="toast-root" id="toastRoot" aria-live="polite"></div>
</div>
<!-- APP:END -->
<script>
/* Thekenkasse – Kassen-App für Getränkeverkauf und Thekendienst.
   Läuft komplett im Browser. Alle Daten liegen auf dem Gerät (localStorage);
   innerhalb von claude.ai kommt eine automatische Cloud-Sicherung im eigenen Konto dazu. */
(function () {
  'use strict';

  // ================================================================
  // Hilfsfunktionen
  // ================================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  const fmt = (c) => EUR.format((c || 0) / 100);
  const fmtPlain = (c) => ((c || 0) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const fmtDenom = (c) => (c >= 100 ? `${c / 100} €` : `${c} ct`);
  const TIME = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
  const DATETIME = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const DATE_FILE = (ts) => { const d = new Date(ts); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const fTime = (ts) => TIME.format(new Date(ts));
  const fDateTime = (ts) => DATETIME.format(new Date(ts));
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  /** Verhindert Umbrüche zwischen Zahl und Einheit („0,5 l“) */
  const nb = (s) => esc(s).replace(/(\d) (l|cl|ml|g|kg|Stk\.?|St\.?)(?=$|\s|\))/g, '$1\u00A0$2');

  /** "3,50" · "3.5" · "1.234,50" · "-2" → Cent (Ganzzahl) oder NaN */
  function parseMoney(input) {
    if (input == null) return NaN;
    let s = String(input).trim().replace(/[\s€]/g, '').replace(/^−/, '-');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    if (!/^-?\d*(\.\d*)?$/.test(s) || s === '-' || s === '.') return NaN;
    const v = Number(s);
    return Number.isFinite(v) ? Math.round(v * 100) : NaN;
  }

  let FRAMED = false;
  try { FRAMED = window.self !== window.top; } catch (e) { FRAMED = true; }
  const HAS_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');
  /** Native App-Hülle (iPad: Swift Playgrounds, Android: APK): Speichern, Teilen und Drucken übernimmt die App. */
  const ANDROID = window.ThekenkasseAndroid || null;
  const NATIVE = (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.thekenkasse)
    || (ANDROID ? { postMessage: (msg) => ANDROID.postMessage(JSON.stringify(msg)) } : null);
  const nativeSend = (msg) => { try { NATIVE.postMessage(msg); return true; } catch (e) { return false; } };
  const WAKE_SUPPORTED = !!NATIVE || 'wakeLock' in navigator;

  // ================================================================
  // Konstanten
  // ================================================================
  const STORAGE_KEY = 'thekenkasse.v1';
  const COLORS = ['amber', 'gold', 'orange', 'red', 'rose', 'violet', 'blue', 'teal', 'green', 'slate'];
  const COLOR_NAMES = { amber: 'Bernstein', gold: 'Gold', orange: 'Orange', red: 'Rot', rose: 'Rosé', violet: 'Violett', blue: 'Blau', teal: 'Petrol', green: 'Grün', slate: 'Grau' };
  const NOTES = [500, 1000, 2000, 5000, 10000];
  const COINS = [200, 100, 50, 20, 10];
  const CHANGE_DENOMS = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  const VIEWS = ['kasse', 'deckel', 'abrechnung', 'sortiment'];

  const ICON = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    backspace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>',
    coaster: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 8.5v7M12 8.5v7M15 8.5v7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  // ================================================================
  // Zustand & Speicherung
  // ================================================================
  function newSession(float) {
    return { id: uid(), startedAt: Date.now(), float: float || 0, counted: null, counter: 0, events: [] };
  }

  function defaultState() {
    const p = (name, euro, cat, color) => ({ id: uid(), name, price: Math.round(euro * 100), cat, color, active: true });
    return {
      v: 1,
      categories: [{ id: 'getraenke', name: 'Getränke' }, { id: 'essen', name: 'Essen' }],
      products: [
        p('Bier 0,5 l', 3.5, 'getraenke', 'amber'),
        p('Radler 0,5 l', 3.5, 'getraenke', 'gold'),
        p('Weizen 0,5 l', 4, 'getraenke', 'orange'),
        p('Wein 0,2 l', 4, 'getraenke', 'red'),
        p('Weinschorle 0,4 l', 3.5, 'getraenke', 'rose'),
        p('Sekt 0,1 l', 3, 'getraenke', 'violet'),
        p('Cola 0,33 l', 2.5, 'getraenke', 'slate'),
        p('Spezi 0,33 l', 2.5, 'getraenke', 'orange'),
        p('Apfelschorle 0,5 l', 2.5, 'getraenke', 'green'),
        p('Wasser 0,5 l', 2, 'getraenke', 'blue'),
        p('Kaffee', 2, 'getraenke', 'slate'),
        p('Bratwurst im Brötchen', 3.5, 'essen', 'red'),
        p('Pommes', 3, 'essen', 'gold'),
        p('Brezel', 2, 'essen', 'amber'),
        p('Kuchen', 2.5, 'essen', 'rose')
      ],
      settings: { tileSize: 'm', theme: 'auto', wakeLock: false },
      cart: [],
      tabs: [],
      session: newSession(0),
      history: [],
      meta: { deviceId: uid(), created: Date.now(), updated: Date.now(), sampleHint: true, edited: false }
    };
  }

  function migrate(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object' || !Array.isArray(s.products)) return d;
    s.categories = Array.isArray(s.categories) && s.categories.length ? s.categories : d.categories;
    s.settings = Object.assign({}, d.settings, s.settings || {});
    s.cart = Array.isArray(s.cart) ? s.cart.filter((l) => l && l.pid && l.qty > 0) : [];
    s.tabs = Array.isArray(s.tabs) ? s.tabs : [];
    s.tabs.forEach((t) => { t.entries = Array.isArray(t.entries) ? t.entries : []; t.status = t.status || 'open'; });
    s.session = s.session && Array.isArray(s.session.events) ? s.session : newSession(0);
    s.history = Array.isArray(s.history) ? s.history : [];
    s.meta = Object.assign({}, d.meta, s.meta || {});
    s.products.forEach((p) => { if (!COLORS.includes(p.color)) p.color = 'slate'; if (typeof p.active !== 'boolean') p.active = true; });
    s.v = 1;
    return s;
  }

  let storageOk = true;
  let restoredFromStorage = false;
  const IS_LOCAL_FILE = location.protocol === 'file:';
  function nativeSaved() {
    if (typeof window.__thekenkasseSaved === 'string') return window.__thekenkasseSaved;
    try { return ANDROID && typeof ANDROID.loadState === 'function' ? ANDROID.loadState() : null; } catch (e) { return null; }
  }

  function load() {
    const saved = NATIVE ? nativeSaved() : null;
    if (saved) {
      try { const s = migrate(JSON.parse(saved)); restoredFromStorage = true; return s; } catch (e) { /* weiter mit Browser-Speicher */ }
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { restoredFromStorage = true; return migrate(JSON.parse(raw)); }
    } catch (e) { storageOk = false; }
    return defaultState();
  }

  let state = load();
  const ui = { view: 'kasse', cat: 'all', orderOpen: false, reportId: null, journalAll: false };

  function save() {
    state.meta.updated = Date.now();
    const json = JSON.stringify(state);
    if (NATIVE) {
      const ok = nativeSend({ type: 'save', data: json });
      if (!ok && storageOk) toast('Speichern auf diesem Gerät nicht möglich. Bitte eine Sicherung exportieren.', { error: true, ms: 8000 });
      storageOk = ok;
      try { localStorage.setItem(STORAGE_KEY, json); } catch (e) { /* App-Speicher genügt */ }
      Cloud.schedule();
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, json);
      if (!storageOk) { storageOk = true; }
    } catch (e) {
      if (storageOk) toast('Speichern auf diesem Gerät nicht möglich. Bitte eine Sicherung exportieren.', { error: true, ms: 8000 });
      storageOk = false;
    }
    Cloud.schedule();
  }

  const isTouched = () => state.session.events.length > 0 || state.tabs.length > 0 || state.history.length > 0 || state.meta.edited;

  // ================================================================
  // Fachlogik
  // ================================================================
  const prod = (id) => state.products.find((p) => p.id === id);
  const catName = (id, names) => (names && names[id]) || (state.categories.find((c) => c.id === id) || {}).name || 'Sonstiges';
  const tabById = (id) => state.tabs.find((t) => t.id === id);
  const tabTotal = (t) => sum(t.entries, (e) => e.total);
  const tabItemCount = (t) => sum(t.entries, (e) => sum(e.items, (i) => i.qty));
  const openTabs = () => state.tabs.filter((t) => t.status === 'open');
  const itemsTotal = (items) => sum(items, (i) => i.price * i.qty);
  const itemsCount = (items) => sum(items, (i) => i.qty);
  const itemsText = (items) => items.map((i) => `${i.qty}× ${i.name}`).join(', ');

  function cartItems() {
    const items = [];
    for (const l of state.cart) {
      const p = prod(l.pid);
      if (p && l.qty > 0) items.push({ pid: p.id, name: p.name, cat: p.cat, price: p.price, qty: l.qty });
    }
    return items;
  }

  function cartChange(pid, delta) {
    const line = state.cart.find((l) => l.pid === pid);
    if (line) {
      line.qty += delta;
      if (line.qty <= 0) state.cart = state.cart.filter((l) => l !== line);
    } else if (delta > 0) {
      state.cart.push({ pid, qty: delta });
    }
    if (!state.cart.length) ui.orderOpen = false;
    save();
    updateBadges(delta > 0 ? pid : null);
    renderOrder();
  }

  function setCartFromItems(items) {
    for (const i of items) {
      if (!prod(i.pid)) continue;
      const line = state.cart.find((l) => l.pid === i.pid);
      if (line) line.qty += i.qty; else state.cart.push({ pid: i.pid, qty: i.qty });
    }
  }

  function addEvent(ev) {
    ev.id = uid();
    ev.ts = Date.now();
    ev.no = ++state.session.counter;
    state.session.events.push(ev);
    return ev;
  }

  function bookCash(given, change) {
    const items = cartItems();
    if (!items.length) return;
    const total = itemsTotal(items);
    const ev = addEvent({ kind: 'cash', items, total, given, change });
    state.cart = [];
    ui.orderOpen = false;
    save();
    renderKasse();
    renderNav();
    const msg = total < 0
      ? `Ausgezahlt: <strong>${fmt(-total)}</strong>`
      : change > 0 ? `Bezahlt · Rückgeld <strong>${fmt(change)}</strong>` : `Bezahlt · <strong>${fmt(total)}</strong> passend`;
    toast(msg, { html: true, action: 'Rückgängig', onAction: () => undoEvent(ev.id, true) });
  }

  function createTab(name) {
    const t = { id: uid(), name: name.trim().slice(0, 40), created: Date.now(), updated: Date.now(), status: 'open', entries: [] };
    state.tabs.push(t);
    return t;
  }

  function bookTab(tab) {
    const items = cartItems();
    if (!items.length || !tab || tab.status !== 'open') return;
    const total = itemsTotal(items);
    const ev = addEvent({ kind: 'tab', tabId: tab.id, tabName: tab.name, items, total });
    tab.entries.push({ eventId: ev.id, sessionId: state.session.id, ts: ev.ts, items, total });
    tab.updated = ev.ts;
    state.cart = [];
    ui.orderOpen = false;
    save();
    renderKasse();
    renderNav();
    toast(`Auf Deckel „${esc(tab.name)}“ · <strong>${fmt(total)}</strong> · gesamt ${fmt(tabTotal(tab))}`, { html: true, action: 'Rückgängig', onAction: () => undoEvent(ev.id, true) });
  }

  function payTab(tab, given, change) {
    if (!tab || tab.status !== 'open') return;
    const total = tabTotal(tab);
    const ev = addEvent({ kind: 'tabpay', tabId: tab.id, tabName: tab.name, total, given, change, entries: tab.entries.length });
    tab.status = 'paid';
    tab.paidAt = ev.ts;
    tab.paymentEventId = ev.id;
    tab.given = given;
    tab.change = change;
    save();
    renderAfterChange();
    const msg = change > 0 ? `Deckel „${esc(tab.name)}“ bezahlt · Rückgeld <strong>${fmt(change)}</strong>` : `Deckel „${esc(tab.name)}“ bezahlt · <strong>${fmt(total)}</strong>`;
    toast(msg, { html: true, action: 'Rückgängig', onAction: () => undoEvent(ev.id, false) });
  }

  /** Macht eine Buchung vollständig rückgängig (direkt nach dem Buchen). */
  function undoEvent(evId, restoreCart) {
    const evs = state.session.events;
    const idx = evs.findIndex((e) => e.id === evId);
    if (idx < 0) return;
    const ev = evs[idx];
    if (ev.kind === 'tab') {
      const tab = tabById(ev.tabId);
      if (tab) {
        if (tab.status !== 'open') { toast('Der Deckel wurde inzwischen bezahlt. Bitte über Abrechnung stornieren.', { error: true }); return; }
        tab.entries = tab.entries.filter((en) => en.eventId !== ev.id);
      }
    }
    if (ev.kind === 'tabpay') reopenTab(ev.tabId);
    evs.splice(idx, 1);
    if (ev.no === state.session.counter) state.session.counter--;
    if (restoreCart && ev.items) setCartFromItems(ev.items);
    save();
    renderAfterChange();
    toast('Buchung rückgängig gemacht');
  }

  function reopenTab(tabId) {
    const tab = tabById(tabId);
    if (!tab) return;
    tab.status = 'open';
    delete tab.paidAt; delete tab.paymentEventId; delete tab.given; delete tab.change;
  }

  /** Storniert eine Buchung der laufenden Abrechnung (bleibt sichtbar, zählt nicht mehr). */
  function voidEvent(evId) {
    const ev = state.session.events.find((e) => e.id === evId);
    if (!ev || ev.voided) return false;
    if (ev.kind === 'tab') {
      const tab = tabById(ev.tabId);
      if (tab && tab.status !== 'open') { toast('Dieser Deckel ist bereits bezahlt. Storniere zuerst die Deckel-Zahlung.', { error: true, ms: 6000 }); return false; }
      if (tab) tab.entries = tab.entries.filter((en) => en.eventId !== ev.id);
    }
    if (ev.kind === 'tabpay') {
      const tab = tabById(ev.tabId);
      if (!tab) { toast('Der zugehörige Deckel existiert nicht mehr.', { error: true }); return false; }
      reopenTab(ev.tabId);
    }
    ev.voided = Date.now();
    save();
    renderAfterChange();
    toast(`Beleg #${ev.no} storniert`);
    return true;
  }

  function voidTabEntry(tab, eventId) {
    const entry = tab.entries.find((en) => en.eventId === eventId);
    if (!entry) return false;
    if (entry.sessionId !== state.session.id) {
      toast('Dieser Eintrag stammt aus einer abgeschlossenen Abrechnung und kann nicht mehr storniert werden.', { error: true, ms: 6000 });
      return false;
    }
    return voidEvent(eventId);
  }

  function deleteTab(tab) {
    const foreign = tab.entries.filter((en) => en.sessionId !== state.session.id);
    if (foreign.length) { toast('Der Deckel enthält Einträge aus einer früheren Abrechnung. Bitte kassieren.', { error: true, ms: 6000 }); return false; }
    for (const en of tab.entries.slice()) {
      const ev = state.session.events.find((e) => e.id === en.eventId);
      if (ev && !ev.voided) ev.voided = Date.now();
    }
    state.tabs = state.tabs.filter((t) => t !== tab);
    save();
    renderAfterChange();
    toast(`Deckel „${esc(tab.name)}“ gelöscht`, { html: true });
    return true;
  }

  function closeSession(newFloat) {
    const s = state.session;
    const open = openTabs();
    s.closedAt = Date.now();
    s.catNames = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
    s.openTabsAtClose = { count: open.length, total: sum(open, tabTotal) };
    state.history.unshift(s);
    state.tabs = state.tabs.filter((t) => t.status === 'open');
    state.session = newSession(newFloat);
    ui.reportId = null;
    ui.journalAll = false;
    save();
    Cloud.pushHistory(s);
    renderAfterChange();
  }

  // ================================================================
  // Auswertung
  // ================================================================
  function computeReport(session) {
    const live = session.events.filter((e) => !e.voided);
    const voided = session.events.filter((e) => e.voided);
    const r = {
      cashSales: 0, tabCharges: 0, tabPayments: 0,
      cashCount: 0, tabCount: 0, tabPayCount: 0,
      voidCount: voided.length,
      voidSum: sum(voided, (e) => (e.kind === 'tabpay' ? 0 : e.total)),
      products: new Map(), itemCount: 0
    };
    for (const e of live) {
      if (e.kind === 'cash') { r.cashSales += e.total; r.cashCount++; }
      else if (e.kind === 'tab') { r.tabCharges += e.total; r.tabCount++; }
      else if (e.kind === 'tabpay') { r.tabPayments += e.total; r.tabPayCount++; }
      if (e.kind === 'cash' || e.kind === 'tab') {
        for (const i of e.items) {
          const key = (i.pid || '') + '|' + i.name + '|' + i.price;
          let row = r.products.get(key);
          if (!row) { row = { name: i.name, cat: i.cat, price: i.price, qty: 0, revenue: 0, cashQty: 0, tabQty: 0 }; r.products.set(key, row); }
          row.qty += i.qty;
          row.revenue += i.qty * i.price;
          if (e.kind === 'cash') row.cashQty += i.qty; else row.tabQty += i.qty;
          r.itemCount += i.qty;
        }
      }
    }
    r.sales = r.cashSales + r.tabCharges;
    r.cashIn = r.cashSales + r.tabPayments;
    r.expected = (session.float || 0) + r.cashIn;
    r.receipts = live.length;

    // nach Kategorie gruppieren, Reihenfolge wie im Sortiment
    const names = session.catNames || null;
    const order = state.categories.map((c) => c.id);
    const groups = new Map();
    for (const row of r.products.values()) {
      if (!groups.has(row.cat)) groups.set(row.cat, []);
      groups.get(row.cat).push(row);
    }
    const prodOrder = (row) => { const i = state.products.findIndex((p) => p.name === row.name); return i < 0 ? 9999 : i; };
    r.groups = Array.from(groups.entries())
      .sort((a, b) => ((order.indexOf(a[0]) + 1) || 999) - ((order.indexOf(b[0]) + 1) || 999))
      .map(([cat, rows]) => ({ cat, name: catName(cat, names), rows: rows.sort((a, b) => prodOrder(a) - prodOrder(b) || b.qty - a.qty), qty: sum(rows, (x) => x.qty), revenue: sum(rows, (x) => x.revenue) }));
    r.maxQty = Math.max(1, ...Array.from(r.products.values()).map((x) => x.qty));
    return r;
  }

  function csvField(v) {
    const s = String(v == null ? '' : v);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function buildCsv(session) {
    const r = computeReport(session);
    const rows = [];
    const add = (...cols) => rows.push(cols.map(csvField).join(';'));
    const end = session.closedAt || Date.now();
    add('Thekenkasse – Abrechnung');
    add('Beginn', fDateTime(session.startedAt));
    add(session.closedAt ? 'Abgeschlossen' : 'Stand', fDateTime(end));
    add('');
    add('Zusammenfassung', 'Betrag (EUR)');
    add('Umsatz gesamt', fmtPlain(r.sales));
    add('davon bar bezahlt', fmtPlain(r.cashSales));
    add('davon auf Deckel geschrieben', fmtPlain(r.tabCharges));
    add('Deckel kassiert (bar)', fmtPlain(r.tabPayments));
    add('Bareinnahmen gesamt', fmtPlain(r.cashIn));
    add('Anfangsbestand Kasse', fmtPlain(session.float || 0));
    add('Kassenbestand Soll', fmtPlain(r.expected));
    if (session.counted != null) {
      add('Kassenbestand gezählt', fmtPlain(session.counted));
      add('Differenz', fmtPlain(session.counted - r.expected));
    }
    if (session.openTabsAtClose) add('Offene Deckel bei Abschluss', fmtPlain(session.openTabsAtClose.total), `${session.openTabsAtClose.count} Deckel`);
    add('Stornierte Belege', r.voidCount);
    add('');
    add('Artikel', 'Kategorie', 'Einzelpreis', 'Menge', 'davon bar', 'davon Deckel', 'Umsatz');
    for (const g of r.groups) for (const row of g.rows) add(row.name, g.name, fmtPlain(row.price), row.qty, row.cashQty, row.tabQty, fmtPlain(row.revenue));
    add('Summe', '', '', r.itemCount, '', '', fmtPlain(r.sales));
    add('');
    add('Beleg', 'Zeit', 'Art', 'Deckel', 'Artikel', 'Menge', 'Einzelpreis', 'Betrag', 'Gegeben', 'Rückgeld', 'Status');
    const kindName = { cash: 'Bar', tab: 'Deckel', tabpay: 'Deckel kassiert' };
    for (const e of session.events) {
      const status = e.voided ? 'storniert' : '';
      const base = [e.no, fTime(e.ts), kindName[e.kind] || e.kind, e.tabName || ''];
      if (e.kind === 'tabpay') {
        add(...base, '', '', '', fmtPlain(e.total), fmtPlain(e.given), fmtPlain(e.change), status);
      } else {
        e.items.forEach((i, n) => {
          add(...base, i.name, i.qty, fmtPlain(i.price), fmtPlain(i.qty * i.price), n === 0 && e.kind === 'cash' ? fmtPlain(e.given) : '', n === 0 && e.kind === 'cash' ? fmtPlain(e.change) : '', status);
        });
      }
    }
    return '﻿' + rows.join('\r\n') + '\r\n';
  }

  function changeBreakdown(cents) {
    const out = [];
    let rest = cents;
    for (const d of CHANGE_DENOMS) {
      const n = Math.floor(rest / d);
      if (n > 0) { out.push([n, d]); rest -= n * d; }
    }
    return out;
  }

  // ================================================================
  // UI-Grundbausteine: Dialoge, Hinweise, Bestätigen
  // ================================================================
  const modals = [];
  let modalSeq = 0;

  function openModal({ title, subtitle = '', body, foot = '', wide = false, full = false, closeOnBackdrop = true, onClose }) {
    const back = document.createElement('div');
    const id = 'mt' + (++modalSeq);
    back.className = 'modal-backdrop' + (full ? ' full' : '');
    back.innerHTML = `<div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="modal-head"><div><h2 id="${id}">${title}</h2>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div>
      <button class="icon-btn" data-action="modal-close" aria-label="Schließen">${ICON.close}</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
    back.addEventListener('click', (e) => { if (e.target === back && closeOnBackdrop) closeModal(); });
    $('#modalRoot').appendChild(back);
    modals.push({ el: back, onClose });
    return back.querySelector('.modal');
  }

  function closeModal() {
    const m = modals.pop();
    if (!m) return;
    m.el.remove();
    if (m.onClose) m.onClose();
  }

  function confirmDialog({ title, text = '', ok = 'OK', danger = false }) {
    return new Promise((resolve) => {
      let done = false;
      const m = openModal({
        title: esc(title),
        body: text ? `<p>${text}</p>` : '',
        foot: `<button class="btn btn-outline" data-m="no">Abbrechen</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-m="yes">${esc(ok)}</button>`,
        onClose: () => { if (!done) resolve(false); }
      });
      m.addEventListener('click', (e) => {
        const b = e.target.closest('[data-m]');
        if (!b) return;
        done = true;
        closeModal();
        resolve(b.dataset.m === 'yes');
      });
    });
  }

  function toast(message, opts = {}) {
    const root = $('#toastRoot');
    const el = document.createElement('div');
    el.className = 'toast' + (opts.error ? ' is-error' : '');
    el.setAttribute('role', opts.error ? 'alert' : 'status');
    el.innerHTML = `<p>${opts.html ? message : esc(message)}</p>${opts.action ? `<button type="button">${esc(opts.action)}</button>` : ''}`;
    const remove = () => { if (el.isConnected) el.remove(); };
    if (opts.action) el.querySelector('button').addEventListener('click', () => { remove(); opts.onAction && opts.onAction(); });
    root.prepend(el);
    while (root.children.length > 2) root.lastElementChild.remove();
    setTimeout(remove, opts.ms || (opts.action ? 6000 : 3200));
  }

  /** Zweistufige Bestätigung direkt am Knopf: erster Tipp „Sicher?“, zweiter Tipp führt aus. */
  function armed(el) {
    if (!el.hasAttribute('data-arm')) return true;
    if (el.dataset.armed) return true;
    el.dataset.armed = '1';
    el._label = el.innerHTML;
    el.innerHTML = esc(el.dataset.arm || 'Sicher?');
    clearTimeout(el._armTimer);
    el._armTimer = setTimeout(() => {
      if (el.isConnected) { delete el.dataset.armed; el.innerHTML = el._label; }
    }, 3000);
    return false;
  }

  // ================================================================
  // Geld-Grafiken (stilisiert)
  // ================================================================
  const NOTE_COLORS = { 500: ['#7F8F86', '#B4C2BA'], 1000: ['#C04E47', '#E9A49D'], 2000: ['#3A66A8', '#93B3E0'], 5000: ['#D27A22', '#F3BE83'], 10000: ['#3B8A55', '#93CFA5'] };
  function noteSvg(c) {
    const [a, b] = NOTE_COLORS[c];
    return `<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="1" y="1" width="118" height="62" rx="6" fill="${a}"/>
      <rect x="5.5" y="5.5" width="109" height="53" rx="3" fill="none" stroke="${b}" stroke-width="1.4"/>
      <circle cx="90" cy="32" r="17" fill="${b}" opacity=".5"/><path d="M77 44 Q90 12 103 44" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>
      <text x="12" y="39" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" fill="#fff">${c / 100}</text>
      <text x="13" y="52" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" letter-spacing="1.6" fill="#fff" opacity=".9">EURO</text></svg>`;
  }
  function coinSvg(c) {
    const gold = '#D6A93C', goldDark = '#A97D1E', silver = '#CDD1D6', silverDark = '#959BA3';
    const bi = c >= 100;
    const outer = c === 200 ? silver : gold;
    const outerDark = c === 200 ? silverDark : goldDark;
    const inner = c === 200 ? gold : c === 100 ? silver : gold;
    const label = c >= 100 ? c / 100 : c;
    const unit = c >= 100 ? 'EURO' : 'CENT';
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30.5" fill="${outer}" stroke="${outerDark}" stroke-width="1.5"/>
      ${bi ? `<circle cx="32" cy="32" r="21" fill="${inner}" stroke="${outerDark}" stroke-opacity=".5"/>` : `<circle cx="32" cy="32" r="25" fill="none" stroke="${outerDark}" stroke-opacity=".45" stroke-dasharray="1.5 2.5"/>`}
      <text x="32" y="${c >= 100 ? 38 : 37}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${c >= 100 ? 21 : 19}" font-weight="700" fill="#3A2A06">${label}</text>
      <text x="32" y="48" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="6.5" font-weight="700" letter-spacing="1" fill="#3A2A06" opacity=".8">${unit}</text></svg>`;
  }

  // ================================================================
  // Navigation
  // ================================================================
  function show(view) {
    if (!VIEWS.includes(view)) view = 'kasse';
    ui.view = view;
    for (const s of $$('.view')) {
      const on = s.dataset.name === view;
      s.hidden = !on;
      s.classList.toggle('is-active', on);
    }
    for (const a of $$('[data-nav]')) a.setAttribute('aria-current', a.dataset.nav === view ? 'page' : 'false');
    renderView(view);
  }

  function routeFromHash() {
    const v = (location.hash || '').replace('#', '');
    show(VIEWS.includes(v) ? v : 'kasse');
  }

  function go(view) {
    show(view);
    try { if (location.hash !== '#' + view) location.hash = view; } catch (e) { /* ohne Hash-Navigation */ }
  }

  function renderNav() {
    const n = openTabs().length;
    const b = $('#navTabBadge');
    b.hidden = n === 0;
    b.textContent = n;
  }

  function renderView(v) {
    renderNav();
    if (v === 'kasse') renderKasse();
    else if (v === 'deckel') renderDeckel();
    else if (v === 'abrechnung') renderReport();
    else if (v === 'sortiment') renderSortiment();
  }

  function renderAfterChange() { renderView(ui.view); }

  // ================================================================
  // Ansicht: Kasse
  // ================================================================
  function groupedProducts(onlyActive) {
    const groups = state.categories.map((c) => ({ cat: c, items: state.products.filter((p) => p.cat === c.id && (!onlyActive || p.active)) }));
    const known = new Set(state.categories.map((c) => c.id));
    const orphans = state.products.filter((p) => !known.has(p.cat) && (!onlyActive || p.active));
    if (orphans.length) groups.push({ cat: { id: '__other', name: 'Sonstiges' }, items: orphans });
    return groups;
  }

  function renderKasse() {
    const groups = groupedProducts(true).filter((g) => g.items.length);
    if (ui.cat !== 'all' && !groups.some((g) => g.cat.id === ui.cat)) ui.cat = 'all';

    const chips = $('#catChips');
    chips.hidden = groups.length < 2;
    chips.innerHTML = [`<button class="chip" data-action="cat" data-id="all" aria-pressed="${ui.cat === 'all'}">Alle</button>`]
      .concat(groups.map((g) => `<button class="chip" data-action="cat" data-id="${esc(g.cat.id)}" aria-pressed="${ui.cat === g.cat.id}">${esc(g.cat.name)}</button>`))
      .join('');

    $('#sampleHint').innerHTML = state.meta.sampleHint
      ? `<div class="hint"><p>Das ist ein Beispiel-Sortiment. Passe Artikel und Preise unter <strong>Sortiment</strong> an.${(IS_LOCAL_FILE || NATIVE) && !restoredFromStorage ? ' Tipp: Schließe die App einmal und öffne sie neu. Unter Sortiment → Daten siehst du dann, ob deine Daten erhalten bleiben.' : ''}</p>
         <button class="btn btn-sm btn-outline" data-action="goto" data-id="sortiment">Sortiment</button>
         <button class="icon-btn" data-action="dismiss-hint" aria-label="Hinweis ausblenden">${ICON.close}</button></div>`
      : '';

    const shown = ui.cat === 'all' ? groups : groups.filter((g) => g.cat.id === ui.cat);
    const titles = shown.length > 1;
    let html = '';
    for (const g of shown) {
      if (titles) html += `<h3 class="grid-title">${esc(g.cat.name)}</h3>`;
      for (const p of g.items) {
        html += `<button class="tile tc-${p.color}" data-action="add" data-id="${p.id}" aria-label="${esc(p.name)}, ${fmt(p.price)}">
          <span class="tile-name">${nb(p.name)}</span><span class="tile-price">${fmt(p.price)}</span><span class="tile-qty" hidden></span></button>`;
      }
    }
    if (!html) {
      html = `<div class="empty-state" style="grid-column:1/-1"><p>Auf der Kasse sind noch keine Artikel sichtbar.</p>
        <button class="btn btn-primary" data-action="goto" data-id="sortiment">Sortiment einrichten</button></div>`;
    }
    $('#productGrid').innerHTML = html;
    updateBadges();
    renderOrder();
  }

  function updateBadges(popId) {
    const q = {};
    for (const l of state.cart) q[l.pid] = l.qty;
    for (const el of $$('#productGrid .tile')) {
      const n = q[el.dataset.id] || 0;
      const b = el.querySelector('.tile-qty');
      b.hidden = !n;
      b.textContent = n;
      el.classList.toggle('in-cart', n > 0);
      if (popId && el.dataset.id === popId) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    }
  }

  function renderOrder() {
    const el = $('#orderPanel');
    const items = cartItems();
    const total = itemsTotal(items);
    const count = itemsCount(items);
    el.classList.toggle('is-empty', items.length === 0);
    el.classList.toggle('is-open', ui.orderOpen && items.length > 0);
    const lines = items.map((i) => `<li class="line">
        <div class="line-info"><span class="line-name">${esc(i.name)}</span><span class="line-unit">${fmt(i.price)}</span></div>
        <div class="stepper"><button data-action="dec" data-id="${i.pid}" aria-label="${esc(i.name)} entfernen">−</button><span class="stepper-n">${i.qty}</span><button data-action="inc" data-id="${i.pid}" aria-label="${esc(i.name)} hinzufügen">+</button></div>
        <span class="line-sum">${fmt(i.price * i.qty)}</span></li>`).join('');
    el.innerHTML = `
      <div class="order-head">
        <button class="order-toggle" data-action="toggle-order" aria-expanded="${ui.orderOpen}">
          <span class="order-title">Bestellung</span>
          <span class="order-count">${count ? plural(count, 'Artikel', 'Artikel') : 'leer'}</span>${count ? ICON.chevron : ''}
        </button>
        <button class="link-btn" data-action="clear-cart" ${items.length ? '' : 'disabled'}>Leeren</button>
      </div>
      <ul class="order-lines">${lines}</ul>
      <p class="order-empty">Tippe auf eine Kachel, um sie zur Bestellung hinzuzufügen.</p>
      <div class="order-foot">
        <div class="order-total"><span>Summe</span><output class="tabular">${fmt(total)}</output></div>
        <div class="order-actions">
          <button class="btn btn-coaster" data-action="to-tab" ${items.length ? '' : 'disabled'}>${ICON.coaster}Auf Deckel</button>
          <button class="btn btn-primary" data-action="pay-cash" ${items.length ? '' : 'disabled'}>${ICON.cash}Bar kassieren</button>
        </div>
      </div>`;
  }

  // ================================================================
  // Dialog: Barzahlung mit Rückgeld
  // ================================================================
  function openPayment({ title, subtitle, total, onConfirm }) {
    const pay = { parts: [], str: '' };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'];
    const m = openModal({
      title, subtitle, wide: true, full: true, closeOnBackdrop: false,
      body: `<div class="pay">
        <div class="pay-summary">
          <div class="pay-figure"><span class="label">Zu zahlen</span><span class="value">${fmt(total)}</span></div>
          <div class="pay-figure pay-given"><span class="label">Gegeben</span><span class="value" data-k="given">–</span><span class="sub" data-k="given-sub"></span>
            <button class="icon-btn clear" data-m="clear" aria-label="Eingabe löschen">${ICON.close}</button></div>
          <div class="pay-figure pay-change" data-k="change-box"><span class="label" data-k="change-label">Rückgeld</span><span class="value" data-k="change">–</span><div class="sub denoms" data-k="denoms"></div></div>
        </div>
        <div class="pay-input">
          <div class="money-row" role="group" aria-label="Geldscheine">${NOTES.map((c) => `<button class="money-btn note" data-m="money" data-v="${c}" aria-label="${fmtDenom(c)}-Schein">${noteSvg(c)}<span class="count" hidden></span></button>`).join('')}</div>
          <div class="money-row" role="group" aria-label="Münzen">${COINS.map((c) => `<button class="money-btn coin" data-m="money" data-v="${c}" aria-label="${fmtDenom(c)}-Münze">${coinSvg(c)}<span class="count" hidden></span></button>`).join('')}</div>
          <div class="keypad" role="group" aria-label="Betrag eintippen">${keys.map((k) => k === 'back'
            ? `<button class="key" data-m="key" data-v="back" aria-label="Letzte Eingabe löschen">${ICON.backspace}</button>`
            : `<button class="key" data-m="key" data-v="${k}">${k}</button>`).join('')}</div>
        </div>
      </div>`,
      foot: `<button class="btn btn-outline btn-lg" data-action="modal-close">Abbrechen</button><button class="btn btn-primary btn-lg" style="flex:2 1 auto" data-m="confirm"></button>`,
      onClose: () => document.removeEventListener('keydown', onKey, true)
    });

    const given = () => (pay.str !== '' ? Math.max(0, parseMoney(pay.str) || 0) : sum(pay.parts, (x) => x));
    const k = (name) => m.querySelector(`[data-k="${name}"]`);
    const confirmBtn = m.querySelector('[data-m="confirm"]');

    function partsLabel() {
      const counts = new Map();
      for (const p of pay.parts) counts.set(p, (counts.get(p) || 0) + 1);
      return Array.from(counts.entries()).map(([v, n]) => {
        const label = NOTES.includes(v) || COINS.includes(v) ? fmtDenom(v) : fmt(v);
        return n > 1 ? `${n} × ${label}` : label;
      }).join(' + ');
    }

    function update() {
      const g = given();
      const entered = pay.str !== '' || pay.parts.length > 0;
      k('given').textContent = entered ? fmt(g) : '–';
      k('given-sub').textContent = pay.str !== '' ? 'eingetippt' : pay.parts.length ? partsLabel() : 'Schein antippen oder Betrag tippen';
      const box = k('change-box');
      const missing = entered && g < total;
      box.classList.toggle('is-missing', missing);
      if (!entered) {
        k('change-label').textContent = 'Rückgeld';
        k('change').textContent = '–';
        k('denoms').innerHTML = '';
      } else if (missing) {
        k('change-label').textContent = 'Es fehlen';
        k('change').textContent = fmt(total - g);
        k('denoms').innerHTML = '';
      } else {
        const ch = g - total;
        k('change-label').textContent = 'Rückgeld';
        k('change').textContent = fmt(ch);
        k('denoms').innerHTML = ch > 0 ? changeBreakdown(ch).map(([n, d]) => `<span class="denom">${n}× ${fmtDenom(d)}</span>`).join('') : '<span class="denom">passend</span>';
      }
      if (!entered) { confirmBtn.disabled = false; confirmBtn.innerHTML = `${ICON.check}Passend erhalten`; }
      else if (missing) { confirmBtn.disabled = true; confirmBtn.textContent = `Es fehlen ${fmt(total - g)}`; }
      else { confirmBtn.disabled = false; confirmBtn.innerHTML = `${ICON.check}Bezahlt${g - total > 0 ? ` · ${fmt(g - total)} zurück` : ''}`; }
      const counts = {};
      for (const p of pay.parts) counts[p] = (counts[p] || 0) + 1;
      for (const b of m.querySelectorAll('[data-m="money"]')) {
        const n = counts[b.dataset.v] || 0;
        const c = b.querySelector('.count');
        c.hidden = !n; c.textContent = n;
      }
    }

    function press(v) {
      if (v === 'back') {
        if (pay.str !== '') pay.str = pay.str.slice(0, -1);
        else pay.parts.pop();
      } else if (v === ',') {
        if (pay.parts.length) pay.parts = [];
        if (!pay.str.includes(',')) pay.str = (pay.str || '0') + ',';
      } else {
        if (pay.parts.length) pay.parts = [];
        const [int, dec] = pay.str.split(',');
        if (dec !== undefined && dec.length >= 2) return update();
        if (dec === undefined && int.replace(/^0+/, '').length >= 5) return update();
        pay.str = pay.str === '0' ? v : pay.str + v;
      }
      update();
    }

    function money(v) {
      if (pay.str !== '') { const cur = parseMoney(pay.str); pay.parts = cur > 0 ? [cur] : []; pay.str = ''; }
      pay.parts.push(v);
      update();
    }

    function confirm() {
      if (confirmBtn.disabled) return;
      const entered = pay.str !== '' || pay.parts.length > 0;
      const g = entered ? given() : total;
      closeModal();
      onConfirm(g, g - total);
    }

    function onKey(e) {
      if (modals.length === 0 || modals[modals.length - 1].el !== m.parentElement) return;
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === ',' || e.key === '.') { press(','); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
      else if (e.key === 'Enter') { confirm(); e.preventDefault(); }
    }
    document.addEventListener('keydown', onKey, true);

    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const a = b.dataset.m;
      if (a === 'money') money(Number(b.dataset.v));
      else if (a === 'key') press(b.dataset.v);
      else if (a === 'clear') { pay.parts = []; pay.str = ''; update(); }
      else if (a === 'confirm') confirm();
    });
    update();
  }

  function startCashPayment() {
    const items = cartItems();
    if (!items.length) return;
    const total = itemsTotal(items);
    if (total <= 0) { bookCash(0, -total); return; }
    openPayment({
      title: 'Barzahlung',
      subtitle: `${plural(itemsCount(items), 'Artikel', 'Artikel')} · ${esc(itemsText(items))}`,
      total,
      onConfirm: (given, change) => bookCash(given, change)
    });
  }

  // ================================================================
  // Dialog: Auf Deckel schreiben
  // ================================================================
  function openTabPicker() {
    const items = cartItems();
    if (!items.length) return;
    const total = itemsTotal(items);
    const tabs = openTabs().sort((a, b) => (b.updated || 0) - (a.updated || 0));
    const m = openModal({
      title: 'Auf Deckel schreiben',
      subtitle: `${plural(itemsCount(items), 'Artikel', 'Artikel')} · ${fmt(total)}`,
      body: `<form class="row" data-k="form" autocomplete="off">
          <input class="input" id="tabNameInput" name="name" maxlength="40" placeholder="${tabs.length ? 'Name suchen oder neu anlegen' : 'Name für den neuen Deckel'}" enterkeyhint="done" aria-label="Name">
          <button class="btn btn-coaster" type="submit">${ICON.plus}Neuer Deckel</button>
        </form>
        <div class="picker-grid" data-k="list"></div>`
    });
    const input = m.querySelector('#tabNameInput');
    const list = m.querySelector('[data-k="list"]');
    function renderList() {
      const q = input.value.trim().toLowerCase();
      const shown = tabs.filter((t) => !q || t.name.toLowerCase().includes(q));
      list.innerHTML = shown.length
        ? shown.map((t) => `<button class="picker-btn" data-tab="${t.id}"><strong>${esc(t.name)}</strong><span>${fmt(tabTotal(t))} · ${plural(tabItemCount(t), 'Strich', 'Striche')}</span></button>`).join('')
        : `<p class="muted" style="grid-column:1/-1">${tabs.length ? 'Kein offener Deckel mit diesem Namen. Mit „Neuer Deckel“ anlegen.' : 'Noch keine offenen Deckel. Gib einen Namen ein, um den ersten anzulegen.'}</p>`;
    }
    input.addEventListener('input', renderList);
    m.querySelector('[data-k="form"]').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const existing = openTabs().find((t) => t.name.toLowerCase() === name.toLowerCase());
      const tab = existing || createTab(name);
      closeModal();
      bookTab(tab);
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      closeModal();
      bookTab(tabById(b.dataset.tab));
    });
    renderList();
    if (!tabs.length) setTimeout(() => input.focus(), 60);
  }

  // ================================================================
  // Ansicht: Deckel
  // ================================================================
  function jitter(i) {
    const r = (k) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    return [r(1) * 0.9, r(2) * 1.4, r(3) * 0.8];
  }

  function tallySvg(n) {
    const shown = Math.min(n, 30);
    const groups = Math.ceil(shown / 5);
    const perRow = 3;
    const rows = Math.max(1, Math.ceil(groups / perRow));
    let d = '';
    for (let g = 0; g < groups; g++) {
      const gx = (g % perRow) * 31 + 4;
      const gy = Math.floor(g / perRow) * 28 + 4;
      const inGroup = Math.min(5, shown - g * 5);
      for (let i = 0; i < Math.min(4, inGroup); i++) {
        const j = jitter(g * 5 + i);
        const x = gx + 2 + i * 5.5;
        d += `M${(x + j[0]).toFixed(1)} ${(gy + j[1]).toFixed(1)}L${(x - j[0] * 0.6 + j[2]).toFixed(1)} ${(gy + 20 - j[1]).toFixed(1)}`;
      }
      if (inGroup === 5) d += `M${gx - 2} ${gy + 16}L${gx + 23} ${gy + 4}`;
    }
    const w = Math.min(groups, perRow) * 31 + 6;
    return `<svg class="coaster-tally" viewBox="0 0 ${w} ${rows * 28 + 2}" style="width:${Math.round((w / 99) * 78)}%" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>`;
  }

  function renderDeckel() {
    const view = $('#view-deckel');
    const open = openTabs().sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const paid = state.tabs.filter((t) => t.status === 'paid').sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0));
    const coasters = open.map((t) => {
      const n = tabItemCount(t);
      return `<button class="coaster" data-action="open-tab" data-id="${t.id}" aria-label="Deckel ${esc(t.name)}, ${fmt(tabTotal(t))}">
        <span class="coaster-name">${esc(t.name)}</span>
        ${n ? tallySvg(n) : '<span class="coaster-empty">noch leer</span>'}
        ${n > 30 ? `<span class="coaster-more">+${n - 30} weitere</span>` : ''}
        <span class="coaster-total">${fmt(tabTotal(t))}</span></button>`;
    }).join('');
    view.innerHTML = `<div class="view-inner">
      <div class="view-head">
        <div><h1>Deckel</h1><p class="muted">${open.length ? `${plural(open.length, 'offener Deckel', 'offene Deckel')} · ${fmt(sum(open, tabTotal))}` : 'Keine offenen Deckel'}</p></div>
        <div class="head-actions"><button class="btn btn-coaster" data-action="new-tab">${ICON.plus}Neuer Deckel</button></div>
      </div>
      ${open.length ? `<div class="coasters">${coasters}</div>` : `<div class="empty-state"><p>Wer nicht sofort zahlt, bekommt einen Deckel: In der Kasse die Bestellung zusammenstellen und „Auf Deckel“ wählen.</p></div>`}
      ${paid.length ? `<section class="section"><div class="section-head"><h2>Bezahlt in dieser Abrechnung</h2><span class="muted">${fmt(sum(paid, tabTotal))}</span></div>
        <ul class="list card" style="padding-block:0">${paid.map((t) => `<li class="list-row"><div class="grow"><strong>${esc(t.name)}</strong><span class="meta">bezahlt ${fTime(t.paidAt)} · ${plural(t.entries.length, 'Bestellung', 'Bestellungen')}</span></div>
          <span class="amount">${fmt(tabTotal(t))}</span><button class="btn btn-sm btn-outline" data-action="open-tab" data-id="${t.id}">Ansehen</button></li>`).join('')}</ul></section>` : ''}
    </div>`;
  }

  function openNewTabDialog() {
    const m = openModal({
      title: 'Neuer Deckel',
      body: `<form data-k="form" autocomplete="off" class="field"><span>Name</span><input class="input" id="newTabName" maxlength="40" placeholder="z. B. Max oder Tisch 4" enterkeyhint="done"><p class="form-error" data-k="err"></p></form>`,
      foot: `<button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-coaster" data-m="ok">Deckel anlegen</button>`
    });
    const input = m.querySelector('#newTabName');
    const submit = () => {
      const name = input.value.trim();
      if (!name) { m.querySelector('[data-k="err"]').textContent = 'Bitte einen Namen eingeben.'; input.focus(); return; }
      if (openTabs().some((t) => t.name.toLowerCase() === name.toLowerCase())) { m.querySelector('[data-k="err"]').textContent = 'Es gibt bereits einen offenen Deckel mit diesem Namen.'; return; }
      createTab(name);
      save();
      closeModal();
      renderAfterChange();
      toast(`Deckel „${esc(name)}“ angelegt`, { html: true });
    };
    m.querySelector('[data-k="form"]').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    m.querySelector('[data-m="ok"]').addEventListener('click', submit);
    setTimeout(() => input.focus(), 60);
  }

  function openTabDetail(id) {
    const tab = tabById(id);
    if (!tab) return;
    const isOpen = tab.status === 'open';
    const total = tabTotal(tab);
    const entries = tab.entries.slice().sort((a, b) => b.ts - a.ts);
    const m = openModal({
      title: `Deckel „${esc(tab.name)}“`,
      subtitle: isOpen ? `angelegt ${fTime(tab.created)} · ${plural(tab.entries.length, 'Bestellung', 'Bestellungen')}` : `bezahlt ${fTime(tab.paidAt)}${tab.given ? ` · gegeben ${fmt(tab.given)} · Rückgeld ${fmt(tab.change || 0)}` : ''}`,
      body: `<div class="tab-total"><span>${isOpen ? 'Offener Betrag' : 'Bezahlt'}</span><strong>${fmt(total)}</strong></div>
        ${entries.length ? `<ul class="list">${entries.map((en) => `<li class="list-row">
          <div class="grow"><span>${esc(itemsText(en.items))}</span><span class="meta">${fTime(en.ts)}${en.sessionId !== state.session.id ? ' · aus früherer Abrechnung' : ''}</span></div>
          <span class="amount">${fmt(en.total)}</span>
          ${isOpen ? `<button class="btn btn-sm btn-outline" data-m="void" data-id="${en.eventId}" data-arm="Wirklich stornieren?">Storno</button>` : ''}</li>`).join('')}</ul>`
        : '<p class="muted">Noch keine Bestellungen auf diesem Deckel.</p>'}`,
      foot: isOpen
        ? `<button class="btn btn-outline" data-m="rename">Umbenennen</button><button class="btn btn-danger" data-m="delete" data-arm="${tab.entries.length ? 'Alles stornieren & löschen?' : 'Wirklich löschen?'}">Löschen</button><span class="spacer"></span>
           <button class="btn btn-primary btn-lg" data-m="pay" ${tab.entries.length ? '' : 'disabled'}>${ICON.cash}Kassieren · ${fmt(total)}</button>`
        : `<button class="btn btn-outline btn-block" data-action="modal-close">Schließen</button>`
    });
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b || !armed(b)) return;
      const a = b.dataset.m;
      if (a === 'void') {
        if (voidTabEntry(tab, b.dataset.id)) { closeModal(); openTabDetail(tab.id); }
      } else if (a === 'delete') {
        if (deleteTab(tab)) closeModal();
      } else if (a === 'rename') {
        closeModal();
        openRenameTab(tab);
      } else if (a === 'pay') {
        closeModal();
        if (total <= 0) { payTab(tab, 0, -total); return; }
        openPayment({
          title: `Deckel „${esc(tab.name)}“ kassieren`,
          subtitle: `${plural(tab.entries.length, 'Bestellung', 'Bestellungen')} · ${plural(tabItemCount(tab), 'Artikel', 'Artikel')}`,
          total,
          onConfirm: (given, change) => payTab(tab, given, change)
        });
      }
    });
  }

  function openRenameTab(tab) {
    const m = openModal({
      title: 'Deckel umbenennen',
      body: `<form data-k="form" class="field" autocomplete="off"><span>Name</span><input class="input" id="renameTab" maxlength="40" value="${esc(tab.name)}" enterkeyhint="done"></form>`,
      foot: `<button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="ok">Speichern</button>`
    });
    const input = m.querySelector('#renameTab');
    const submit = () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      tab.name = name.slice(0, 40);
      save();
      closeModal();
      renderAfterChange();
      openTabDetail(tab.id);
    };
    m.querySelector('[data-k="form"]').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    m.querySelector('[data-m="ok"]').addEventListener('click', submit);
  }

  // ================================================================
  // Ansicht: Abrechnung
  // ================================================================
  function renderReport() {
    const view = $('#view-abrechnung');
    const archived = ui.reportId ? state.history.find((h) => h.id === ui.reportId) : null;
    if (ui.reportId && !archived) ui.reportId = null;
    const s = archived || state.session;
    const r = computeReport(s);
    const open = openTabs();
    const openInfo = archived ? (s.openTabsAtClose || { count: 0, total: 0 }) : { count: open.length, total: sum(open, tabTotal) };
    const kindLabel = { cash: ['Bar', 'pill-cash'], tab: ['Deckel', 'pill-tab'], tabpay: ['Deckel bezahlt', 'pill-tabpay'] };

    const events = s.events.slice().reverse();
    const shownEvents = ui.journalAll ? events : events.slice(0, 40);
    const journal = shownEvents.map((e) => {
      const [label, cls] = kindLabel[e.kind] || [e.kind, ''];
      let desc = e.kind === 'tabpay' ? `Deckel „${esc(e.tabName)}“ kassiert` : esc(itemsText(e.items));
      if (e.kind === 'tab') desc = `<strong>${esc(e.tabName)}:</strong> ${desc}`;
      if ((e.kind === 'cash' || e.kind === 'tabpay') && e.given) desc += `<br><span class="muted">gegeben ${fmt(e.given)} · zurück ${fmt(e.change)}</span>`;
      return `<li class="jrow${e.voided ? ' is-void' : ''}">
        <span class="jno">#${e.no}</span><span class="jtime">${fTime(e.ts)}</span>
        <span class="pill ${e.voided ? 'pill-void' : cls}">${e.voided ? 'storniert' : label}</span>
        <span class="jdesc">${desc}</span><span class="jamt">${fmt(e.total)}</span>
        <span class="jact">${!archived && !e.voided ? `<button class="btn btn-sm btn-ghost" data-action="void" data-id="${e.id}" data-arm="Stornieren?">Storno</button>` : ''}</span></li>`;
    }).join('');

    const table = r.groups.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Artikel</th><th class="num">Preis</th><th class="num">Menge</th><th class="num">Umsatz</th></tr></thead>
        <tbody>${r.groups.map((g) => `
          <tr class="group"><th colspan="4">${esc(g.name)}</th></tr>
          ${g.rows.map((row) => `<tr><td>${esc(row.name)}${row.tabQty ? ` <span class="muted">(${row.tabQty} auf Deckel)</span>` : ''}<span class="qbar"><i style="width:${Math.round((row.qty / r.maxQty) * 100)}%"></i></span></td>
            <td class="num">${fmt(row.price)}</td><td class="num">${row.qty}</td><td class="num">${fmt(row.revenue)}</td></tr>`).join('')}
          ${r.groups.length > 1 ? `<tr class="subtotal"><td>Summe ${esc(g.name)}</td><td></td><td class="num">${g.qty}</td><td class="num">${fmt(g.revenue)}</td></tr>` : ''}`).join('')}
        </tbody>
        <tfoot><tr><td>Gesamt</td><td></td><td class="num">${r.itemCount}</td><td class="num">${fmt(r.sales)}</td></tr></tfoot>
      </table></div>` : `<div class="card empty-state"><p>Noch nichts verkauft.</p></div>`;

    const counted = s.counted;
    const diff = counted == null ? null : counted - r.expected;
    const diffHtml = diff == null ? '–' : `<span class="${diff === 0 ? '' : diff > 0 ? 'diff-pos' : 'diff-neg'}">${diff > 0 ? '+' : ''}${fmt(diff)}</span>`;

    const history = state.history.map((h) => {
      const hr = computeReport(h);
      return `<li class="list-row"><div class="grow"><strong>${fDateTime(h.startedAt)}</strong><span class="meta">bis ${fDateTime(h.closedAt)} · ${plural(hr.receipts, 'Beleg', 'Belege')}</span></div>
        <span class="amount">${fmt(hr.sales)}</span>
        <button class="btn btn-sm btn-outline" data-action="view-report" data-id="${h.id}">Ansehen</button>
        <button class="btn btn-sm btn-ghost" data-action="delete-history" data-id="${h.id}" data-arm="Löschen?">Löschen</button></li>`;
    }).join('');

    view.innerHTML = `<div class="view-inner">
      <div class="view-head">
        <div><h1>${archived ? 'Abrechnung (Archiv)' : 'Abrechnung'}</h1>
          <p class="muted">${archived ? `${fDateTime(s.startedAt)} bis ${fDateTime(s.closedAt)}` : `seit ${fDateTime(s.startedAt)}`} · ${plural(r.receipts, 'Beleg', 'Belege')}${r.voidCount ? ` · ${r.voidCount} storniert` : ''}</p></div>
        <div class="head-actions">
          <button class="btn btn-outline" data-action="export-csv">CSV exportieren</button>
          ${NATIVE || (!FRAMED && typeof window.print === 'function') ? '<button class="btn btn-outline" data-action="print">Drucken</button>' : ''}
          ${archived ? '<button class="btn btn-primary" data-action="view-report" data-id="">Zur laufenden Abrechnung</button>'
            : `<button class="btn btn-primary" data-action="close-session" ${s.events.length ? '' : 'disabled'}>Abend abschließen</button>`}
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><span class="kpi-label">Umsatz gesamt</span><span class="kpi-value">${fmt(r.sales)}</span><span class="kpi-sub">bar ${fmt(r.cashSales)} · Deckel ${fmt(r.tabCharges)}</span></div>
        <div class="kpi kpi-accent"><span class="kpi-label">Bareinnahmen</span><span class="kpi-value">${fmt(r.cashIn)}</span><span class="kpi-sub">inkl. kassierter Deckel ${fmt(r.tabPayments)}</span></div>
        <div class="kpi kpi-coaster"><span class="kpi-label">${archived ? 'Offen bei Abschluss' : 'Offene Deckel'}</span><span class="kpi-value">${fmt(openInfo.total)}</span><span class="kpi-sub">${plural(openInfo.count, 'Deckel', 'Deckel')}</span></div>
        <div class="kpi"><span class="kpi-label">Kasse Soll</span><span class="kpi-value">${fmt(r.expected)}</span>
          <span class="kpi-sub">Anfangsbestand ${archived ? fmt(s.float || 0) : `<button class="link-btn" style="padding:0" data-action="edit-float">${fmt(s.float || 0)}</button>`}</span></div>
      </div>
      <section class="card">
        <div class="section-head"><h2>Kassensturz</h2><span class="muted">Bargeld zählen und mit dem Soll vergleichen</span></div>
        <div class="cash-count">
          ${archived ? `<div class="figure"><span class="muted">Gezählt</span><strong>${counted == null ? '–' : fmt(counted)}</strong></div>`
            : `<label class="field"><span>Gezählt</span><input class="input" id="countedInput" inputmode="decimal" placeholder="Betrag in €" value="${counted == null ? '' : fmtPlain(counted)}"></label>`}
          <div class="figure"><span class="muted">Soll</span><strong>${fmt(r.expected)}</strong></div>
          <div class="figure"><span class="muted">Differenz</span><strong data-k="diff">${diffHtml}</strong></div>
        </div>
      </section>
      <section class="section"><div class="section-head"><h2>Verkaufte Artikel</h2><span class="muted">${plural(r.itemCount, 'Artikel', 'Artikel')}</span></div>${table}</section>
      <section class="section"><div class="section-head"><h2>Belege</h2><span class="muted">neueste zuerst</span></div>
        ${events.length ? `<ul class="journal">${journal}</ul>${events.length > shownEvents.length ? `<button class="btn btn-outline" data-action="journal-all">Alle ${events.length} Belege anzeigen</button>` : ''}` : '<div class="card empty-state"><p>Noch keine Buchungen.</p></div>'}
      </section>
      ${state.history.length ? `<section class="section no-print"><div class="section-head"><h2>Frühere Abrechnungen</h2></div><ul class="list card" style="padding-block:0">${history}</ul></section>` : ''}
    </div>`;

    const ci = $('#countedInput');
    if (ci) {
      const apply = (commit) => {
        const v = ci.value.trim() === '' ? null : parseMoney(ci.value);
        if (v !== null && Number.isNaN(v)) return;
        const d = v == null ? null : v - r.expected;
        $('[data-k="diff"]', view).innerHTML = d == null ? '–' : `<span class="${d === 0 ? '' : d > 0 ? 'diff-pos' : 'diff-neg'}">${d > 0 ? '+' : ''}${fmt(d)}</span>`;
        if (commit) { state.session.counted = v; save(); }
      };
      ci.addEventListener('input', () => apply(false));
      ci.addEventListener('change', () => apply(true));
    }
  }

  function openFloatEditor() {
    const m = openModal({
      title: 'Anfangsbestand',
      subtitle: 'Wechselgeld in der Kasse zu Beginn',
      body: `<form data-k="form" class="field" autocomplete="off"><span>Betrag in €</span><input class="input" id="floatInput" inputmode="decimal" value="${state.session.float ? fmtPlain(state.session.float) : ''}" placeholder="z. B. 100"><p class="form-error" data-k="err"></p></form>`,
      foot: `<button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="ok">Speichern</button>`
    });
    const input = m.querySelector('#floatInput');
    const submit = () => {
      const v = input.value.trim() === '' ? 0 : parseMoney(input.value);
      if (Number.isNaN(v) || v < 0) { m.querySelector('[data-k="err"]').textContent = 'Bitte einen gültigen Betrag eingeben.'; return; }
      state.session.float = v;
      save();
      closeModal();
      renderAfterChange();
    };
    m.querySelector('[data-k="form"]').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    m.querySelector('[data-m="ok"]').addEventListener('click', submit);
    setTimeout(() => input.select(), 60);
  }

  function openCloseSession() {
    const r = computeReport(state.session);
    const open = openTabs();
    const m = openModal({
      title: 'Abend abschließen',
      body: `<p>Die laufende Abrechnung wird archiviert und eine neue begonnen. Du findest sie danach unter „Frühere Abrechnungen“.</p>
        <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="kpi"><span class="kpi-label">Umsatz</span><span class="kpi-value">${fmt(r.sales)}</span></div>
          <div class="kpi kpi-accent"><span class="kpi-label">Kasse Soll</span><span class="kpi-value">${fmt(r.expected)}</span></div>
        </div>
        ${open.length ? `<p class="hint" style="margin:0;background:var(--coaster-soft);color:var(--coaster-ink)">${plural(open.length, 'offener Deckel', 'offene Deckel')} (${fmt(sum(open, tabTotal))}) ${open.length === 1 ? 'bleibt' : 'bleiben'} bestehen und ${open.length === 1 ? 'kann' : 'können'} später kassiert werden.</p>` : ''}
        <label class="field"><span>Anfangsbestand für die neue Abrechnung</span><input class="input" id="nextFloat" inputmode="decimal" value="${state.session.float ? fmtPlain(state.session.float) : ''}" placeholder="0,00"></label>
        <p class="field-hint">Tipp: Vorher die CSV-Datei exportieren, falls du sie weitergeben möchtest.</p>`,
      foot: `<button class="btn btn-outline" data-m="csv">CSV exportieren</button><span class="spacer"></span><button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="ok">Abschließen</button>`
    });
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'csv') exportCsv(state.session);
      if (b.dataset.m === 'ok') {
        const raw = m.querySelector('#nextFloat').value.trim();
        const v = raw === '' ? 0 : parseMoney(raw);
        closeModal();
        closeSession(Number.isNaN(v) || v < 0 ? 0 : v);
        toast('Abrechnung abgeschlossen. Eine neue Abrechnung läuft.');
      }
    });
  }

  function exportCsv(session) {
    const name = `Thekenkasse_Abrechnung_${DATE_FILE(session.startedAt)}.csv`;
    openExport('Abrechnung exportieren', name, buildCsv(session), 'text/csv');
  }

  // ================================================================
  // Ansicht: Sortiment & Einstellungen
  // ================================================================
  function renderSortiment() {
    const view = $('#view-sortiment');
    const groups = groupedProducts(false);
    const t = state.settings;
    const seg = (key, options) => `<div class="seg" role="group">${options.map(([v, l]) => `<button data-action="setting" data-key="${key}" data-id="${v}" aria-pressed="${t[key] === v}">${l}</button>`).join('')}</div>`;
    view.innerHTML = `<div class="view-inner">
      <div class="view-head">
        <div><h1>Sortiment</h1><p class="muted">${plural(state.products.length, 'Artikel', 'Artikel')} in ${plural(state.categories.length, 'Kategorie', 'Kategorien')}. Tippe auf einen Artikel, um ihn zu bearbeiten.</p></div>
        <div class="head-actions">
          <button class="btn btn-outline" data-action="new-category">${ICON.plus}Kategorie</button>
          <button class="btn btn-primary" data-action="new-product">${ICON.plus}Artikel</button>
        </div>
      </div>
      ${groups.map((g) => `<section class="sort-cat">
        <div class="sort-cat-head"><h2>${esc(g.cat.name)}</h2>
          ${g.cat.id !== '__other' ? `<button class="btn btn-sm btn-ghost" data-action="edit-category" data-id="${esc(g.cat.id)}">Bearbeiten</button>` : ''}
          <button class="btn btn-sm btn-outline" data-action="new-product" data-id="${esc(g.cat.id)}">${ICON.plus}Artikel</button></div>
        ${g.items.length ? `<ul class="sort-list">${g.items.map((p, i) => `<li class="sort-row tc-${p.color}${p.active ? '' : ' is-hidden'}">
            <button class="sort-main" data-action="edit-product" data-id="${p.id}"><span class="sort-dot"></span><span class="sort-name">${esc(p.name)}${p.active ? '' : ' <span class="muted">(ausgeblendet)</span>'}</span><span class="sort-price">${fmt(p.price)}</span></button>
            <div class="sort-move">
              <button class="icon-btn" data-action="move-product" data-id="${p.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(p.name)} nach oben">${ICON.up}</button>
              <button class="icon-btn" data-action="move-product" data-id="${p.id}" data-dir="1" ${i === g.items.length - 1 ? 'disabled' : ''} aria-label="${esc(p.name)} nach unten">${ICON.down}</button>
            </div>
            <button class="switch" role="switch" aria-checked="${p.active}" data-action="toggle-product" data-id="${p.id}" aria-label="${esc(p.name)} auf der Kasse anzeigen"></button>
          </li>`).join('')}</ul>` : '<p class="muted">Noch keine Artikel in dieser Kategorie.</p>'}
      </section>`).join('')}

      <section class="card">
        <h2>Anzeige</h2>
        <div>
          <div class="setting"><div><span class="setting-title">Kachelgröße</span><span class="setting-desc">Größere Kacheln lassen sich schneller treffen, kleinere zeigen mehr Artikel auf einmal.</span></div>
            ${seg('tileSize', [['s', 'Klein'], ['m', 'Mittel'], ['l', 'Groß']])}</div>
          <div class="setting"><div><span class="setting-title">Farbschema</span><span class="setting-desc">„Automatisch“ folgt der Einstellung des Geräts.</span></div>
            ${seg('theme', [['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']])}</div>
          <div class="setting"><div><span class="setting-title">Bildschirm anlassen</span><span class="setting-desc">Verhindert, dass sich der Bildschirm während des Thekendiensts abschaltet${WAKE_SUPPORTED ? '' : ' (von diesem Browser nicht unterstützt)'}.</span></div>
            <button class="switch" role="switch" aria-checked="${t.wakeLock}" data-action="toggle-wakelock" aria-label="Bildschirm anlassen" ${WAKE_SUPPORTED ? '' : 'disabled'}></button></div>
        </div>
      </section>

      <section class="card" id="dataSection"></section>
    </div>`;
    renderDataSection();
  }

  function renderDataSection() {
    const el = $('#dataSection');
    if (!el) return;
    const c = Cloud.status;
    const cloudLine = c === 'on'
      ? `<span class="cloud-dot on"></span>Automatische Sicherung in deinem Claude-Konto aktiv${Cloud.lastSaved ? ` · zuletzt ${fTime(Cloud.lastSaved)}` : ''}${Cloud.note ? ` · ${esc(Cloud.note)}` : ''}`
      : c === 'connecting' ? '<span class="cloud-dot"></span>Cloud-Sicherung wird verbunden …'
      : c === 'error' ? `<span class="cloud-dot err"></span>${esc(Cloud.note || 'Cloud-Sicherung nicht erreichbar.')}`
      : !storageOk ? '<span class="cloud-dot err"></span>Speichern ist hier nicht möglich. Die Daten gehen beim Schließen verloren.'
      : restoredFromStorage ? `<span class="cloud-dot on"></span>Daten werden auf diesem Gerät gespeichert und sind seit ${fDateTime(state.meta.created)} erhalten geblieben.`
      : '<span class="cloud-dot"></span>Daten werden auf diesem Gerät gespeichert. Schließe die App einmal und öffne sie neu: Steht hier dann „erhalten geblieben“, funktioniert die Speicherung.';
    el.innerHTML = `<h2>Daten</h2>
      <p class="cloud-line">${cloudLine}</p>
      <div class="data-actions">
        <button class="btn btn-outline" data-action="export-backup">Sicherung exportieren</button>
        <button class="btn btn-outline" data-action="import-backup">Sicherung importieren</button>
        ${c === 'on' ? '<button class="btn btn-outline" data-action="cloud-restore">Cloud-Sicherungen</button>' : ''}
        <button class="btn btn-danger" data-action="reset-all">Alles zurücksetzen</button>
      </div>
      <p class="field-hint">Die Sicherung (JSON) enthält Sortiment, Einstellungen, offene Deckel und alle Abrechnungen. So überträgst du alles auf ein anderes Gerät, z. B. vom Handy aufs iPad. Exportiere nach jedem Einsatz die Abrechnung als CSV.</p>`;
  }

  function openProductEditor(id, presetCat) {
    const existing = id ? prod(id) : null;
    const p = existing ? clone(existing) : { id: uid(), name: '', price: 0, cat: presetCat && presetCat !== '__other' ? presetCat : (state.categories[0] || {}).id, color: COLORS[state.products.length % COLORS.length], active: true };
    const m = openModal({
      title: existing ? 'Artikel bearbeiten' : 'Neuer Artikel',
      body: `<label class="field"><span>Name</span><input class="input" id="peName" maxlength="40" value="${esc(p.name)}" placeholder="z. B. Bier 0,5 l" autocomplete="off"></label>
        <label class="field"><span>Preis in €</span><input class="input" id="pePrice" inputmode="decimal" value="${existing ? fmtPlain(p.price) : ''}" placeholder="z. B. 3,50" autocomplete="off">
          <span class="field-hint">Negative Preise sind möglich, z. B. −2,00 für eine Pfandrückgabe.</span></label>
        <div class="field"><span class="field-label">Kategorie</span><div class="seg" data-k="cats">${state.categories.map((c) => `<button type="button" data-cat="${esc(c.id)}" aria-pressed="${p.cat === c.id}">${esc(c.name)}</button>`).join('')}</div></div>
        <div class="field"><span class="field-label">Farbe</span><div class="swatches" data-k="colors">${COLORS.map((c) => `<button type="button" class="swatch-btn tc-${c}" data-color="${c}" aria-pressed="${p.color === c}" aria-label="${COLOR_NAMES[c]}">Aa</button>`).join('')}</div></div>
        <div class="field"><span class="field-label">Vorschau</span><div class="pe-preview" data-k="preview"></div></div>
        <div class="setting"><div><span class="setting-title">Auf der Kasse anzeigen</span><span class="setting-desc">Ausgeblendete Artikel bleiben im Sortiment und in den Abrechnungen erhalten.</span></div>
          <button type="button" class="switch" role="switch" data-k="active" aria-checked="${p.active}" aria-label="Auf der Kasse anzeigen"></button></div>
        <p class="form-error" data-k="err"></p>`,
      foot: `${existing ? '<button class="btn btn-danger" data-m="delete" data-arm="Wirklich löschen?">Löschen</button><span class="spacer"></span>' : ''}
        <button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="save">Speichern</button>`
    });
    const nameI = m.querySelector('#peName');
    const priceI = m.querySelector('#pePrice');
    const preview = () => {
      const price = parseMoney(priceI.value);
      m.querySelector('[data-k="preview"]').innerHTML = `<div class="tile tc-${p.color}"><span class="tile-name">${nb(nameI.value || 'Artikelname')}</span><span class="tile-price">${Number.isNaN(price) ? '–' : fmt(price)}</span></div>`;
    };
    nameI.addEventListener('input', preview);
    priceI.addEventListener('input', preview);
    m.addEventListener('click', (e) => {
      const cat = e.target.closest('[data-cat]');
      if (cat) { p.cat = cat.dataset.cat; $$('[data-cat]', m).forEach((b) => b.setAttribute('aria-pressed', b === cat)); return; }
      const col = e.target.closest('[data-color]');
      if (col) { p.color = col.dataset.color; $$('[data-color]', m).forEach((b) => b.setAttribute('aria-pressed', b === col)); preview(); return; }
      const act = e.target.closest('[data-k="active"]');
      if (act) { p.active = !p.active; act.setAttribute('aria-checked', p.active); return; }
      const b = e.target.closest('[data-m]');
      if (!b || !armed(b)) return;
      if (b.dataset.m === 'delete') {
        state.products = state.products.filter((x) => x.id !== p.id);
        state.cart = state.cart.filter((l) => l.pid !== p.id);
        state.meta.edited = true; state.meta.sampleHint = false;
        save(); closeModal(); renderAfterChange();
        toast(`„${esc(p.name)}“ gelöscht`, { html: true });
      } else if (b.dataset.m === 'save') {
        const name = nameI.value.trim();
        const price = parseMoney(priceI.value);
        const err = m.querySelector('[data-k="err"]');
        if (!name) { err.textContent = 'Bitte einen Namen eingeben.'; nameI.focus(); return; }
        if (Number.isNaN(price)) { err.textContent = 'Bitte einen gültigen Preis eingeben, z. B. 3,50.'; priceI.focus(); return; }
        if (!state.categories.some((c) => c.id === p.cat)) { err.textContent = 'Bitte eine Kategorie wählen.'; return; }
        p.name = name; p.price = price;
        if (existing) Object.assign(existing, p); else state.products.push(p);
        state.meta.edited = true; state.meta.sampleHint = false;
        save(); closeModal(); renderAfterChange();
        toast(existing ? 'Artikel gespeichert' : `„${esc(name)}“ hinzugefügt`, { html: true });
      }
    });
    preview();
    if (!existing) setTimeout(() => nameI.focus(), 60);
  }

  function moveProduct(id, dir) {
    const p = prod(id);
    if (!p) return;
    const same = state.products.filter((x) => x.cat === p.cat);
    const i = same.indexOf(p);
    const other = same[i + dir];
    if (!other) return;
    const a = state.products.indexOf(p);
    const b = state.products.indexOf(other);
    state.products[a] = other;
    state.products[b] = p;
    state.meta.edited = true;
    save();
    renderAfterChange();
  }

  function openCategoryEditor(id) {
    const cat = id ? state.categories.find((c) => c.id === id) : null;
    const count = cat ? state.products.filter((p) => p.cat === cat.id).length : 0;
    const idx = cat ? state.categories.indexOf(cat) : -1;
    const m = openModal({
      title: cat ? 'Kategorie bearbeiten' : 'Neue Kategorie',
      body: `<label class="field"><span>Name</span><input class="input" id="catName" maxlength="30" value="${esc(cat ? cat.name : '')}" placeholder="z. B. Cocktails oder Snacks" autocomplete="off"></label>
        ${cat ? `<div class="setting"><div><span class="setting-title">Reihenfolge</span><span class="setting-desc">Position auf der Kasse</span></div>
          <div class="row"><button class="btn btn-sm btn-outline" data-m="up" ${idx === 0 ? 'disabled' : ''}>${ICON.up}Nach vorn</button><button class="btn btn-sm btn-outline" data-m="down" ${idx === state.categories.length - 1 ? 'disabled' : ''}>${ICON.down}Nach hinten</button></div></div>` : ''}
        <p class="form-error" data-k="err"></p>`,
      foot: `${cat ? `<button class="btn btn-danger" data-m="delete" ${count ? 'disabled title="Kategorie enthält noch Artikel"' : 'data-arm="Wirklich löschen?"'}>Löschen</button><span class="spacer"></span>` : ''}
        <button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="save">Speichern</button>`
    });
    if (cat && count) m.querySelector('[data-k="err"]').textContent = `Löschen ist erst möglich, wenn die ${plural(count, 'Artikel', 'Artikel')} verschoben oder gelöscht sind.`;
    const input = m.querySelector('#catName');
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b || !armed(b)) return;
      const a = b.dataset.m;
      if (a === 'up' || a === 'down') {
        const j = idx + (a === 'up' ? -1 : 1);
        [state.categories[idx], state.categories[j]] = [state.categories[j], state.categories[idx]];
        state.meta.edited = true;
        save(); closeModal(); renderAfterChange(); openCategoryEditor(cat.id);
      } else if (a === 'delete') {
        state.categories = state.categories.filter((c) => c !== cat);
        state.meta.edited = true;
        save(); closeModal(); renderAfterChange();
      } else if (a === 'save') {
        const name = input.value.trim();
        if (!name) { m.querySelector('[data-k="err"]').textContent = 'Bitte einen Namen eingeben.'; return; }
        if (cat) cat.name = name; else state.categories.push({ id: 'c-' + uid(), name });
        state.meta.edited = true;
        save(); closeModal(); renderAfterChange();
      }
    });
    if (!cat) setTimeout(() => input.focus(), 60);
  }

  // ================================================================
  // Sicherung, Import, Dateien
  // ================================================================
  async function saveFile(filename, text, mime) {
    if (NATIVE) {
      if (!nativeSend({ type: 'export', filename, data: text })) toast('Teilen ist hier nicht möglich. Nutze „In Zwischenablage kopieren“.', { error: true });
      return;
    }
    if (HAS_CLAUDE) {
      try {
        const dl = await window.claude.use('downloads');
        if (dl) {
          await dl.save({ filename, data: text });
          toast('Datei gespeichert');
          return;
        }
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') { toast('Bitte kurz warten und erneut versuchen.', { error: true }); return; }
      }
      if (FRAMED) {
        try { await navigator.clipboard.writeText(text.replace(/^﻿/, '')); toast('Herunterladen ist hier nicht möglich. Der Inhalt wurde in die Zwischenablage kopiert.', { ms: 6000 }); }
        catch (e) { toast('Herunterladen ist in dieser Ansicht nicht möglich.', { error: true }); }
        return;
      }
    }
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    try {
      const file = new File([blob], filename, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPad|iPhone|iPod|Android/.test(navigator.userAgent + (navigator.maxTouchPoints > 1 ? ' iPad' : ''))) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function exportBackup() {
    const data = Object.assign({ app: 'thekenkasse', exported: Date.now() }, state);
    openExport('Sicherung exportieren', `Thekenkasse_Sicherung_${DATE_FILE(Date.now())}.json`, JSON.stringify(data), 'application/json');
  }

  function openExport(title, filename, text, mime) {
    const kb = Math.max(1, Math.round(new Blob([text]).size / 1024));
    const m = openModal({
      title: esc(title),
      subtitle: `${esc(filename)} · ${kb} KB`,
      body: '<p>Speichere die Datei oder teile sie, zum Beispiel per AirDrop, Mail oder in die Dateien-App. Falls das in deiner App nicht klappt, kopiere den Inhalt und füge ihn in eine Mail oder Notiz ein.</p>',
      foot: '<button class="btn btn-outline" data-m="copy">In Zwischenablage kopieren</button><button class="btn btn-primary" data-m="save">Speichern / Teilen</button>'
    });
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'save') { closeModal(); saveFile(filename, text, mime); return; }
      if (await copyText(text.replace(/^\uFEFF/, ''))) { closeModal(); toast('In die Zwischenablage kopiert'); }
      else toast('Kopieren ist hier nicht möglich.', { error: true });
    });
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* weiter mit Ersatzweg */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  async function importFromText(raw) {
    let data;
    try { data = JSON.parse(String(raw).trim()); } catch (err) { data = null; }
    if (!data || !Array.isArray(data.products) || !data.session) { toast('Das ist keine gültige Thekenkasse-Sicherung.', { error: true }); return false; }
    const ok = await confirmDialog({
      title: 'Sicherung importieren?',
      text: `Die Sicherung enthält ${plural(data.products.length, 'Artikel', 'Artikel')}, ${plural((data.tabs || []).filter((t) => t.status === 'open').length, 'offenen Deckel', 'offene Deckel')} und ${plural((data.history || []).length, 'frühere Abrechnung', 'frühere Abrechnungen')}. Die aktuellen Daten auf diesem Gerät werden ersetzt.`,
      ok: 'Importieren', danger: true
    });
    if (!ok) return false;
    replaceState(data);
    toast('Sicherung importiert');
    return true;
  }

  function openImport() {
    const m = openModal({
      title: 'Sicherung importieren',
      body: `<p>Wähle eine Sicherungsdatei (.json) aus oder füge den kopierten Inhalt einer Sicherung ein.</p>
        <div><button class="btn btn-outline" data-m="file">Datei auswählen</button><input type="file" id="importFile" accept="application/json,.json,text/plain" hidden></div>
        <label class="field"><span>Oder Inhalt einfügen</span><textarea class="input" id="importText" rows="5" spellcheck="false" autocomplete="off"></textarea></label>`,
      foot: '<button class="btn btn-outline" data-action="modal-close">Abbrechen</button><button class="btn btn-primary" data-m="go">Importieren</button>'
    });
    const fileInput = m.querySelector('#importFile');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => { if (await importFromText(reader.result)) closeModal(); };
      reader.readAsText(file);
    });
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'file') fileInput.click();
      else if (b.dataset.m === 'go') {
        const text = m.querySelector('#importText').value;
        if (!text.trim()) { toast('Bitte zuerst eine Datei auswählen oder Inhalt einfügen.', { error: true }); return; }
        if (await importFromText(text)) closeModal();
      }
    });
  }

  function replaceState(data) {
    const deviceId = state.meta.deviceId;
    const next = migrate(clone(data));
    delete next.app; delete next.exported;
    next.meta.deviceId = deviceId;
    state = next;
    ui.reportId = null;
    save();
    applySettings();
    renderAfterChange();
    Cloud.syncHistory();
  }

  async function resetAll() {
    const ok = await confirmDialog({
      title: 'Alles zurücksetzen?',
      text: 'Sortiment, Deckel und alle Abrechnungen auf diesem Gerät werden gelöscht. Exportiere vorher eine Sicherung, wenn du die Daten noch brauchst.',
      ok: 'Alles löschen', danger: true
    });
    if (!ok) return;
    const deviceId = state.meta.deviceId;
    state = defaultState();
    state.meta.deviceId = deviceId;
    ui.reportId = null; ui.cat = 'all';
    save();
    applySettings();
    go('kasse');
    toast('Alle Daten wurden zurückgesetzt');
  }

  // ================================================================
  // Cloud-Sicherung (nur innerhalb von claude.ai verfügbar)
  // ================================================================
  function deviceLabel() {
    const ua = navigator.userAgent;
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android-Handy' : 'Android-Tablet';
    if (/Macintosh/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows-PC';
    return 'Browser';
  }

  const Cloud = {
    status: 'off', note: '', col: null, timer: null, busy: false, dirty: false, lastSaved: 0, docs: [],
    async init() {
      if (!HAS_CLAUDE) return;
      this.status = 'connecting';
      renderDataSection();
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        const id = db && user ? await user.id() : null;
        if (!id) { this.status = 'off'; renderDataSection(); return; }
        this.col = db.collection('data/users/' + id);
        this.status = 'on';
        await this.refreshList();
        this.syncHistory();
        this.offerRestore();
        this.schedule();
      } catch (e) {
        this.status = 'error';
        this.note = 'Cloud-Sicherung nicht erreichbar. Die Daten bleiben auf diesem Gerät.';
      }
      renderDataSection();
    },
    async refreshList() {
      const snap = await this.col.get();
      this.docs = snap.docs.map((d) => Object.assign({ _id: d.id }, d.data()));
    },
    backups() { return this.docs.filter((d) => d.kind === 'backup' && d.data).sort((a, b) => b.savedAt - a.savedAt); },
    schedule() {
      if (this.status !== 'on') return;
      this.dirty = true;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 2000);
    },
    async flush() {
      if (this.status !== 'on' || !this.dirty) return;
      if (this.busy) { this.schedule(); return; }
      this.busy = true;
      this.dirty = false;
      try {
        const rest = Object.assign({}, state);
        delete rest.history;
        const size = new Blob([JSON.stringify(rest)]).size;
        if (size > 240000) {
          this.note = 'Zu viele Buchungen für die Cloud-Sicherung. Bitte den Abend abschließen.';
        } else {
          const body = { kind: 'backup', deviceId: state.meta.deviceId, device: deviceLabel(), savedAt: Date.now(), receipts: state.session.events.length, openTabs: openTabs().length, products: state.products.length, data: rest };
          await this.col.doc('b-' + state.meta.deviceId).set(body);
          const i = this.docs.findIndex((d) => d._id === 'b-' + state.meta.deviceId);
          const local = Object.assign({ _id: 'b-' + state.meta.deviceId }, body);
          if (i >= 0) this.docs[i] = local; else this.docs.push(local);
          this.lastSaved = Date.now();
          this.note = '';
        }
      } catch (e) {
        const code = e && e.code;
        if (code === 'revoked' || code === 'not_granted' || code === 'invalid_argument') { this.status = 'error'; this.note = 'Cloud-Sicherung nicht möglich. Die Daten bleiben auf diesem Gerät.'; }
        else { this.note = 'Letzte Cloud-Sicherung fehlgeschlagen, neuer Versuch folgt.'; this.dirty = true; setTimeout(() => this.flush(), 15000); }
      }
      this.busy = false;
      renderDataSection();
    },
    async pushHistory(session) {
      if (this.status !== 'on') return;
      try {
        const body = { kind: 'history', deviceId: state.meta.deviceId, closedAt: session.closedAt, data: session };
        if (new Blob([JSON.stringify(body)]).size > 250000) return;
        await this.col.doc('h-' + session.id).set(body);
        this.docs.push(Object.assign({ _id: 'h-' + session.id }, body));
      } catch (e) { /* bleibt lokal erhalten */ }
    },
    async syncHistory() {
      if (this.status !== 'on') return;
      const have = new Set(this.docs.map((d) => d._id));
      for (const h of state.history) if (!have.has('h-' + h.id)) await this.pushHistory(h);
    },
    async removeHistory(id) {
      if (this.status !== 'on') return;
      try { await this.col.doc('h-' + id).delete(); this.docs = this.docs.filter((d) => d._id !== 'h-' + id); } catch (e) { /* ignorieren */ }
    },
    offerRestore() {
      if (isTouched()) return;
      const others = this.backups().filter((b) => b.receipts || b.openTabs || (b.data && b.data.meta && b.data.meta.edited));
      if (!others.length) return;
      toast(`Cloud-Sicherung vom ${fDateTime(others[0].savedAt)} (${esc(others[0].device || 'Gerät')}) gefunden.`, { html: true, action: 'Ansehen', ms: 12000, onAction: () => openCloudRestore() });
    },
    restore(b) {
      const hist = this.docs.filter((d) => d.kind === 'history' && d.deviceId === b.deviceId && d.data).map((d) => d.data).sort((x, y) => (y.closedAt || 0) - (x.closedAt || 0));
      const data = clone(b.data);
      const known = new Set((data.history || []).map((h) => h.id));
      data.history = (data.history || []).concat(hist.filter((h) => !known.has(h.id)));
      replaceState(data);
    }
  };

  function openCloudRestore() {
    const list = Cloud.backups();
    const m = openModal({
      title: 'Cloud-Sicherungen',
      subtitle: 'Jedes Gerät sichert seinen eigenen Stand automatisch in deinem Claude-Konto.',
      body: list.length ? `<ul class="list">${list.map((b) => `<li class="list-row"><div class="grow"><strong>${esc(b.device || 'Gerät')}${b.deviceId === state.meta.deviceId ? ' (dieses Gerät)' : ''}</strong>
          <span class="meta">gesichert ${fDateTime(b.savedAt)} · ${plural(b.receipts || 0, 'Beleg', 'Belege')} · ${plural(b.openTabs || 0, 'offener Deckel', 'offene Deckel')} · ${plural(b.products || 0, 'Artikel', 'Artikel')}</span></div>
          ${b.deviceId === state.meta.deviceId ? '' : `<button class="btn btn-sm btn-primary" data-m="restore" data-id="${esc(b._id)}" data-arm="Daten hier ersetzen?">Wiederherstellen</button>
          <button class="btn btn-sm btn-ghost" data-m="delete" data-id="${esc(b._id)}" data-arm="Löschen?">Löschen</button>`}</li>`).join('')}</ul>
          <p class="field-hint">Beim Wiederherstellen werden die Daten auf diesem Gerät durch den gewählten Stand ersetzt.</p>`
        : '<p class="muted">Noch keine Cloud-Sicherungen vorhanden.</p>'
    });
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-m]');
      if (!b || !armed(b)) return;
      const doc = Cloud.docs.find((d) => d._id === b.dataset.id);
      if (!doc) return;
      if (b.dataset.m === 'restore') {
        closeModal();
        Cloud.restore(doc);
        toast('Daten aus der Cloud-Sicherung übernommen');
      } else if (b.dataset.m === 'delete') {
        try { await Cloud.col.doc(doc._id).delete(); Cloud.docs = Cloud.docs.filter((d) => d !== doc); } catch (err) { toast('Löschen fehlgeschlagen.', { error: true }); return; }
        closeModal();
        openCloudRestore();
      }
    });
  }

  // ================================================================
  // Einstellungen, Bildschirm anlassen, Offline-Betrieb
  // ================================================================
  const hostTheme = document.documentElement.getAttribute('data-theme');
  let themeOverridden = false;
  function applySettings() {
    const t = state.settings.theme;
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') { root.setAttribute('data-theme', t); themeOverridden = true; }
    else if (ANDROID && typeof ANDROID.isDarkMode === 'function') {
      // Android-WebView meldet den Dunkelmodus nicht zuverlässig per CSS – die App fragt das System direkt.
      root.setAttribute('data-theme', ANDROID.isDarkMode() ? 'dark' : 'light');
      themeOverridden = true;
    } else if (themeOverridden) {
      if (hostTheme) root.setAttribute('data-theme', hostTheme); else root.removeAttribute('data-theme');
      themeOverridden = false;
    }
    $('#app').dataset.tiles = state.settings.tileSize || 'm';
    applyWakeLock();
  }

  let wakeLock = null;
  async function applyWakeLock() {
    if (NATIVE) { nativeSend({ type: 'idle', on: !!state.settings.wakeLock }); return; }
    if (!('wakeLock' in navigator)) return;
    const want = state.settings.wakeLock && document.visibilityState === 'visible';
    if (want && !wakeLock) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } catch (e) { wakeLock = null; }
    } else if (!want && wakeLock) {
      try { await wakeLock.release(); } catch (e) { /* ignorieren */ }
      wakeLock = null;
    }
  }
  document.addEventListener('visibilitychange', applyWakeLock);

  function registerServiceWorker() {
    if (NATIVE || HAS_CLAUDE || FRAMED || !('serviceWorker' in navigator)) return;
    if (!/^https:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline-Modus nicht verfügbar */ });
  }

  // ================================================================
  // Bedienung: zentrale Klick-Verarbeitung
  // ================================================================
  const actions = {
    'modal-close': () => closeModal(),
    add: (el) => { cartChange(el.dataset.id, 1); if (navigator.vibrate) navigator.vibrate(8); },
    inc: (el) => cartChange(el.dataset.id, 1),
    dec: (el) => cartChange(el.dataset.id, -1),
    cat: (el) => { ui.cat = el.dataset.id; renderKasse(); $('#gridScroll').scrollTop = 0; },
    'toggle-order': () => { ui.orderOpen = !ui.orderOpen; renderOrder(); },
    'clear-cart': () => {
      const items = cartItems();
      if (!items.length) return;
      state.cart = [];
      ui.orderOpen = false;
      save(); updateBadges(); renderOrder();
      toast('Bestellung geleert', { action: 'Rückgängig', onAction: () => { setCartFromItems(items); save(); updateBadges(); renderOrder(); } });
    },
    'pay-cash': () => startCashPayment(),
    'to-tab': () => openTabPicker(),
    goto: (el) => go(el.dataset.id),
    'dismiss-hint': () => { state.meta.sampleHint = false; save(); renderKasse(); },
    'new-tab': () => openNewTabDialog(),
    'open-tab': (el) => openTabDetail(el.dataset.id),
    void: (el) => voidEvent(el.dataset.id),
    'journal-all': () => { ui.journalAll = true; renderReport(); },
    'view-report': (el) => { ui.reportId = el.dataset.id || null; ui.journalAll = false; renderReport(); $('#view-abrechnung').scrollTop = 0; },
    'delete-history': (el) => {
      state.history = state.history.filter((h) => h.id !== el.dataset.id);
      if (ui.reportId === el.dataset.id) ui.reportId = null;
      save(); Cloud.removeHistory(el.dataset.id); renderReport();
      toast('Abrechnung gelöscht');
    },
    'export-csv': () => exportCsv(ui.reportId ? state.history.find((h) => h.id === ui.reportId) : state.session),
    print: () => { if (NATIVE) nativeSend({ type: 'print' }); else window.print(); },
    'close-session': () => openCloseSession(),
    'edit-float': () => openFloatEditor(),
    'new-product': (el) => openProductEditor(null, el.dataset.id),
    'edit-product': (el) => openProductEditor(el.dataset.id),
    'toggle-product': (el) => {
      const p = prod(el.dataset.id);
      if (!p) return;
      p.active = !p.active;
      if (!p.active) state.cart = state.cart.filter((l) => l.pid !== p.id);
      state.meta.edited = true;
      save(); renderSortiment();
    },
    'move-product': (el) => moveProduct(el.dataset.id, Number(el.dataset.dir)),
    'new-category': () => openCategoryEditor(null),
    'edit-category': (el) => openCategoryEditor(el.dataset.id),
    setting: (el) => { state.settings[el.dataset.key] = el.dataset.id; save(); applySettings(); renderSortiment(); },
    'toggle-wakelock': () => { state.settings.wakeLock = !state.settings.wakeLock; save(); applyWakeLock(); renderSortiment(); },
    'export-backup': () => exportBackup(),
    'import-backup': () => openImport(),
    'cloud-restore': () => openCloudRestore(),
    'reset-all': () => resetAll()
  };

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); go(nav.dataset.nav); return; }
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    if (!armed(el)) return;
    const fn = actions[el.dataset.action];
    if (fn) fn(el, e);
    if (state.settings.wakeLock && !wakeLock && !NATIVE) applyWakeLock();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modals.length) { e.preventDefault(); closeModal(); }
  });

  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { state = migrate(JSON.parse(e.newValue)); applySettings(); renderAfterChange(); } catch (err) { /* ignorieren */ }
    }
  });

  // ================================================================
  // Start
  // ================================================================
  function start() {
    applySettings();
    routeFromHash();
    registerServiceWorker();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    Cloud.init();
    // Zurück-Taste unter Android: erst Dialog schließen, dann zur Kasse, erst dann App verlassen.
    window.__thekenkasseBack = () => {
      if (modals.length) { closeModal(); return true; }
      if (ui.view !== 'kasse') { go('kasse'); return true; }
      return false;
    };
    // Testhilfe für automatisierte Prüfungen
    window.__thekenkasse = { get state() { return state; }, computeReport, parseMoney, changeBreakdown, buildCsv };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

</script>
</body>
</html>
"""##
}
