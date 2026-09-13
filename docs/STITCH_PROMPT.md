# UniTalks — Stitch Prompts (flat / bold / warm — "Amber Paper" direction)

**Direction:** flat, bold, friendly and modern. Warm amber canvas, crisp white cards with big
rounded corners, ink-black chunky buttons, candy-coloured chat bubbles with small circular badge
pins, subtle graph-paper grid texture. **No glassmorphism, no blur, no neon glow, no dark-neon
gradients.** High contrast, generous spacing, playful but premium.

How to use this file:

- **Part 0** is for you, not for Stitch. Three things in the repo must change or this design cannot
  render at all. Read it first.
- **Part A** is the master style block. Paste it at the top of **every** Stitch generation.
- **Part B** has one prompt per screen, each listing every UI component that screen needs. Generate
  one screen at a time.
- **Part C** is the responsive spec. **Part D** is how to land the output in the codebase.

---

## PART 0 — Three blockers to fix before this design can render

### Blocker 1: the global CSS kills every solid fill

`public/index.html` contains:

```css
* { background-color: transparent !important; }
div, section, article, main, aside, nav, header, footer { background-color: transparent !important; }
```

This design is built on **solid flat fills** — white cards, amber canvas, black buttons. That
`!important` rule destroys all of them. Previously the codebase dodged it with gradients; that
trick does not help here, because a flat design should not be faking every fill with a gradient.

**These two rules must be deleted. This is mandatory, not optional.**

The same file also force-styles all `input`, `textarea`, `select`, `button` with
`background-color`, `color` and `border` marked `!important` (dark fill, green border). Delete that
rule too — the new inputs are white with a light grey border, and the new buttons are ink-black.

### Blocker 2: the app is hard-coded to a black theme

Also in `public/index.html`:

```css
html, body { background-color: #000000 !important; color: #ffffff; }
#root      { background-color: #000000 !important; min-height: 100vh; }
```

plus `<meta name="theme-color" content="#000000" />`.

This direction is **light-first**: amber canvas, white cards, dark text. All of the above must flip.
`theme-color` should become the amber. And `src/config/theme.js` `appBg` changes from `#000000` to
the amber.

### Blocker 3: light app, dark media screens — decide this consciously

The reference shows both: light screens (sign-in, message list) **and** one dark screen (the chat
with the grid texture). That maps cleanly onto this product:

- **Light amber canvas:** landing, mode picker, static pages, modals, text chat.
- **Dark ink canvas:** the **video** and **voice** screens — video always reads better against
  near-black, and the reference's dark card is exactly that surface.

Both use the same tokens, corner radii, type and button shapes, so it stays one system.

### Also worth knowing

- Google Fonts are already wired in `public/index.html`, so adding **Plus Jakarta Sans** is a
  one-line change.
- The **Press Start 2P** pixel wordmark in the Header should go — it is the single most dated
  element in the current UI. Replace it with a bold geometric wordmark.
- `backdrop-filter` appears in ~20 places in the codebase. This direction does not use it; those
  declarations can be stripped as you restyle each file.

---

## PART A — Master style prompt (paste at the top of every Stitch prompt)

> **Design system — UniTalks**
>
> Design a **modern, flat, bold and friendly** web UI. Warm amber canvas, crisp white cards with
> large rounded corners, ink-black chunky buttons, candy-coloured chat bubbles. Think the polish of
> a well-made consumer messaging app: confident, playful, high-contrast, effortlessly readable.
>
> **Explicitly NOT:** glassmorphism, frosted blur, neon glow, dark gradients, drop-shadow-heavy
> skeuomorphism, or corporate SaaS blue-grey. Fills are **flat and solid**.
>
> **Product context:** UniTalks is an anonymous, random 1-to-1 stranger chat for college students in
> India. Three modes — text, voice, video. No accounts, no signup, fully anonymous. It should feel
> warm, safe, fun and fast.
>
> **Colour tokens** — output as CSS custom properties at `:root` **and** as a JS object:
> ```
> --sun:       #F9C74A   /* brand amber — primary page canvas */
> --sun-deep:  #F0B429   /* darker amber — pressed states, accents */
> --sun-tint:  #FDE9AE   /* pale amber wash — highlights, selected rows */
> --ink:       #1C1C1E   /* near-black — dark canvas, primary buttons, headings */
> --ink-soft:  #2C2C2E   /* raised surface on the dark canvas */
> --paper:     #FFFFFF   /* white cards and sheets */
> --paper-alt: #F7F7F8   /* light grey wells — toolbars, input backgrounds */
> --line:      #E5E5EA   /* hairline borders */
> --muted:     #8A8A8E   /* secondary text, timestamps */
> --blue:      #2D7FF9   /* action accent — own chat bubbles, badges, links */
> --blue-soft: #7FB2F7   /* secondary blue bubble */
> --orange:    #F59033   /* highlight accent — NEW badges, emphasis bubbles */
> --green:     #34C759   /* success / connected */
> --red:       #FF3B30   /* danger / stop / disconnect */
> ```
> Use amber as the **canvas**, white as the **content surface**, ink as the **primary action**, and
> blue/orange sparingly as **accents**. Never put amber text on white or white text on amber —
> always pair amber with ink.
>
> **Surfaces and texture**
> - Page canvas: solid `--sun` on light screens, solid `--ink` on the video/voice screens.
> - Over the canvas, a **very subtle graph-paper grid**: 1px lines at ~6% opacity, ~40px pitch. On
>   the dark canvas use faint dotted-grid instead. Texture only — never visually noisy.
> - Content sits on **solid white cards** with large radii and a very soft shadow
>   (`0 2px 12px rgba(0,0,0,0.06)`), or none at all. No blur, no translucency.
>
> **Shape**
> - Cards and sheets: **28px** radius. Panels and list rows: **20px**. Inputs: **14px**.
> - Buttons: **14px** radius (chunky rounded rectangle), not fully-round pills, except small icon
>   buttons and badges which are perfect circles / `999px`.
> - Chat bubbles: **18px**, with a single slightly-tightened corner on the sender's side.
> - Some elements carry a **crisp 1.5px ink outline** instead of a shadow — use this on white chat
>   bubbles and on secondary buttons. It is a signature of this style.
>
> **Typography**
> - Primary typeface **Plus Jakarta Sans** (Google Fonts) — geometric, friendly, excellent bold
>   weights. Fallback stack: `'Plus Jakarta Sans', Inter, -apple-system, system-ui, sans-serif`.
> - Headings are **heavy and tight**: 700–800 weight, `letter-spacing: -0.03em`. Big display
>   headings can go 800.
> - Scale: Display 40/44 · Title 30/36 · Section 22/28 · Headline 17 semibold · Body 16/24 ·
>   Label 14 semibold · Caption 12.
> - Body text `--ink` at full strength; secondary text `--muted`. Timestamps and counts in tabular
>   numerals.
> - Labels above inputs are **small, bold and dark** — not floating placeholders.
>
> **Buttons**
> - **Primary:** solid `--ink` fill, white bold label, 14px radius, tall (52px desktop / 50px
>   mobile), often **full-width** inside cards. This is the hero control.
> - **Secondary:** white fill with a 1.5px `--ink` outline, ink label.
> - **Accent:** solid `--blue` with white label — for confirmations and positive actions.
> - **Destructive:** solid `--red` with white label — for Stop / Disconnect.
> - **Icon buttons:** perfect circles, `--paper-alt` fill on light surfaces, `--ink-soft` on dark.
> - Text links: `--blue`, semibold, underline on hover.
>
> **Signature details to use throughout**
> - **Badge pins:** small circular badges (22–26px) in `--blue` with a white glyph, **overlapping
>   the corner** of a bubble or card. They add the playful, sticker-like quality.
> - **Status pills:** tiny uppercase pills in `--orange` (e.g. `NEW`) or `--green` (e.g. `LIVE`),
>   bold, 11px, high contrast.
> - **Grouped icon toolbar:** a rounded `--paper-alt` container holding 3 icon buttons in a row.
> - Inline emoji used naturally inside chat bubbles and labels.
>
> **Motion — fluid, snappy, bouncy (not floaty)**
> - Easing `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot) for entrances;
>   `cubic-bezier(0.4, 0, 0.2, 1)` for exits. 200–320ms for surfaces, 120–180ms for controls.
> - **Press state on every interactive element:** `transform: scale(0.97)` + a 1-shade darker fill,
>   120ms.
> - Chat bubbles **pop in**: fade + rise 8px + scale from 0.94 with a small overshoot. Badge pins
>   pop a beat later.
> - Buttons: a subtle 2px lift on hover, settling on press.
> - Sheets and modals slide up from the bottom with an overshoot; the backdrop dims (solid
>   `rgba(28,28,30,0.45)` — **dim only, no blur**).
> - Cards on hover: lift 2px, shadow softens outward.
> - Route changes: cross-fade + 8px drift.
> - Loading: a shimmer sweep across `--paper-alt` skeletons. "Searching": three bouncing dots in
>   `--ink`, staggered.
> - **All motion must degrade under `@media (prefers-reduced-motion: reduce)`** — the project
>   already ships that media query.
>
> **Interaction rules**
> - Minimum 44×44px touch target everywhere.
> - Visible focus ring: 3px `--blue` at 40% opacity, offset 2px. Do not remove outlines.
> - Respect `env(safe-area-inset-bottom)` on bottom bars.
> - Body text must clear 4.5:1 contrast on its surface.
>
> **Output format**
> - **HTML + CSS** (or React + styled-components).
> - **Flat solid `background-color` fills** — no gradients faking flat colour, no `backdrop-filter`.
> - Tokens as CSS custom properties at `:root`.
> - Mobile-first CSS with one breakpoint at **768px**.

---

## PART B — Per-screen prompts

Append each block **after** the Part A master block.

---

### B1 — App shell: header, footer, navigation, mobile menu

> Design the persistent app chrome on the amber canvas.
>
> **Desktop header** (`fixed`, full width, **72px tall**, above all content): solid amber matching
> the canvas, with a 1px `--line` bottom border that only appears once the page is scrolled.
> Contents left to right:
> - **Logo lockup** — circular logo mark + the wordmark "UniTalks" in **800 weight, tight
>   letter-spacing**, ink coloured. (Do not use a pixel/retro font.)
> - **Nav group**, right-aligned — three links: `Text Chat`, `Voice Chat`, `Video Chat`. Inactive =
>   ink text, no fill. **Active = solid ink chip with white text**, 14px radius. Hover = `--sun-deep`
>   chip with ink text.
> - A **"Report Bug"** secondary button: white fill, 1.5px ink outline.
>
> **Mobile header** (≤768px, min-height 60px): logo lockup left, nav hidden, and a **circular
> hamburger button** (44px, white fill, ink icon) right.
>
> **Mobile menu** — a **bottom sheet sliding up** over a dimmed (not blurred) backdrop. White,
> 28px top corners, with: a **grabber handle**, a title row with a circular close button, then large
> list rows each with a leading icon in a rounded `--paper-alt` square — `Home`, `Text Chat`,
> `Voice Chat`, `Video Chat`, `About`, `Help`, `Contact`, `Privacy`, `Terms` — each row with a
> chevron, separated by `--line` hairlines. A full-width ink **"Report Bug"** button pinned at the
> bottom. Rows press to `scale(0.98)` with a `--sun-tint` flash. Dismiss by swipe-down or backdrop tap.
>
> **Footer** (landing page only): a white card strip with a centred row of links —
> `Privacy · Terms · About · Contact · Help` — divided by thin `--line` separators, and a copyright
> line below carrying the brand name.
>
> Show: header default, header scrolled, nav active/inactive/hover, hamburger closed/open, sheet
> mid-animation.

---

### B2 — Landing page (`/`)

> Design the marketing landing page on the amber canvas with the faint graph-paper grid. It is the
> only fully scrollable page.
>
> Components:
> - **Top nav** — the header from B1, plus `Try video` / `Try voice` text links and a primary CTA.
> - **Hero block** — a small **kicker pill** (white, ink outline, 11px uppercase bold) above a
>   large **display headline** in 800 weight with tight tracking, where one word is set in a
>   **hand-drawn highlight** — an amber-deep marker swipe or a circled scribble behind it. Below,
>   a **subheadline** in `--muted`, then a **CTA group**: a full-width-on-mobile ink primary button
>   ("Start Chatting") and a white outlined secondary ("Try video").
> - **Hero visual** — a cluster of **tilted, overlapping chat-bubble cards** floating beside the
>   headline, exactly in the reference style: white bubbles with 1.5px ink outlines, one amber
>   bubble, one orange bubble, one blue bubble, each with a small **circular blue badge pin**
>   overlapping its corner. They should drift gently and stagger-animate in.
> - **Animated ticker** — a horizontal marquee strip in solid ink with white bold text, scrolling
>   infinitely, pausing on hover, with an inline amber chip.
> - **Feature grid** — three **white cards**, 28px radius, soft shadow: **Text Chat**, **Voice
>   Chat**, **Video Chat**. Each has a large **rounded-square icon tile** (amber / blue / orange
>   fill, ink glyph), a bold title, a one-line description in `--muted`, and a circular ink arrow
>   button bottom-right. Cards lift 2px on hover. Stack to one full-width column on mobile.
> - **Trust / safety section** — three short items with icon tiles: *anonymous*, *no signup*,
>   *nothing stored*.
> - **Footer** from B1.
>
> Sections fade and rise 12px as they enter the viewport.

---

### B3 — Mode picker (`/start-chat`)

> Design the mode selection screen. Amber canvas with grid texture, centred, generous vertical space.
>
> Components:
> - **Doodle layer** — light hand-drawn ink line-illustrations scattered in the margins at low
>   opacity, parallaxing subtly on pointer move. Never overlapping the cards on mobile.
> - **Tagline pill** — white, 1.5px ink outline, small bold uppercase text.
> - **Title block** — a big 800-weight title with one word carrying a **hand-drawn amber-deep
>   highlight swipe**, plus a `--muted` subtitle.
> - **Options row** — three large tappable **white cards**: **Text Chat**, **Voice Chat**,
>   **Video Chat**. Each contains a **rounded-square icon tile** (amber / blue / orange), a bold
>   **label**, a one-line **description**, and a **circular ink arrow** on the trailing edge. On
>   press: `scale(0.97)` and a 1.5px ink outline appears. Desktop = three across; ≤768px = stacked
>   full-width rows with the icon leading and the arrow trailing.
>
> Show default, hover and pressed card states.

---

### B4 — Video chat (`/video`) — the most important screen

> Design the video chat screen on the **dark ink canvas** with a faint dotted-grid texture (this is
> the dark card from the reference, full-screen). It is **locked to the viewport height with no page
> scroll** — only the message list scrolls internally. Design **two layouts** and **five states**.
>
> **Desktop layout (>768px)** — two columns:
> - **Left: video area.** A large **remote video feed**, 28px radius, on `--ink`. The local
>   **self-view is a small draggable picture-in-picture tile** in a corner, 20px radius with a 2px
>   white border. Over the remote feed: a **"Stranger" label** as a small white pill with ink text;
>   a **connection status pill** (`LIVE` in green, `CONNECTING` in amber); a **buffering overlay**
>   with a centred spinner; and a faint **watermark** (logo mark + wordmark) in a corner.
> - **Right: chat panel.** A **white card** column, 28px radius, containing a **chat header**
>   (title "Messages" in 800 weight, a status line, and a circular "New Chat" icon button), the
>   **scrolling message list**, and the **composer** pinned to the bottom. On the dark canvas this
>   white panel is the focal contrast — exactly like the reference's white message list.
> - **Bottom control bar** — a **grouped rounded `--ink-soft` container** holding circular icon
>   buttons: **Start**, **Stop** (red fill), **Skip**, **Mute/Unmute**, and a **"FUN"** button
>   (amber fill, ink glyph) that opens a popover. Exactly the grouped-toolbar pattern from the
>   reference, scaled up.
>
> **Mobile layout (≤768px)** — FaceTime style:
> - Remote video fills the **entire screen**; self-view is a small rounded draggable PiP that snaps
>   to corners.
> - Controls become a **floating grouped toolbar** near the bottom, above the safe-area inset.
> - Chat becomes a **white bottom sheet sliding up over the video** with a grabber handle, at ~70%
>   height, dismissible by swipe-down. It must **lift above the on-screen keyboard** when the
>   composer is focused.
> - A compact **mobile FUN row** replaces the desktop popover trigger.
>
> **The five states:**
> 1. **Idle** — not started. A centred white card over the dark canvas with a short line of copy and
>    one large full-width **ink primary button "Start Chat"**.
> 2. **Searching** — three bouncing dots, "Looking for someone…", an optional queue position, and a
>    visible **Cancel** action. (Important: one control serves as *Cancel search* while searching and
>    *Stop chat* once connected — design it to read correctly in both.)
> 3. **Connected** — live video, full toolbar, chat enabled, `LIVE` pill visible.
> 4. **Partner left / skipped** — a **toast**: white pill with ink text sliding down from the top,
>    auto-dismissing, then an automatic return to searching.
> 5. **Error** — e.g. "Camera blocked. Please enable it and try again." as a white card with an
>    orange icon tile and an ink retry button.
>
> The remote video must remain a **real rectangular video surface** at all times, including while
> hidden — never a decorative image block.

---

### B5 — Voice chat (`/voice`)

> Same dark-canvas shell, layout, toolbar and five states as B4, but with **no video**. Replace the
> feeds with:
> - A large centred **audio presence disc** — a solid amber circle with a thick ink ring that
>   **pulses and deforms organically** with the partner's voice amplitude. Flat and graphic, not
>   glowing or glassy.
> - A **live visualizer** — a ring of bold ink bars around the disc, or a chunky waveform beneath it.
> - A **"Stranger" label pill**, a **placeholder state** when not connected, and a **buffering
>   overlay**.
> - The same watermark, the same grouped control toolbar (Start / Stop / Skip / Mute / FUN), and the
>   same white chat panel — which is more prominent here since there is no video.
>
> Design the disc's idle, searching (slow pulse), speaking (reactive) and muted (grey fill with a
> crossed-mic glyph) states.

---

### B6 — Text chat (`/text`)

> Design the text-only chat screen on the **amber canvas** with grid texture — light, not dark.
>
> Components:
> - A centred **white conversation card** (max-width ~760px desktop, full-bleed on mobile), 28px
>   radius, viewport-locked; only the message list scrolls.
> - A **chat header** — "Messages" in 800 weight, a **search field** in a `--paper-alt` well with a
>   leading magnifier icon, and a circular "New Chat" button.
> - A **status line** ("Connected to a stranger", "Looking for someone…").
> - The **message list**, the **composer**, and a **grouped bottom toolbar** with **Start**, **Stop**
>   and **Skip**.
> - The same five states as B4.
>
> This screen is the reference for chat styling across all three modes — make the bubbles sing here.

---

### B7 — Chat message list and composer (shared across all three chat screens)

> Design the chat sub-system in detail; it is reused on the text, voice and video screens. This is
> the heart of the reference image — match it closely.
>
> Components:
> - **Message list** — smooth momentum scrolling, auto-scroll to newest, and a **"jump to latest"**
>   floating circular ink button when scrolled up.
> - **Message bubbles**, 18px radius, with **small circular blue badge pins overlapping the top
>   corner** carrying a tiny glyph (delivered / seen):
>   - **Stranger (left):** solid white fill with a **1.5px ink outline**, ink text.
>   - **Own (right):** solid `--blue` fill, white text, no outline.
>   - Occasional **emphasis bubbles** in `--orange` or `--sun` with ink text, for system highlights
>     or a quoted plan.
>   - Bubbles **pop in** with fade + rise + slight overshoot; the badge pin pops a beat after.
> - **Reply indicator inside a bubble** — a quoted strip above the text with a 3px ink left rule,
>   showing the sender and a truncated snippet at reduced opacity.
> - **Reply preview above the composer** — a `--paper-alt` strip with the quoted text and a circular
>   **cancel-reply** button.
> - **Conversation list row** (for the message-list view): circular avatar, bold name, a truncated
>   preview line in `--muted`, a right-aligned timestamp, and an optional **orange `NEW` pill**.
>   Rows separated by `--line` hairlines, pressing to a `--sun-tint` flash.
> - **Composer** — a `--paper-alt` well, 14px radius, containing a circular **emoji button**, an
>   auto-growing **text input** (to ~4 lines), and a **send button**: circular, greyed when empty,
>   snapping to solid `--blue` with a small bounce once text is entered.
> - **Emoji picker** — a white popover card, 20px radius with a soft shadow, scaling up from the
>   emoji button, with a grid of emoji that scale on press.
> - **Empty state** — a friendly line plus a small doodle illustration.
> - **Disabled state** — the composer must look clearly **inert until a partner is connected**,
>   since messages cannot be sent before then.
> - **System message** — a small centred `--paper-alt` pill with `--muted` text, e.g.
>   "Stranger disconnected".
>
> On mobile the composer must ride above the on-screen keyboard.

---

### B8 — "FUN" menu and game invite

> Design the in-call activities system.
>
> Components:
> - **FUN trigger** — an **amber circular button with an ink glyph** in the control toolbar; the
>   warmest, most inviting control on screen.
> - **FUN popover (desktop)** — a white card popover, 20px radius, scaling up from the trigger, with
>   rows: **Listen Along**, and a **"Play Along"** row expanding inline (animated height, no jump)
>   to **Chess** and **Truth and Dare**. Each row has a rounded-square icon tile, a bold label, and
>   a chevron; hover fills the row `--sun-tint`.
> - **FUN menu (mobile)** — the same options as a white bottom sheet with large touch rows and a
>   grabber handle.
> - **Incoming invite modal** — a centred white card over a dimmed backdrop, springing in with
>   overshoot. A large rounded-square game icon tile at the top, then
>   *"Stranger wants to play **Chess**"*, a short subline, and two full-width stacked buttons:
>   **Accept** (solid blue, white text) and **Reject** (white, ink outline). Design it for all three
>   game names.
> - **Exit-game affordance** — a small white pill with an ink outline reading "Exit", shown while a
>   game is active.

---

### B9 — Listen Along music player

> Design the synced music player panel that appears inside the chat column during a call. White
> card, flat, bold.
>
> Components, top to bottom:
> - **Search section** — a `--paper-alt` well with a leading magnifier, a song-name input, and an
>   ink submit button; plus a **status line** ("Loading track…", "Partner is hosting").
> - **Player main** — a large **square album artwork** tile at 20px radius, an **info block** with
>   the **track title** in 700 weight (marquee-scrolling if too long) and the **artist** in
>   `--muted`, and a **duration** label.
> - **Progress section** — a row of **chunky animated equalizer bars** in ink/amber reacting to
>   playback; a **scrubber** with a `--paper-alt` track, a solid ink fill and a circular draggable
>   knob; and **elapsed / total** labels in tabular numerals.
> - **Controls row** — circular buttons: previous, **play/pause** (larger, solid ink, white glyph,
>   morphing play↔pause animation), next.
> - **Lyrics section** — a scrollable panel with `--muted` text and the **current line in solid ink,
>   700 weight**, with a `--sun-tint` highlight behind it.
> - **Host vs listener** — the listener's transport controls appear dimmed with a small "Partner is
>   hosting" pill, since only the host drives playback.
>
> Bottom sheet on mobile; inline in the chat column on desktop.

---

### B10 — Chess board overlay

> Design the in-call chess game, flat and graphic.
>
> Components:
> - **Board frame** — a white card wrapper, 20px radius, with the board inset.
> - **8×8 grid** — light squares `--paper`, dark squares `--sun` (amber, not brown). Clean, flat,
>   no texture or bevel.
> - **Pieces** — bold, high-contrast ink and white glyphs with a crisp outline so white pieces read
>   on the amber squares. Pieces **slide smoothly** between squares rather than snapping.
> - **Move affordances** — a solid **blue dot** on legal destination squares, a **blue ring** on a
>   capturable piece, and a **`--sun-tint` tint** on the last move's origin and destination squares.
> - **Turn indicator** — a pill showing whose move it is, plus a small label for which colour the
>   local player is.
> - **Game-over banner** — a white card overlaying the board centre with the result in 800 weight
>   and a "Play again" ink button.
>
> The board must stay square and fit a 375px phone without scrolling.

---

### B11 — Report Bug modal

> Design the bug report modal (the one form in the app that actually submits).
>
> Components: a **dimmed backdrop** (no blur); a **white card**, 28px radius, springing up; a
> **title** in 800 weight and a short `--muted` description; stacked **field rows**, each with a
> **small bold dark label above** and either a white **input** or **textarea** with a 1px `--line`
> border, 14px radius, focusing to a 2px blue border (name, email/contact, description); an
> **actions row** with a white ink-outlined **Cancel** and a full-width solid ink **Submit**; a
> **loading state** (button shows a spinner, label becomes "Sending…"); and a **success state**
> replacing the form with a green circular check that pops in, a thank-you line, and a **Done**
> button.
>
> On mobile it becomes a bottom sheet with a grabber handle instead of a centred card.

---

### B12 — Static content pages (`/about`, `/privacy`, `/terms`, `/help`, `/contact`)

> Design a shared template for long-form pages on the amber canvas.
>
> Components: a **page title block** (800-weight title + `--muted` subtitle); a **white content
> card**, 28px radius, holding the body copy with clear heading/paragraph/list hierarchy at a
> comfortable ~70ch measure; an optional **section nav** that sticks on desktop as a white card and
> collapses to a horizontal scrolling chip row on mobile; **links** in `--blue` semibold; and
> **callout blocks** — `--sun-tint` fill with a bold ink left rule — for key points.
>
> **Help and Contact additionally need a support form:** labelled inputs for name and email, a
> message textarea, an ink submit button, and success/error states. *(Note for implementation: this
> form's backend endpoint does not currently exist, so design a clear, honest error state.)*
>
> Also design a **404 / maintenance page** on the same template: a large white card, a friendly
> doodle, a short message, and an ink button back to home.

---

### B13 — Global states, feedback and micro-components

> Design the shared small pieces used across the app:
> - **Toast / snackbar** — a white pill with a 1.5px ink outline and a leading icon, sliding down
>   from the top, auto-dismissing. Variants: neutral, success (green icon), error (red icon).
> - **Spinner** — a bold ink circular activity indicator.
> - **Searching indicator** — three bouncing ink dots, staggered, with a caption and queue position.
> - **Error alert card** — white card with an orange rounded-square icon tile, a bold title, a
>   `--muted` body line, and an ink retry button.
> - **Skeleton loaders** — `--paper-alt` blocks with a shimmer sweep, for the message list and the
>   music player.
> - **Segmented control** — a `--paper-alt` track with a solid white sliding thumb carrying a soft
>   shadow; the active label is ink bold. Used for switching chat mode.
> - **Badge pin** — the signature 24px blue circle with a white glyph that overlaps a bubble or card
>   corner. Define it as a reusable component.
> - **Status pills** — `NEW` (orange), `LIVE` (green), `CONNECTING` (amber): 11px uppercase bold.
> - **Grouped icon toolbar** — the rounded `--paper-alt` (or `--ink-soft` on dark) container holding
>   3–5 circular icon buttons.
> - **Avatar** — circular, with a coloured fallback carrying an initial, and an optional presence dot.
> - **Tooltip** — a small ink card with white text and a pointer, for desktop icon buttons.
> - **Icon button** — the base circular button in three sizes (36/44/52) and five intents: neutral,
>   ink, accent-blue, amber, danger-red.
> - **Focus ring** — 3px blue at 40% opacity, offset 2px.

---

## PART C — Responsive specification

> **Responsive requirements**
> - Design **mobile-first**. One breakpoint at **768px**. Show at **375px, 768px, 1024px, 1440px**.
> - **Phone (≤768px):** single column; chat screens full-bleed edge-to-edge; the video feed fills
>   the screen with a floating PiP self-view; controls become a floating grouped toolbar respecting
>   `env(safe-area-inset-bottom)`; the chat panel becomes a slide-up white sheet with a grabber
>   handle; the header nav collapses to a hamburger opening a bottom sheet; feature and mode cards
>   stack to one full-width column; modals become bottom sheets; primary buttons go full-width.
> - **Tablet/desktop (>768px):** chat screens use a two-column split (media left, white chat card
>   right); the control toolbar is a centred floating group; the header shows the full nav; cards
>   sit in a row; modals are centred cards; buttons size to their content.
> - Content max-width ~1200px, centred, on large screens — never let text run full-width.
> - Fluid type and spacing via `clamp()` so the scale adapts smoothly rather than jumping at 768px.
> - **44×44px minimum touch target at every size.**
> - Chat screens must **never produce page scroll** — only the message list scrolls internally.
> - Support portrait **and** landscape on phones; in landscape the video screen keeps controls
>   reachable and narrows the chat sheet.

---

## PART D — Bringing the output back into the codebase

1. **Apply Part 0 first.** Delete the three `!important` blocks in `public/index.html` (the
   `background-color: transparent` pair, the forced input/button styling, and the black
   `html/body/#root` fills), and update `<meta name="theme-color">` to the amber. Nothing will look
   right until this is done.
2. Add **Plus Jakarta Sans** to the existing Google Fonts link, and drop **Press Start 2P**.
3. Rewrite `src/config/theme.js` with the new token set (`sun`, `ink`, `paper`, `blue`, `orange`,
   …), keeping the existing key names as aliases if that makes the sweep easier. Then find-and-
   replace the hardcoded `#1DB954` and `rgba(29,185,84,...)` literals across the codebase.
4. Build a small set of **shared primitives** — `Card`, `Button`, `IconButton`, `Sheet`, `Popover`,
   `Bubble`, `BadgePin`, `Pill`, `Toolbar` — instead of restyling ~80 styled-components per page by
   hand. The three chat pages duplicate the same components today; this is the moment to consolidate.
5. Follow the order in `UI_REDESIGN_BRIEF.md` §13: tokens → `index.html` → Header/Footer →
   Homepage/StartChat → TextChat → VideoChat/AudioChat.
6. Re-read `UI_REDESIGN_BRIEF.md` §9 (the functionality contract) before touching any JSX in the
   chat pages — the media element refs, the four UI states and the handler wiring must survive.
7. Test with two browser windows (one normal, one incognito) after each stage.
