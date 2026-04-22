# Design System - Bored@Work

## Product Context
- **What this is:** A tournament-style office voting app with a public player view, a setup flow for admins, and a bracket presentation people actually want to click.
- **Who it's for:** Small workplace teams running internal morale boosts, recurring bracket games, and lightweight department-wide debates.
- **Space/industry:** Internal tools, workplace culture software, bracket games, team engagement apps.
- **Project type:** Hybrid landing page plus app UI.

## Aesthetic Direction
- **Direction:** Warm editorial sports-bracket
- **Decoration level:** Intentional
- **Mood:** Bright, polished, playful, and a little premium. More glossy magazine than dark arcade.
- **Reference source:** `C:/Users/Gabe/Downloads/Bored_Work.zip`

## Typography
- **Display/Hero:** `Barlow Condensed` - tall, punchy, sports-broadcast energy.
- **Body:** `Instrument Sans` - readable, modern, and calm enough to support the stronger display face.
- **UI/Labels:** `Instrument Sans` for controls and helper text, `Barlow Condensed` for headings and score-style emphasis.
- **Data/Tables:** `Instrument Sans`
- **Code:** Browser monospace defaults for URLs and tokens.
- **Loading:** Next font via `next/font/google`.
- **Scale:** Hero `clamp(3.5rem, 9vw, 6.8rem)`, landing hero `clamp(4rem, 10vw, 8rem)`, section headings `clamp(2rem, 5vw, 3.8rem)`, CTA heading `clamp(2.5rem, 6vw, 5rem)`.

## Color
- **Approach:** Balanced
- **Primary:** `#db4f2f` - energetic coral-red used for brand emphasis and CTA gradients.
- **Secondary:** `#8c1c13` - deep red for button depth and destructive actions.
- **Support:** `#e5bc5a` - warm gold for highlights and active framing.
- **Neutrals:** `#fff9ed`, `#f5efdf`, `#efe5cf`, `#1d2332`, `#6e6b67`
- **Semantic:** success `#2c7a4b`, error leans on the deep red family.
- **Dark mode:** Not the design center. The product should read as a warm light-first experience.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** `xs 4`, `sm 8`, `md 16`, `lg 24`, `xl 32`, `2xl 48`, `3xl 64`

## Layout
- **Approach:** Hybrid
- **Grid:** Two-column hero and admin header on desktop, single column on mobile.
- **Max content width:** `1200px`
- **Border radius:** pills `999px`, controls `16px`, cards `18-28px`
- **Surface model:** Warm glass cards over a cream atmospheric background with soft blur and subtle glow.

## Motion
- **Approach:** Intentional
- **Easing:** ease / ease-in-out
- **Duration:** micro `150-200ms`, reveal `600ms`, ticker `22s linear`
- **Principle:** Motion should support the “live tournament” feel without making the app feel gimmicky.

## Rules
- Use the warm paper background and translucent cream cards from the reference file.
- Keep landing section spacing, heading sizes, and bracket-card proportions close to the reference.
- Primary CTA buttons use the coral-to-deep-red gradient.
- Use gold as the framed highlight, not lime or violet.
- Headings stay uppercase and condensed.
- Avoid dark-theme drift unless the user explicitly asks for it.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-21 | Restored the warm paper visual system from the provided reference file | User asked for the site to match the exact supplied design |
| 2026-04-21 | Standardized on Barlow Condensed + Instrument Sans | Matches the supplied layout and preserves the sports-bracket feel |
