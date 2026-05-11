---
name: Seabreeze
description: Native-feeling multi-provider AI chat for Apple-first power users.
colors:
  background-dark: "#000000"
  surface-dark: "#1a1a1a"
  text-dark: "#ffffff"
  text-secondary-dark: "#adb5bd"
  accent-blue: "#0567d1"
  border-dark: "#ffffff1a"
  error-red: "#ff4757"
  nord-background: "oklch(0.42 0.04 230)"
  nord-surface: "oklch(0.49 0.05 230)"
  nord-accent: "oklch(0.71 0.12 230)"
  catppuccin-background: "oklch(0.30 0.06 260)"
  catppuccin-surface: "oklch(0.40 0.06 260)"
  catppuccin-accent: "oklch(0.70 0.14 250)"
  tokyo-background: "oklch(0.26 0.05 250)"
  tokyo-surface: "oklch(0.33 0.06 250)"
  tokyo-accent: "oklch(0.65 0.13 250)"
typography:
  headline:
    fontFamily: "System"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.3px"
  title:
    fontFamily: "System"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.3px"
  body:
    fontFamily: "System"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "System"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.3px"
rounded:
  xs: "2px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  4xl: "64px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.surface-dark}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.accent-blue}"
    rounded: "{rounded.full}"
    size: "44px"
  input-chat:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  chat-row:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
---

# Design System: Seabreeze

## 1. Overview

**Creative North Star: "Model Harbor"**

Seabreeze is a harbor for many AI providers: each model can dock, leave, fail, or recover without the interface losing its shape. The product should feel native and controlled, but not sterile. It is a technical workspace softened by mobile comfort, where provider choice feels safe instead of chaotic.

The current system is a theme library system. Dark surfaces dominate by default, with Nord, Catppuccin, Tokyo Night, One Dark, Gruvbox, Darcula, light, and system variants sharing the same interaction model. The visual language should keep the controls tactile, compact, and legible so power-user features do not become a dense settings maze.

Seabreeze rejects toy chat app signals, generic SaaS AI marketing polish, and terminal-only aesthetics. It should never look like a cream-gradient assistant landing page, a novelty chatbot, or a command-line tool squeezed into a phone.

**Key Characteristics:**

- Native mobile surfaces with serious provider control.
- Dark-first tonal layering, not decorative gloss.
- Compact touch targets that preserve readability.
- Status and recovery states that explain themselves.
- Multi-theme flexibility over one fixed brand costume.

## 2. Colors

The palette is a controlled library of dark technical themes: blue-based default and editor-inspired variants, all built from layered backgrounds, muted text, restrained borders, and a single active accent per theme.

### Primary

- **Active Harbor Blue:** The default action and focus color. Use it for send actions, configured provider state, links, loading indicators, and selected settings.
- **Nord Signal Cyan:** The Nord accent for calm technical emphasis in the blue-green range.
- **Catppuccin Model Blue:** The Catppuccin accent for a softer dark theme while preserving provider clarity.
- **Tokyo Night Signal Blue:** The Tokyo Night accent for high-contrast dark theme actions.

### Secondary

- **Operational Green:** Success state color for confirmations and healthy provider checks.
- **Caution Amber:** Warning state color for partial configuration, recoverable provider issues, and non-destructive attention.
- **Recovery Red:** Error and destructive action color. Use for delete affordances, failed persistence, provider connection failure, and assistant error states.

### Neutral

- **Default Abyss:** The dark background for the base app shell.
- **Raised Graphite:** The default grouped surface for chat rows, composer controls, settings groups, popovers, and inputs.
- **Muted Instrument Text:** Secondary copy, timestamps, helper text, and inactive icon labels.
- **Hairline Boundary:** Low-opacity borders and dividers. Boundaries should separate function without drawing decorative frames everywhere.

### Named Rules

**The One Accent Per Theme Rule.** Each theme gets one active accent. Do not mix Nord cyan, Tokyo blue, and default blue on the same screen unless showing a theme picker.

**The Status Color Is a Verb Rule.** Green, amber, and red are reserved for state and consequence. Never use them as decoration.

**The Theme Library Rule.** Theme variants can change atmosphere, but not information architecture. Provider state, chat state, and recovery state must stay recognizable across every theme.

## 3. Typography

**Display Font:** System, with native platform fallbacks.
**Body Font:** System, with native platform fallbacks.
**Label/Mono Font:** System, with no dedicated mono role currently defined.

**Character:** Typography is native, compact, and practical. Hierarchy comes from weight, size, case, and letter spacing rather than expressive font choices.

### Hierarchy

- **Display** (700, 20px, 1.2): Empty states and rare screen-level emphasis. Use sparingly.
- **Headline** (700, 20px, 1.2): Primary screen titles when not delegated to the native stack header.
- **Title** (700, 16px, 1.25, -0.3px): Chat row titles, provider names, and compact group headings.
- **Body** (400, 16px, 1.5): Message text and primary reading surfaces. Keep chat text comfortable and avoid dense paragraph blocks wider than the mobile viewport.
- **Supporting Body** (400-500, 13-14px, 1.35): Previews, descriptions, helper copy, source URLs, and status summaries.
- **Label** (600, 11px, uppercase, 0.3px+): Section labels, compact status labels, and technical metadata.

### Named Rules

**The Native Type Rule.** Do not introduce decorative fonts into the product shell. Seabreeze earns character through hierarchy, state clarity, and spacing discipline.

**The Preview Compression Rule.** Secondary text can be smaller, but not vague. A 13px provider description must say what changes for the user.

## 4. Elevation

Seabreeze uses tonal layers first. Most depth comes from background shifts, translucent surfaces, borders, rounded group containers, and pressed opacity. Shadows are reserved for temporary overlays and consequential gestures, such as the media popover or swipe-to-delete action. Resting screens should not look like stacks of floating cards.

### Shadow Vocabulary

- **Popover Lift** (`shadowOffset: 0 -4px; shadowOpacity: 0.3; shadowRadius: 12; elevation: 8`): Use for anchored menus that need to sit above chat input and dismiss quickly.
- **Destructive Action Lift** (`shadowOffset: 0 2px; shadowOpacity: 0.3; shadowRadius: 4; elevation: 3`): Use for swipe actions where danger needs immediate physical affordance.

### Named Rules

**The Tonal Layers First Rule.** If a component can be separated with surface, border, or spacing, do that before adding a shadow.

**The No Decorative Glass Rule.** Semi-transparent surfaces are allowed only when they improve hierarchy or native feel. Do not use glassmorphism as an aesthetic default.

## 5. Components

Seabreeze components should be tactile, compact, and legible. Controls need to feel ready for thumbs, but not inflated. Every component should reveal state through shape, color, text, and native interaction feedback.

### Buttons

- **Shape:** Rounded controls with practical radii: medium buttons use 12px, icon actions use full circles at 44px.
- **Primary:** Active actions use the current theme accent on a 44px minimum touch target. Save buttons stretch full-width in settings forms with 24px horizontal and 16px vertical padding.
- **Hover / Focus:** Native press states use opacity, haptics, and accessible focus rather than decorative animation. Web hover should be subtle and should not move layout.
- **Icon Buttons:** Header and composer icon buttons are minimal. Their icon color carries affordance, but labels must exist for accessibility.
- **Destructive:** Delete uses the error color in a circular swipe action, never a side-stripe accent.

### Chips

- **Style:** Attachment chips are rounded-full, compact, and bordered, with a surface background and secondary icon color.
- **State:** Chips represent real pending media. They should stay removable, concise, and truncate file names before they crowd the composer.

### Cards / Containers

- **Corner Style:** Chat rows use gently curved grouped surfaces around 8px. Settings groups use 12px rounded containers.
- **Background:** Use surface and glass values over the app background. The row itself should feel grouped, not like a marketing card.
- **Shadow Strategy:** No resting shadows. Use tonal separation, borders, opacity, and spacing.
- **Border:** Borders are low-opacity hairlines, not colored side accents.
- **Internal Padding:** Chat rows use 20px horizontal and 14px vertical padding. Settings rows use 16px horizontal and 14px vertical padding.

### Inputs / Fields

- **Style:** Inputs use surface backgrounds, 1px borders, 12px rounded corners, and 16px horizontal padding.
- **Focus:** Focus should clarify the active field with native focus treatment or accent border, not a glow-heavy effect.
- **Error / Disabled:** Disabled states mute text and actions. Error states use recovery red plus plain-language recovery copy.

### Navigation

- **Style, typography, default/hover/active states, mobile treatment.** Native stack headers stay transparent over the themed background. Header icons use accessible labels and the current accent. Settings navigation uses grouped rows with SF Symbols, provider logos, descriptions, chevrons, and selected model state where relevant.

### Chat Composer

The composer is the signature interaction surface. It combines attachment controls, chips, a rounded multiline input, and send or stop action in one compact row. The send button becomes the accent only when there is something to send; otherwise it recedes into the surface.

### Provider List Rows

Provider rows pair an icon well, provider name, purpose text, optional selected model, and chevron. Configured state may use the theme accent, but the row should never become a status dashboard unless the user is inside provider settings.

## 6. Do's and Don'ts

### Do:

- **Do** keep the chat path immediate: composer, messages, streaming, and recovery must stay visible and direct.
- **Do** show provider and model state where it affects user trust, especially in settings and active chat context.
- **Do** use the current theme accent for active state, send action, links, and configured provider state.
- **Do** use tonal layering before shadows. Surface, border, opacity, and spacing should carry most hierarchy.
- **Do** write error and recovery copy plainly. A failed provider or save should tell the user what can happen next.
- **Do** preserve WCAG AA contrast and icon-only accessibility labels across every theme.

### Don't:

- **Don't** make Seabreeze look like a toy chat app: no childish illustration, novelty motion, unserious empty states, or playful copy that weakens trust.
- **Don't** use generic SaaS AI marketing polish: no cream-gradient startup styling, vague productivity language, interchangeable assistant tropes, hero-metric patterns, or decorative gloss that does not clarify behavior.
- **Don't** make it terminal-only: no expert-only labels, dense command-line aesthetics, or mobile-hostile configuration surfaces.
- **Don't** create a dense settings maze. Provider power must stay grouped, labeled, and recoverable.
- **Don't** use side-stripe borders as accents. Use full borders, background tint, icon state, or copy.
- **Don't** use gradient text. Emphasis belongs to size, weight, color, and placement.
- **Don't** use glassmorphism as default decoration. Transparency is allowed only when it improves native hierarchy.
