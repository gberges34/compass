# COMPASS — Brand Guidelines (v1.0)

> Modern, minimalist, pastel—Apple-esque clarity for a calm, focused product experience.

---

## 0) Snapshot

- **Name:** Compass  
- **Tagline:** *Find your flow.*  
- **One-liner:** A gentle, precise productivity system that quietly orients you toward what matters.  
- **Design DNA:** Quiet confidence, human pace, ultra-clean UI, pastel gradients, subtle depth, fluent motion.  
- **Audience:** Knowledge workers, students, indie builders who value craft and calm.

---

## 1) Brand North Star

### Purpose
Help people *orient* quickly and execute with calm focus.

### Promise
Clarity without clutter. Power without noise.

### Personality (3–5 traits)
- **Calm** (soft colors, generous space, unhurried motion)  
- **Considered** (grids, alignment, consistent tokens)  
- **Human** (plain language, warm microcopy)  
- **Precise** (minimal ornament, sharp hierarchy)

### Voice & Tone
- **Voice:** clear, gentle, and helpful—never hypey.  
- **Tone by context:**
  - Onboarding: welcoming, reassuring.
  - Empty states: encouraging, specific next step.
  - Errors: concise, blame-free, recovery first.
- **Microcopy examples:**
  - Primary CTA: “Start” / “Continue” (not “Let’s go!!!”)
  - Success: “Saved.” (not “Awesome, you did it!”)
  - Error: “Couldn’t sync right now. Try again in a moment.”

---

## 2) Naming & Wordmark

### Brand Name
- **Primary styling:** `compass` (all-lowercase) for product UI and wordmark.  
- **Sentence case:** “Compass” in prose and press.

### Wordmark Construction
- Typeface: **Inter Medium** (optical size 14+), tracking **-1%**, custom letterfit for “mpa”.  
- Rounded corners suggest warmth; remove visual traps (tight counters in “a”, “s”).  
- **Clear space:** height of the lowercase “c” on all sides.  
- **Minimum size:** 24 px height on screens; 6 mm in print.

---

## 3) Logo System

### Primary Mark
A minimal **compass glyph**: a soft circle (outer ring) with a slender **north-east needle** at ~35°.  
- Strokes rounded; perfect optical balance.
- Center point subtly indicated (1 px dot at small sizes; hollow at large).

### Lockups
- **Horizontal lockup:** glyph + 12 px gap + wordmark.  
- **Stacked lockup:** glyph above wordmark, center aligned, 16 px gap.

### Clear Space & Minimum Size
- **Clear space:** 1× glyph diameter.  
- **Minimum sizes:**  
  - Glyph: 16 px (screen), 4 mm (print).  
  - Lockup height: 28 px min.

### Backgrounds
- On color: prefer **Snow** / **Cloud**.  
- On imagery: use **Frost veil** (12–16% white overlay blur) or a soft gradient field.

### Don’ts
- Don’t rotate the needle away from ~35°.  
- Don’t apply drop shadows heavier than Elevation-02 (see tokens).  
- Don’t outline or add strokes to the wordmark.  
- Don’t place on high-noise images without veil.

---

## 4) Color System

### Palette Principles
- Pastel, high-key base; inky text for accessible contrast; gentle elevation via neutral tints.
- Use **one accent** per view; keep UI surfaces nearly white with whisper gradients.

#### Core Neutrals
| Token | Hex | Usage |
|---|---|---|
| **Snow** | `#FCFCFD` | App background |
| **Cloud** | `#F6F7F9` | Secondary background / cards |
| **Fog** | `#EEF0F3` | Dividers, hairlines |
| **Stone** | `#D7DBE0` | Borders, disabled |
| **Slate** | `#8A94A6` | Secondary text |
| **Ink** | `#0F172A` | Primary text |

#### Pastel Accents
| Token | Hex | Usage |
|---|---|---|
| **Mint** | `#C9F0DE` | Positive / focus states |
| **Sky** | `#CFE9FF` | Info, selection |
| **Lavender** | `#E1D9FF` | Highlights, tertiary |
| **Blush** | `#FFDDE6` | Gentle emphasis, notifications |
| **Sun** | `#FFEFC6` | Warm highlights, hints |

#### Action Colors (AA compliant on Snow/Cloud)
| Token | Hex | Usage |
|---|---|---|
| **Action** | `#2A6FF2` | Primary CTAs, links |
| **Action-Hover** | `#255FD0` | Hover |
| **Success** | `#22C55E` | Success |
| **Warn** | `#F59E0B` | Caution |
| **Danger** | `#EF4444` | Destructive |

#### Signature Gradients
- **Dawn:** Sky → Lavender (`#CFE9FF → #E1D9FF`)  
- **Aurora:** Mint → Sky (`#C9F0DE → #CFE9FF`)  
- **Blush Sun:** Blush → Sun (`#FFDDE6 → #FFEFC6`)

> Use gradients sparingly for hero backgrounds, large empty states, or app icon backplates.

---

## 5) Typography

> Apple-esque feel with practical licensing.

- **Primary UI & Brand:** **Inter** (open source)  
  - Weights: **Regular, Medium, SemiBold**  
  - Optical balance: slightly tighter tracking on headings (-1% to -2%)  
- **Alternative for Apple-only interfaces:** **SF Pro / SF Pro Display** (follow Apple license; don’t use for web/print marketing unless allowed)

#### Type Scale (4-pt rhythm)
| Role | Size | Line | Weight |
|---|---|---|---|
| Display | 48 | 56 | SemiBold |
| H1 | 32 | 40 | SemiBold |
| H2 | 24 | 32 | Medium |
| H3 | 20 | 28 | Medium |
| Body | 16 | 24 | Regular |
| Small | 14 | 20 | Regular |
| Micro | 12 | 16 | Regular |

- **Links:** Action color; underline on hover/focus; no underline at rest.  
- **Lists:** 8–12 px vertical rhythm; bullets aligned to text grid.

---

## 6) Layout, Spacing, Elevation

- **Grid:** 8-pt base, 12-column responsive on web; iOS/macOS align to platform grids.  
- **Container max width:** 1120 px (marketing), 1280 px (docs), app panes 320–720 px.  
- **Spacing tokens:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.  
- **Corner radius:** **12** (default), **16** (cards), **24** (modals), **999** (pills).  
- **Elevation tokens:**
  - **E-00:** none  
  - **E-01:** subtle shadow `0 1px 2px rgba(15,23,42,.06)`  
  - **E-02:** card shadow `0 4px 16px rgba(15,23,42,.08)`  
  - **E-Glass:** background blur 20–32 px + `rgba(255,255,255,.72)`

> Preference: elevation through **layering & blur**, not heavy shadows.

---

## 7) Iconography & Illustration

- **Icon set:** Rounded 2 px strokes, 2° optical corrections; caps/joins round.  
- **Metaphors:** navigation, orientation, time, focus (compass, needle, waypoints).  
- **Sizes:** 16/20 in dense UI; 24/28 standard; 48 in empty states.  
- **Color:** Slate for inactive; Action for active; never full black.

- **Illustrations:** Soft geometric shapes with Dawn/Aurora gradients, diffused bloom, subtle grain (<2%).

---

## 8) Motion & Interactions

- **Philosophy:** functional, subtle, reassures state change.  
- **Durations:** 160 ms (micro), 240 ms (standard), 300 ms (modal/scale).  
- **Curves:** `cubic-bezier(0.22,1,0.36,1)` for ease-out; spring (damping ~14, stiffness ~180) for component entrances.  
- **Examples:**
  - Button press: 0.96 scale for 80 ms then restore.  
  - Sheet: fade + 6 px upward translate.  
  - Progress: linear sweep with eased endpoints.

---

## 9) Accessibility

- Body text contrast **≥ 4.5:1**; large text **≥ 3:1**.  
- Focus rings: 2 px, **Action** color, 2 px outer offset.  
- Hit targets ≥ 44×44 px.  
- Motion reduce: respect `prefers-reduced-motion`; replace complex transitions with fades.  
- Dynamic type: don’t break layout at 120% text size; content reflows gracefully.

---

## 10) Core UI Components (spec excerpts)

### Primary Button
- Height: 40 px; padding 12–16; radius 12.  
- Background: **Action** → **Action-Hover** on hover; text **Snow**.  
- Focus: 2 px ring (Action) + 2 px offset.  
- Disabled: background **Stone**, text **Slate** (50% alpha).

### Secondary Button (Ghost)
- Border 1 px **Stone**; text **Ink**; hover **Cloud** fill.

### Card
- Background **Cloud**, Elevation **E-02**, radius 16, 16–24 padding.  
- Dividers: 1 px **Fog**; section titles H3.

### Input
- Height 40 px; background **Snow**; border 1 px **Stone** → **Action** on focus.  
- Placeholder Slate (70%); text Ink; radius 12.

### Navigation
- App sidebar: 16 px padding, selected state pill **Action** (10% tint) + 4 px bar.  
- Topbar: 56 px height; blur **E-Glass** when overlaying content.

---

## 11) Marketing System

### Composition
- Lots of negative space; single focal device frame; subtle Dawn gradient backplate.  
- Headline (H1), subhead (Body), primary CTA (Action), secondary link.

### Photography/Mockups
- Device frames with soft reflections; shadows **E-02**; background **Snow** → **Dawn**.  
- Avoid harsh contrast; favor diffuse, natural light.

### Social Tiles
- Sizes: 1080×1080, 1920×1080.  
- Layout: 120 px margins; headline ≤ 7 words; glyph watermark 8% opacity.

---

## 12) App Icon & Store Assets

- **Shape:** use platform masks (iOS/macOS squircle).  
- **Background:** **Dawn** or **Aurora** gradient; subtle 1–2% grain.  
- **Glyph:** compass needle in **Snow** at 78–82% of safe area; no text.  
- **Avoid:** drop shadows, busy textures, high contrast outlines.

---

## 13) Brand “Do / Don’t”

**Do**
- Use one accent per screen.  
- Keep copy short and concrete.  
- Align everything to the 8-pt grid.  
- Prefer blur and layering to heavy shadows.

**Don’t**
- Mix multiple gradients in the same component.  
- Use saturated reds as accents except for errors.  
- Stack more than two fonts.  
- Animate for flair alone.

---

## 14) Design Tokens (starter)

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
```

**Gradient examples**
```css
.bg-dawn { background: linear-gradient(180deg,#CFE9FF 0%,#E1D9FF 100%); }
.bg-aurora { background: linear-gradient(180deg,#C9F0DE 0%,#CFE9FF 100%); }
```

---

## 15) Accessibility Swatches (recommended pairs)

- **Text on Snow/Cloud:** Ink (#0F172A) → AA+  
- **Muted text on Snow:** Slate (#8A94A6) for secondary (ensure role-appropriate)  
- **CTA on Snow:** Action (#2A6FF2)  
- **Reverse text on Action:** Snow (#FCFCFD)

> Always verify contrast for dynamic overlays and gradients.

---

## 16) Content Templates

### Product one-liner
> *Compass helps you find, start, and finish the one thing that matters right now.*

### Feature blurb pattern
- **Header (H3):** 4–6 words  
- **Body (≤ 2 sentences):** what + outcome  
- **CTA:** verb-first (“Try focus mode”)

### Release notes
- Sections: *New*, *Improved*, *Fixed*  
- Bullet points, present tense, no emoji.

---

## 17) File & Export Specs

- **Vectors:** SVG (UI), PDF (print), outline text for wordmark.  
- **Rasters:** PNG @1x/@2x/@3x; JPG for photo-heavy hero.  
- **Color profiles:** sRGB for screen; CMYK coated for print (proof pastel shifts).  
- **Naming:** `compass_[asset]_[size]_[bg].ext`  
  - Example: `compass_logo-glyph_256_snow.png`

---

## 18) Governance

- **Updates cadence:** review tokens and accessibility quarterly.  
- **Source of truth:** Figma library “Compass • Brand & UI”.  
- **Change policy:** semantic versions; document diffs in `/changelog.md`.

---

## 19) Roadmap (Nice-to-have next)

- Extended illustration set (orientation metaphors).  
- Dark mode palette (ink reversed, chroma tempered).  
- Motion library (Lottie) for onboarding cues.  
- Icon font subset for performance.

---

### Licensing Notes
- **Inter** is open source (SIL OFL).  
- **SF Pro**/**SF Symbols**: Apple-licensed; use only per Apple’s terms within Apple platform interfaces. Avoid for marketing sites unless permitted.

---

## Appendix A — Logo Construction (quick reference)

1. Draw a circle.  
2. Place a 35° needle (rounded cap) from center to rim, stroke = 1/12 of diameter.  
3. Add center dot (1/24 of diameter) or hollow at large sizes.  
4. Optical adjust: tiny vertical nudge to balance perceived weight.  
5. Export glyph and lockups with clear space baked into artboards.
