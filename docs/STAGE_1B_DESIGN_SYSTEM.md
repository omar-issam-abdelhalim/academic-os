# STAGE_1B_DESIGN_SYSTEM.md

**Status: Phase A (Visual Direction) and Phase B (Foundations) complete and APPROVED. Phase C (Components) through Phase H (Handoff) were not completed in Figma — see the execution note below.**

> **Stage 2 execution note (product-owner approved):** Figma work on this stage stalled on the Starter-plan tooling constraints described in §0 below (3-page limit, single-mode variable collections, an MCP rate limit) partway through Phase B. Rather than blocking implementation on further Figma work, the project moved directly to code implementation for everything below Phase B — components, screens, and states are built in Stage 2 against the token foundations already established here (§3–§10) and the approved `STAGE_1A_UX_ARCHITECTURE.md`, not against additional Figma mockups. See `docs/ROADMAP.md` (Stage 1 entry) and `docs/STAGE_2_REPORT.md` for what this means in practice. This file's content below is left as originally authored — it is not rewritten to look more complete than the Figma file actually is.

This is not a finished Stage 1B document. It is being built incrementally per the brief's own "Working Method" (§45): foundations before components, components before screens. Do not treat this as ready for the final Stage 1B Review Report — that comes at the end, once Phases C–G are done. Sections below are numbered to match the brief's required table of contents; sections not yet reached are marked `[PENDING]` rather than faked.

---

## 0. Infrastructure note (read this first)

The connected Figma workspace (`Omar Issam's team`) is on the **Starter plan**, which imposes three real constraints discovered while building this file, not design choices:

1. **3-page limit per file.** The brief's 00–06 page structure (Cover / Foundations / Components / Mobile / Desktop / States / Handoff) doesn't fit. I collapsed it to 3 pages and used Figma **Sections** as the sub-page organizational unit instead:
   - `01 — Foundations (incl. Cover)`
   - `02 — Components`
   - `03 — Screens, States & Handoff`
2. **1 mode per variable collection.** Native Figma "modes" (the built-in Light/Dark switcher) require a paid tier. Instead, Light and Dark each live in their **own collection** (`Color / Light`, `Color / Dark`), with **identical variable names** across both, so they pair up conceptually and can be merged into two modes of one collection with a single migration step if the team upgrades later.
3. **MCP tool-call rate limit**, which I hit this session partway through Phase B. Figma work is paused until that resets (typically rolls over on a schedule Anthropic/Figma control — practically, retry in a new session) or the plan is upgraded, which would also resolve constraints 1 and 2.

**Recommendation:** if Academic OS's Figma work is going to continue at the scope this brief describes (full component library + ~22 reference screens with states), a Figma **Professional** seat is worth it — it removes all three constraints above. This is a tooling/budget decision for you, not something I can route around indefinitely with workarounds.

**Figma file:** [Academic OS — Design System](https://www.figma.com/design/G1GJhmankrnJ4CyG1I61Vp) (file key `G1GJhmankrnJ4CyG1I61Vp`)

Built so far, in order, on page `01 — Foundations`:
- Section `00 — Cover`
- Section `01 — Color Tokens (Light)` — 20 semantic swatches, screenshot-verified
- Section `02 — Color Tokens (Dark)` — 20 semantic swatches, screenshot-verified
- Section `03 — Tag Colors (Light + Dark pairs)` — 9 hues × 2 themes
- Section `04 — Typography Ramp` — 12 of 14 text styles as live samples (created successfully; screenshot verification was in progress when the rate limit hit, so treat this one section as *unverified-but-likely-correct* until re-checked — it used the identical binding pattern as the two color sections that did verify cleanly)

---

## 1. Visual Philosophy

**Working name: "Structured Calm."**

Academic OS's content — dense rich-text notes, grade tables, weekly timetables, task lists — already has structure. The job of the visual system is to reveal that structure through typography, spacing, and alignment, not to impose a second layer of structure on top via containers. Concretely, this means:

- **Hierarchy is carried by type and space first, containers second.** A card is used when content genuinely needs a boundary (a distinct Course in a list, a Content Block that could be reordered) — not by default. Per the brief's own rule (§2, "CARDS MUST HAVE A REASON"), every container in this system should be traceable to a reason: groups something draggable/reorderable, separates genuinely unrelated content, or marks a distinct interactive target.
- **Numbers are treated as instruments, not decoration.** Grades, scores, times, and dates are the load-bearing content of this app — a mis-read `8/10` or `10:00` has real consequences. They get their own typeface (monospace, tabular) so they line up and read precisely, the way a ledger or boarding-pass display does.
- **The academic-editorial register, not the SaaS-dashboard register.** A serif is used, deliberately and sparingly, for the pieces of UI that represent the user's actual academic identity (a course name, a unit title, the Semester Setup/End moments) — everywhere else stays a clean grotesque sans. This is the single biggest lever for not reading as "Notion/Linear/Todoll clone," because none of those products use a serif anywhere.
- **Progressive disclosure is a typographic technique, not just an interaction pattern.** Secondary/tertiary text tokens exist specifically so metadata (course code, timestamps, "recorded so far") can sit quietly next to primary content without needing its own box or icon to be visually deprioritized.

## 2. Theme Strategy

**Recommendation: Light is the primary/default design surface. Dark is a fully first-class, completely token-equivalent second theme**, proven out through the color-token pass (§6) and a representative subset of screens in Phase D–E, rather than every screen designed twice.

Rationale:
- Academic OS's primary content is *reading* — rich-text notes, grade tables, schedules — over extended sessions. Light backgrounds with dark, high-contrast text remain the more legible default for sustained reading of dense text (the same reasoning e-readers default to light).
- "Premium academic tool" reads more credibly on a warm, paper-toned light canvas than on a dark canvas — dark-by-default currently signals "developer tool" (Linear, most code editors) more than "academic instrument," and the brief explicitly asks not to converge on that register.
- Students studying at night is a real use case, which is exactly why Dark isn't an afterthought — it's built as a parallel, equally-complete token set (§6) from the start, just not the surface most reference screens are designed against first.

`AppPreferences.theme` (`system | light | dark`, per DATA_MODEL.md) is respected either way — this recommendation is about which theme gets the majority of *design attention* in Phase D–E, not about degrading dark-mode support.

## 3. Typography

**Three-family system, each with a distinct job:**

| Role | Typeface | Why |
|---|---|---|
| Headings that represent the user's own academic content (course names, unit titles, Semester Setup/End moments, the wordmark) | **Source Serif 4** (variable, SIL OFL, Google Fonts) | Gives Academic OS an editorial/scholarly identity distinct from sans-only productivity tools, without being fusty — Source Serif 4 renders cleanly at UI sizes, unlike many book serifs. |
| All UI chrome, body text, labels, buttons | **IBM Plex Sans** (variable weight range, IBM's open license, Google Fonts) | Highly legible at small sizes, technical/precise character fitting "operating system," metric-compatible with Plex Mono below (same designer family), avoids the extremely common Inter-everywhere look. |
| Anything numeric-dense: grades, scores, times, dates | **IBM Plex Mono** | Tabular figures and fixed-width digits mean grade columns and schedule times align vertically without extra tab-stop logic — this is a functional choice (ledger-like scanning), not a stylistic one, and it shares metrics with Plex Sans so mixed numeric+label rows don't clash. |

All three verified available and loadable in the connected Figma file with the exact style names Regular/Medium/SemiBold (confirmed via `listAvailableFontsAsync` before use — Plex families use "SemiBold" not "Semi Bold," consistent with Source Serif 4).

**Fallback stack for implementation:**
```
--font-serif: "Source Serif 4", Georgia, "Times New Roman", serif;
--font-sans: "IBM Plex Sans", -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: "IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace;
```

**Type ramp (built as Figma text styles, mobile-first sizes; desktop may step h1/h2 up ~2px, not redefined per breakpoint):**

| Style | Family / weight | Size / line-height | Used for |
|---|---|---|---|
| Display/Serif | Source Serif 4 SemiBold | 28/36 | App wordmark, Semester Setup/End headline moments |
| Heading/Serif-H1 | Source Serif 4 SemiBold | 22/28 | Course name, Unit title (content identity headers) |
| Heading/H2 | Plex Sans SemiBold | 20/26 | Page titles (Home, Courses, Tasks…) |
| Heading/H3 | Plex Sans SemiBold | 17/24 | Section headings within a screen |
| Body/Large | Plex Sans Regular | 16/24 | Rendered rich-text note body |
| Body/Default | Plex Sans Regular | 15/22 | Default UI text, task titles, list rows |
| Body/Small | Plex Sans Regular | 13/18 | Secondary/metadata line under a primary line |
| Label/Caption | Plex Sans Medium | 12/16 | Status badges, small labels |
| Label/Micro | Plex Sans Medium, +4% tracking | 11/14 | Uppercase eyebrows, collapsed-week date headers |
| Label/Default | Plex Sans Medium | 13/16 | Form field labels |
| Numeric/Large | Plex Mono Medium | 24/28 | Grade totals, big scores |
| Numeric/Medium | Plex Mono Medium | 17/22 | Schedule times, grade-row numbers |
| Numeric/Small | Plex Mono Medium | 13/16 | Compact metadata numbers (task-row due countdown, etc.) |
| Button/Default | Plex Sans SemiBold | 15/20 | All button labels |

## 4. Color — Token Architecture

Semantic tokens only (no separate primitive layer surfaced in Figma, to keep the Starter-plan variable count manageable) — named `group/token`, matching the brief's semantic-naming guidance (`color.bg.canvas`, not `gray500`). Every token exists in **both** `Color / Light` and `Color / Dark` collections under the identical name.

**Light theme values:**

| Token | Hex | Role |
|---|---|---|
| bg/canvas | `#FAFAF7` | App background — warm paper white, not clinical pure-white |
| bg/surface | `#FFFFFF` | Cards, rows, default elevated content |
| bg/surface-raised | `#FFFFFF` | Sheets/dialogs/popovers (paired with Elevation effect styles, §7) |
| bg/sunken | `#F2F1ED` | Input fields, recessed areas |
| border/default | `#E4E2DC` | Standard dividers/borders |
| border/strong | `#CFCCC3` | Emphasized borders (focus-adjacent, input on hover) |
| text/primary | `#201F1B` | Primary reading text |
| text/secondary | `#5B5952` | Metadata, secondary lines |
| text/tertiary | ~~`#8B8880`~~ → `#6E6A62` (Stage 2 finalization fix — see docs/STAGE_2_REPORT.md; the original value measured 3.13–3.38:1 against bg/sunken and bg/canvas via an automated axe-core scan, below WCAG AA's 4.5:1 for normal text) | Timestamps, least-emphasized labels |
| text/disabled | `#B7B4AB` | Disabled control text |
| text/inverse | `#FAFAF7` | Text on filled accent surfaces |
| action/primary | `#2B4C7E` | Ink-blue — the *only* primary accent; buttons, links, selected states |
| action/primary-hover / -pressed / -subtle | `#1F3A63` / `#17304F` / `#EAF0F8` | Interaction states for the accent |
| status/success, /success-subtle | `#3F7857` / `#E8F3EC` | Attended, completed, positive confirmation |
| status/warning, /warning-subtle | ~~`#9C6B1F`~~ → `#91631A` / `#FBF1E1` (Stage 2 finalization fix — see docs/STAGE_2_REPORT.md; the original value measured 4.13:1 against warning-subtle via an automated axe-core scan, below WCAG AA's 4.5:1) | "Attendance not recorded," partial-allocation notices |
| status/danger, /danger-subtle | `#A43E33` / `#FBEAE7` | Destructive actions, Missed, overdue |
| status/info, /info-subtle | `#3E6C8C` / `#E9F2F7` | Neutral informational callouts |
| focus/ring | `#2B4C7E` | Keyboard focus ring (same as primary — one accent, no competing focus color) |
| overlay/scrim | `#14130F` @ 45% | Backdrop behind sheets/dialogs |

**Dark theme** mirrors every token with lightness/contrast re-tuned for a dark canvas (e.g., `bg/canvas` → `#17181A`, `action/primary` brightened to `#6C93C7` for AA contrast on dark surfaces, `overlay/scrim` → black @ 60%). Full values are in the Figma file's `Color / Dark` collection (screenshot-verified).

**Deliberate restraint, per brief §6:** exactly one primary accent (ink-blue) is used for all primary interactive moments. There is no secondary accent — status colors (success/warning/danger/info) are reserved strictly for their semantic meaning and never used decoratively, so a course list with many colorful Tags never competes visually with the app's own action color.

**Tag/Course color palette:** 9 curated, desaturated hues (Slate, Sage, Clay, Amber, Plum, Teal, Rose, Olive, Stone), each with a paired light-mode and dark-mode swatch so a user's chosen tag color is never re-derived or guessed per theme — it's a fixed pair, both pre-checked to hold up against their respective canvas/text tokens. Per PRODUCT_SPEC.md/Stage 1A: tag color is always paired with the tag name label, never the sole carrier of meaning.

`[PENDING — Phase G]`: a formal computed-contrast-ratio table (WCAG 2.2 AA, 4.5:1 body / 3:1 large text) for every text-on-background pairing above. The palette was chosen with AA in mind (action/primary on white ≈ 7:1), but exact ratios for every combination, and any adjustments needed, are part of the Phase G design audit, not asserted here as already verified.

## 5. Spacing

Base unit 4px. Token scale: `space/1`(4) `space/2`(8) `space/3`(12) `space/4`(16) `space/5`(20) `space/6`(24) `space/8`(32) `space/10`(40) `space/12`(48) `space/16`(64) `space/20`(80).

- **Mobile page gutters:** `space/4` (16px).
- **Desktop content padding:** `space/8`–`space/10` (32–40px); sidebar-adjacent content area max-width ~1120–1200px, centered within wider viewports rather than stretching indefinitely.
- **List-row internal padding:** `space/3`–`space/4` vertical, `space/4` horizontal.
- **Section spacing (within a screen):** `space/6`–`space/8` between major blocks (e.g., Home's current-class card and the task summary below it).

## 6. Radius

`radius/xs`(4) `radius/sm`(6) `radius/md`(10) `radius/lg`(16) `radius/xl`(24) `radius/pill`(999).

- Inputs, buttons, small controls, compact task-row checkboxes → `radius/sm`.
- Cards, list rows, Content Block containers → `radius/md`.
- Sheets, dialogs, larger modal surfaces → `radius/lg`–`radius/xl`.
- **Pill reserved for Tags/chips/filters only** (brief §10) — never applied to buttons or cards, so it stays a meaningful signal ("this is a removable/filterable label") rather than a generic decorative shape.

## 7. Elevation

Deliberately flat by default — most of the app (page content, list rows) uses **borders, not shadows**, for separation, consistent with the "calm density" principle. Shadows are reserved for true overlays that float above content:

| Effect style | Use |
|---|---|
| Elevation/2 – Popover | Menus, tooltips, the desktop Command Palette |
| Elevation/3 – Sheet | Mobile bottom sheets |
| Elevation/4 – Dialog | Confirmation dialogs, Start New Semester's destructive confirmation |

Flat page-level surfaces (Elevation/0–1) use `border/default` at 1px, no shadow — this is what keeps the "editorial, not skeuomorphic" read the brief asks for.

## 8. Iconography

**Library: Lucide** (MIT-licensed, already an approved library in the target React implementation stack per this environment's tooling — `lucide-react` — which makes this a zero-friction choice for eventual handoff, not just a Figma-side pick).

- Stroke weight: consistent 1.5px across all sizes.
- Sizes: `icon/sm`(16) for dense inline contexts (compact task rows), `icon/md`(20) default, `icon/lg`(24) primary navigation, `icon/xl`(28) reserved for rare emphasis (e.g., an empty-state icon, used sparingly per brief §30/§40 — not decorative illustration).
- **State convention:** outline by default; the *selected* item in mobile bottom nav / desktop sidebar switches to a filled variant of the same glyph. This gives a non-color-dependent way to show navigation state (accessibility requirement, brief §32/§U), on top of a label and/or accent-color underline.
- Icons are never the sole carrier of an ambiguous action — every icon-only control still needs an accessible label (existing Stage 1A requirement, carried forward here as a visual-system rule too).

## 9. Motion

Restrained, purposeful, never decorative:

| Token | Duration | Used for |
|---|---|---|
| motion/fast | 120ms | Checkbox toggle, button press feedback |
| motion/standard | 200ms | Sheet/dialog appearance, tab/segment switch |
| motion/deliberate | 320ms | Page transition, Week Overview → Day Detail drill-in |

Standard easing: ease-out on entrances, ease-in on exits. No spring/bounce anywhere except (optionally) task-completion confirmation, and even that degrades to instant under `prefers-reduced-motion`. Every token above collapses to an instant or opacity-only change when reduced motion is requested — no exceptions, per brief §33.

## 10. Responsive / Breakpoints

| Breakpoint | Range | Behavior |
|---|---|---|
| Mobile | <600px | Single column, bottom nav, sheets for focused actions (per Stage 1A) |
| Tablet | 600–1024px | Still single-column-dominant but wider gutters; Courses may go 2-column grid where it doesn't fight master-detail |
| Desktop | ≥1024px | Persistent sidebar, master-detail (Courses+Course Detail, Unit list+Unit Detail), full Sat–Fri schedule grid |
| Wide | ≥1440px | Content max-width caps engage; extra space becomes margin, not new columns, per brief §5 ("do not simply stretch mobile cards across the viewport") |

`[PENDING — Phase D/E]`: the full per-screen responsive relationship table the brief requests in §38 (what's invariant / what becomes multi-column / what becomes an overlay vs. persistent panel) — this needs to be authored screen-by-screen once those reference screens exist, not asserted in the abstract.

## 11. Figma File Structure (as actually built, adapted for the Starter-plan 3-page limit)

```
01 — Foundations (incl. Cover)
  Section: 00 — Cover
  Section: 01 — Color Tokens (Light)          ✅ built + screenshot-verified
  Section: 02 — Color Tokens (Dark)            ✅ built + screenshot-verified
  Section: 03 — Tag Colors (Light + Dark)      ✅ built
  Section: 04 — Typography Ramp                ✅ built, verification pending
  [PENDING] Section: 05 — Spacing & Radius scale (visual)
  [PENDING] Section: 06 — Elevation samples
  [PENDING] Section: 07 — Iconography sheet

02 — Components
  [PENDING — Phase C, not started]

03 — Screens, States & Handoff
  [PENDING — Phase D onward, not started]
```

Variable collections created: `Color / Light`, `Color / Dark`, `Tag Colors / Light`, `Tag Colors / Dark`, `Spacing`, `Radius`, `Icon Size` — plus 3 effect styles (`Elevation/2 – Popover`, `Elevation/3 – Sheet`, `Elevation/4 – Dialog`) and 14 text styles (§3 table). All variables carry `WEB` code syntax (e.g. `var(--color-action-primary)`) so implementation can consume them directly.

## 12. Reference Screen Inventory — planned, not yet built

Unchanged from the brief's own list (§36): 15 mobile + 7 desktop reference screens. None are built yet. This is Phase D/E work.

---

## 13–30. `[PENDING]`

Everything from Core Components (§13 of the brief) through Implementation Handoff Notes (§29–30) depends on Phase C (components) and Phase D–G (screens, states, audit), none of which have started. I'm not going to write placeholder-sounding prose for these — they'll be written against what's actually built in Figma, matching the brief's own instruction not to leave critical behavior implicit, which cuts both ways: it also means not asserting completeness that isn't there yet.

---

## Self-critique so far (partial — full pass is Phase G)

- The three-typeface system is the single highest-leverage identity decision made in this pass — worth defending if questioned later, since it's the main thing standing between Academic OS and "looks like every other Plex/Inter productivity app."
- Light-as-primary is a real, arguable call, not an obvious one — dark-default is currently more fashionable in this exact product category. I'm confident in the reading-legibility argument for *this* content type specifically; flag if you disagree, since it's a foundational decision that everything else in Phase D onward will be designed against first.
- Reducing 25 token names to fit both light/dark collections manually (no native mode-switch) means implementation will need a theme-switching mechanism at the CSS-variable level (e.g., `[data-theme="dark"]` scoping) rather than relying on Figma's mode export — worth noting for whoever picks up the Stage 2 CSS architecture.
