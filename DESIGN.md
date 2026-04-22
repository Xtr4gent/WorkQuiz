# Design System - Bored@Work

## Product Context
- **What this is:** A bracket-style office poll app for internal team debates, recurring morale boosts, and lightweight workplace fun.
- **Who it's for:** Administrative assistants and small internal teams who want something dead simple to run and fun enough that people actually participate.
- **Space/industry:** Internal tools, office culture software, live voting, tournament-style community apps.
- **Project type:** Hybrid. Marketing landing page plus admin setup surface plus live voting app.

## Aesthetic Direction
- **Direction:** Retro-futuristic office arcade
- **Decoration level:** Intentional
- **Mood:** Dark, electric, a little dramatic. It should feel like office banter got promoted into a prime-time bracket broadcast.
- **Reference source:** `C:/Users/Gabe/Downloads/Bored@Work.zip`

## Typography
- **Display/Hero:** `Syne` - spiky, confident, memorable. Gives headings personality without looking childish.
- **Body:** `DM Sans` - clean, readable, and neutral enough to support the louder display face.
- **UI/Labels:** `DM Sans` for controls, `Syne` for major buttons and branded CTAs.
- **Data/Tables:** `DM Sans` - good legibility for counts, timestamps, and labels.
- **Code:** Browser monospace defaults for URLs and tokens.
- **Loading:** Next font via `next/font/google`.
- **Scale:** Hero `clamp(4.6rem, 10vw, 8.8rem)`, section heading `clamp(2.25rem, 5vw, 4.6rem)`, CTA heading `clamp(2.8rem, 6vw, 5.8rem)`, body `1.08rem` to `1.12rem`, eyebrow `0.78rem`.

## Color
- **Approach:** Expressive
- **Primary:** `#c8f53c` - the electric lime. Use for primary actions, active states, status highlights, and branded emphasis.
- **Secondary:** `#ff5e3a` - coral heat. Use for selected votes, danger actions, and accent contrast.
- **Tertiary:** `#9b6dff` - violet spark. Use sparingly for focus outlines, active framing, and atmospheric glow.
- **Neutrals:** `#0d0d10`, `#111116`, `rgba(24, 24, 31, 0.92)`, `#8e90a1`, `#f0f0ee`
- **Semantic:** success `#7be495`, warning `#ffb800`, error `#ff7a66`, info leans on the violet system.
- **Dark mode:** Native default. This app now designs from dark first, not as an afterthought.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** `xs 4`, `sm 8`, `md 16`, `lg 24`, `xl 32`, `2xl 48`, `3xl 64`

## Layout
- **Approach:** Hybrid
- **Grid:** Two-column hero and admin headers on desktop, collapsing to one column below tablet widths.
- **Max content width:** `1200px`
- **Border radius:** pills `999px`, controls `16-18px`, cards `22-28px`
- **Surface model:** Translucent dark panels over a dark atmospheric field with glow and grain. Interior cards are slightly lighter than the page, never white.

## Motion
- **Approach:** Intentional
- **Easing:** Standard ease / ease-in-out
- **Duration:** micro `150-200ms`, reveal `600ms`, ticker `22s linear`
- **Principle:** Motion should make the app feel alive, but voting and admin actions should still feel crisp and practical.

## Rules
- Primary buttons are lime, pill-shaped, and high contrast.
- Secondary actions are muted glass pills, not ghost text links.
- Danger actions use coral, never the lime primary.
- Eyebrows and branded micro-labels use lime.
- Big headings use `Syne` with tight negative tracking.
- Avoid generic bright white cards or warm paper backgrounds.
- Avoid purple gradients as a primary brand expression. Violet is a support accent, not the lead.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-21 | Shifted the app from warm paper theme to dark retro-futuristic tournament theme | Matches the new Bored@Work landing direction and gives the product a stronger identity |
| 2026-04-21 | Standardized on Syne + DM Sans | Better fit for playful-but-sharp office tournament energy |
