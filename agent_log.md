# Agent change log

## 2026-04-29 — Navbar link weight

**What:** Set main site navigation link text to use the Halyard Light cut instead of Book / browser fallback.

**Why:** Links looked too heavy; the user asked for a lighter weight.

**Where:** `index.html` and `about.html` use `font-weight: 300` on `.nav-links a` (maps to `Halyard_Display_Light.otf`). `panacea.html` uses `font-weight: 200` because that file’s `@font-face` rules register the Light file at 200; the old value 400 had no matching face and could resolve to Medium, which read as bold.

**Effect:** Work, About, and Resume in the top bar render lighter on the home, about, and Panacea case study pages.

## 2026-04-29 — Open site in browser

**What:** Ran macOS `open` on the project `index.html` so it loads in the default browser from the local file path.

**Why:** User asked to open the site in their browser.

**Effect:** No file edits; the homepage should appear in whatever browser is set as default on their Mac.

## 2026-04-29 — Panacea case study header metadata column

**What:** Updated `.cs-header-meta` in `panacea.html` so it is no longer locked to a very narrow width (`clamp` capped at 170px). It now uses `width: max-content` and `max-width: 100%` so the Timeline / My Role / Project lines can span one line each, matching the intended copy layout.

**Why:** The narrow column forced the long “Project” value to break across many short lines.

**Effect:** Desktop layout shows three clean rows; at 768px and below the existing rules still stack the header and allow wrapping on small screens.

## 2026-04-29 — Panacea IA before/after toggle

**What:** Wrapped the information architecture card and pill toggle in `.ia-ba-block`, turned both labels into real tab buttons, slid the purple highlight when switching, and added a short script that swaps the diagram `src` to `assets/panacea-ia-final.png` on After, restores the Figma “before” asset on Before, updates the title line and tag row (red “problem” tags vs green outcome tags), and syncs ARIA/tab focus. Diagram frame uses `object-fit: contain` so the full tree stays visible.

**Why:** The toggle was decorative only; the user wanted After to show their final IA artwork.

**Effect:** Research section IA block is interactive; new PNG is shipped as `assets/panacea-ia-final.png` (copy of the provided Group 20 export).

## 2026-04-29 — Revert Panacea IA before/after toggle

**What:** Removed the interactive IA block, restored the original static IA card and decorative Before/After pill (span + one button), removed the toggle script, restored `object-fit: cover` on the IA image frame, and deleted `assets/panacea-ia-final.png`.

**Why:** The user reported it did not work and asked to undo that change.

**Effect:** `panacea.html` matches the pre–interactive-toggle behavior for that section.
