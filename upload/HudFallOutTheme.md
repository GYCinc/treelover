# Patinated Executive Terminal – Style Template

## Core Philosophy
Combine a **high‑end consulting boardroom** tone with the worn, analog aesthetic of a **CRT terminal**. The result feels authoritative, data‑driven, and slightly nostalgic – like a CEO reviewing classified audit reports on a machine that’s been running for a decade.

---

## Visual Palette
- **Background:** Deep black (`#0c0f0c`) with subtle inner glow.
- **Text Color:** Phosphor green (`#3aff3a`) or amber (`#ffb347`) – both with glow effects.
- **Accent:** Gold/amber (`#c9a45b` or `#ffb347`) for highlights, borders, and emphasis.
- **Flicker:** 60Hz subtle opacity animation (`0.083s`).
- **Patina Layers:**
  - Faint grid burn‑in (`background-image` of lines, size ~24px).
  - Random scratches and oily marks (`radial-gradient` and `repeating-linear-gradient` with low opacity).
  - Inset shadows for depth.

---

## Typography
- **Font:** Monospaced only – `'Courier New', Courier, monospace`.
- **Size:** Base `1rem`, headings `1.4rem`, small labels `0.75rem`.
- **Weight:** Normal (400) or light (300) for body; semi‑bold for headings.
- **Text Glow:** `text-shadow: 0 0 3px #2ecc2e, 0 0 8px #1f7a1f;` (adjust for amber).
- **Word‑count rule:** No block exceeds **15 words** – enforced by manual editing, not CSS.

---

## Layout & Components
- **Slides:** Each presented one at a time (paginated).
- **Card container:** Rounded corners, thick inner border, patina overlays.
- **Navigation:** Previous/Next buttons with terminal styling, page indicator.
- **Content blocks:**
  - **Section titles** (`.section-title`): Uppercase, accent color, left border or underline.
  - **Lists** (`.constraint-list`, `.integrate-list`): Dashed or arrow bullets.
  - **Flow diagrams** (`.flow-row`): Flex row with items and arrows.
  - **Tables** (`.register-table`): Clean borders, accent first column.
  - **Error items** (`.error-item`): Left accent border, subtle background.
  - **Gold note** (`.gold-note`): Right‑aligned, top border.

---

## Interaction
- **Flicker:** Continuous CSS animation.
- **Hover effects:** Slight border brightening.
- **Buttons:** Disabled state dimmed; hover background change.
- **Page indicator:** Shows current slide / total.

---

## Code Structure (HTML/CSS/JS)
- Single HTML file with inline styles and JavaScript.
- Slides stored as array of HTML strings.
- Render function updates container and button states.
- All visual effects in CSS; minimal JS for navigation.

---

## Example Use
When requesting a new slide deck, say:  
*"Generate 5 slides in the patinated executive terminal style covering [topic]. Use the same visual palette, flicker, and monospaced green text. Include appropriate tables or lists where needed."*
