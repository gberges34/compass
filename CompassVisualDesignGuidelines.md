# Compass — Visual Design Guidelines (Production Cut)

> Minimal, pastel, Apple‑esque. This is the **production** spec for logos, art, and website/UI theming (no marketing fluff).

---

## 1) Logo & Wordmark

### Primary Glyph (Compass)
- **Form:** Soft circle (outer ring) with a slender **north‑east needle** fixed at **~35°**.
- **Stroke:** Needle stroke = **1/12** of glyph diameter; caps/joins **rounded**.
- **Center:** Dot at small sizes (**≈ 1/24** of diameter) or **hollow center** at large sizes.
- **Clear Space (glyph):** **1×** glyph diameter on all sides.
- **Minimum Size:** **16 px** (screen), **4 mm** (print).
- **Backgrounds:** Prefer **Snow** / **Cloud**. On photos, apply a **Frost veil** (white overlay, **12–16%** with light blur).

**Don’ts (glyph):**
- Don’t rotate the needle away from **~35°**.
- Don’t use shadows heavier than **Elevation‑02**.
- Don’t place on noisy imagery without a veil.

### Lockups
- **Horizontal:** glyph + **12 px** gap + wordmark.
- **Stacked:** glyph above wordmark, center aligned, **16 px** gap.
- **Minimum Lockup Height:** **28 px** (screen).

### Wordmark
- **Text:** `compass` (all‑lowercase) for UI/mark; “Compass” in prose.
- **Typeface:** **Inter Medium** (optical size 14+).
- **Tracking:** **−1%** (tighten slightly); custom letterfit for **“mpa”**.
- **Build:** Soften traps (counters in “a”, “s”) for warm feel.
- **Clear Space (wordmark):** Height of the lowercase **“c”** on all sides.
- **Minimum Size (wordmark):** **24 px** height (screen); **6 mm** (print).
- **Don’ts:** No outlines/strokes; no heavy shadows; maintain spacing rules.

**Appendix A — Quick Logo Construction**
1) Draw a circle. 2) Add a **35°** rounded‑cap needle center→rim (stroke **= 1/12D**).  
3) Add center dot (**≈ 1/24D**) or hollow at large sizes. 4) Slight optical vertical nudge to balance.  
5) Export glyph & lockups with **clear space baked into artboards**.

---

## 2) Color System (Pastel Core)

**Principles:** nearly‑white surfaces, one accent per view, inky text for contrast, gentle gradients for large fields.

### Core Neutrals
| Token | Hex | Usage |
|---|---|---|
| **Snow** | `#FCFCFD` | App background |
| **Cloud** | `#F6F7F9` | Secondary bg/cards |
| **Fog** | `#EEF0F3` | Dividers/hairlines |
| **Stone** | `#D7DBE0` | Borders/disabled |
| **Slate** | `#8A94A6` | Secondary text |
| **Ink** | `#0F172A` | Primary text |

### Pastel Accents
| Token | Hex | Usage |
|---|---|---|
| **Mint** | `#C9F0DE` | Positive/focus |
| **Sky** | `#CFE9FF` | Info/selection |
| **Lavender** | `#E1D9FF` | Highlights |
| **Blush** | `#FFDDE6` | Gentle emphasis |
| **Sun** | `#FFEFC6` | Warm hints |

### Extended Accent Palette (Categories)
These additional accents are used for user-managed category colors. Keep accents high-key and pair with **Ink** text.

| Token | Hex |
|---|---|
| **Rose** | `#F4AFAF` |
| **Peach** | `#F4D1C2` |
| **Apricot** | `#F7DDB6` |
| **Butter** | `#F4F0CD` |
| **Lime** | `#E6F4AF` |
| **Pistachio** | `#DBF4C2` |
| **Leaf** | `#C3F7B6` |
| **Spearmint** | `#CDF4D0` |
| **Jade** | `#AFF4CA` |
| **Aqua** | `#C2F4E5` |
| **Glacier** | `#B6F7F7` |
| **Ice** | `#CDE8F4` |
| **Azure** | `#AFCAF4` |
| **Periwinkle** | `#C2C7F4` |
| **Iris** | `#C3B6F7` |
| **Lilac** | `#E0CDF4` |
| **Orchid** | `#E6AFF4` |
| **Mauve** | `#F4C2EF` |
| **Pink** | `#F7B6DD` |
| **Petal** | `#F4CDD8` |

### Action Colors (AA on Snow/Cloud)
| Token | Hex | Usage |
|---|---|---|
| **Action** | `#2A6FF2` | Primary CTAs/links |
| **Action‑Hover** | `#255FD0` | Hover |
| **Success** | `#22C55E` | Success |
| **Warn** | `#F59E0B` | Caution |
| **Danger** | `#EF4444` | Destructive |

### Signature Gradients (sparingly for hero/empty states/app icon)
- **Dawn:** Sky → Lavender (`#CFE9FF → #E1D9FF`)
- **Aurora:** Mint → Sky (`#C9F0DE → #CFE9FF`)
- **Blush Sun:** Blush → Sun (`#FFDDE6 → #FFEFC6`)

**Rules of Use**
- One accent per screen. Avoid mixing multiple gradients in a component.
- Text on Snow/Cloud uses **Ink**; reverse text on Action uses **Snow**.

---

## 3) Typography

- **Primary:** **Inter** — Regular, Medium, SemiBold. (Apple‑only alt: **SF Pro**, license‑bound.)
- **Type Scale (4‑pt rhythm):**
  - Display **48/56** SemiBold; H1 **32/40** SemiBold; H2 **24/32** Medium; H3 **20/28** Medium; Body **16/24** Regular; Small **14/20**; Micro **12/16**.
- **Tracking:** Headings **−1% to −2%**; body default.
- **Links:** Action color; underline on hover/focus only.

---

## 4) Layout, Spacing, Elevation

- **Grid:** 8‑pt base. Web: 12‑column. iOS/macOS follow platform grids.
- **Container Max‑Width:** marketing **1120 px**, docs **1280 px**; app panes **320–720 px**.
- **Spacing Tokens:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Radii:** default **12**, cards **16**, modals **24**, pills **999**.
- **Elevation:**
  - **E‑00:** none
  - **E‑01:** `0 1px 2px rgba(15,23,42,.06)`
  - **E‑02:** `0 4px 16px rgba(15,23,42,.08)`
  - **E‑Glass:** background blur **20–32 px** + `rgba(255,255,255,.72)`

**Preference:** Elevate via **layering & blur**, not heavy drop shadows.

---

## 5) Iconography & Illustration

- **Icons:** Rounded **2 px** strokes; 2° optical corrections; caps/joins **round**.
- **Sizes:** 16/20 (dense), 24/28 (standard), 48 (empty states).
- **Color:** Inactive **Slate**; active **Action**; never pure black.
- **Metaphors:** navigation/orientation/time/focus (compass, needle, waypoints).
- **Illustrations:** Soft geometric shapes; **Dawn/Aurora** gradients; diffused bloom; subtle **grain < 2%**.

---

## 6) Motion & Interactions

- **Style:** functional, subtle—reassure state changes.
- **Durations:** **160 ms** (micro), **240 ms** (standard), **300 ms** (modal/scale).
- **Curves:** `cubic-bezier(0.22,1,0.36,1)` ease‑out; spring entrances (damping ~14, stiffness ~180).
- **Examples:** button press **0.96×** for **80 ms** then restore; sheet fade + **6 px** up; progress linear with eased endpoints.

---

## 7) Accessibility

- **Contrast:** Body **≥ 4.5:1**; large text **≥ 3:1**.
- **Focus:** 2 px ring in **Action**, **2 px** outer offset.
- **Targets:** ≥ **44×44 px**.
- **Reduced Motion:** honor `prefers-reduced-motion` → fade substitutions.
- **Dynamic Type:** supports **120%** text size without layout break.

---

## 8) Core UI Component Specs (Web/App)

- **Primary Button:** 40 px height; 12–16 px padding; radius 12; bg **Action → Action‑Hover** on hover; text **Snow**; focus ring as above; disabled: bg **Stone**, text **Slate** @50%.
- **Secondary (Ghost) Button:** 1 px **Stone** border; text **Ink**; hover fill **Cloud**.
- **Card:** bg **Cloud**; **E‑02**; radius 16; 16–24 padding; dividers **Fog**; section titles **H3**.
- **Input:** 40 px height; bg **Snow**; border **1 px Stone → Action** on focus; placeholder **Slate 70%**; text **Ink**; radius 12.
- **Navigation:** sidebar 16 px padding; selected pill **Action 10%** tint + 4 px bar; topbar 56 px, **E‑Glass** over content.

---

## 9) Marketing/Web Thematics

- **Composition:** high negative space, single focal device frame, **Dawn** gradient backplate.
- **Photography/Mockups:** soft reflections; shadows **E‑02**; background **Snow → Dawn**; avoid harsh contrast.
- **Social Tiles:** 1080×1080 & 1920×1080; margins **120 px**; headline ≤ **7 words**; glyph watermark **8%** opacity.

---

## 10) App Icon & Store Assets

- **Shape:** platform masks (iOS/macOS squircle).
- **Background:** **Dawn** or **Aurora** gradient, **1–2%** grain.
- **Glyph:** compass needle in **Snow** at **78–82%** of safe area; **no text**.
- **Avoid:** heavy drops, busy textures, high‑contrast outlines.

---

## 11) Design Tokens (starter)

```css
:root {
  /* Neutrals */
  --c-snow:#FCFCFD; --c-cloud:#F6F7F9; --c-fog:#EEF0F3;
  --c-stone:#D7DBE0; --c-slate:#8A94A6; --c-ink:#0F172A;

  /* Accents */
  --c-mint:#C9F0DE; --c-sky:#CFE9FF; --c-lavender:#E1D9FF;
  --c-blush:#FFDDE6; --c-sun:#FFEFC6;

  /* Actions */
  --c-action:#2A6FF2; --c-action-hover:#255FD0;
  --c-success:#22C55E; --c-warn:#F59E0B; --c-danger:#EF4444;

  /* Elevation */
  --sh-e01: 0 1px 2px rgba(15,23,42,.06);
  --sh-e02: 0 4px 16px rgba(15,23,42,.08);

  /* Radii */
  --r-12:12px; --r-16:16px; --r-24:24px; --r-pill:999px;

  /* Spacing (8-pt) */
  --s-4:4px; --s-8:8px; --s-12:12px; --s-16:16px; --s-24:24px;
  --s-32:32px; --s-48:48px; --s-64:64px;

  /* Type scale */
  --fz-display:48px; --lh-display:56px; --fw-display:600;
  --fz-h1:32px; --lh-h1:40px; --fw-h1:600;
  --fz-h2:24px; --lh-h2:32px; --fw-h2:500;
  --fz-h3:20px; --lh-h3:28px; --fw-h3:500;
  --fz-body:16px; --lh-body:24px; --fw-body:400;
  --fz-small:14px; --lh-small:20px;
}
/* Gradients */
.bg-dawn   { background: linear-gradient(180deg,#CFE9FF 0%,#E1D9FF 100%); }
.bg-aurora { background: linear-gradient(180deg,#C9F0DE 0%,#CFE9FF 100%); }
```
---

## 12) File & Export Specs

- **Vectors:** SVG (UI), PDF (print). Outline wordmark text for print.
- **Rasters:** PNG @1x/@2x/@3x; JPG for photo‑heavy hero.
- **Color profiles:** **sRGB** (screen), **CMYK coated** (print). Proof pastel shifts.
- **Naming:** `compass_[asset]_[size]_[bg].ext` → e.g., `compass_logo-glyph_256_snow.png`.

---

## 13) Design Do / Don’t (Quick)

**Do**
- Use **one accent** per screen.
- Align to **8‑pt grid**; keep copy short.
- Prefer **blur/layering** to heavy shadows.

**Don’t**
- Mix multiple gradients in one component.
- Use saturated reds as accents (errors only).
- Stack more than **two fonts**.
- Animate for flair alone.

---

### Ready‑to‑Build Summary
- Logo = circle + 35° rounded needle; strict spacing/size rules.
- Color = near‑white surfaces, Ink text, one pastel accent; Dawn/Aurora gradients as large‑area flavor.
- Type = Inter (R/M/SB); 4‑pt rhythm scale; restrained tracking.
- Layout = 8‑pt grid; soft radii; E‑Glass and light shadows.
- Icons/Illos = 2 px rounded strokes; soft geometric gradients + subtle grain.
- Motion = 160–300 ms, ease‑out; spring entrances; respect reduced motion.
- Web theming = negative space, Dawn backplates, soft mockups; social tiles constrained.
- App icon = squircle, Dawn/Aurora, Snow needle at ~80% safe‑area; no text.
