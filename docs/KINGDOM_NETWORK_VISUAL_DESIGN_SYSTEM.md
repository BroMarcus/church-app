# Kingdom Network Visual Design System

Status: DESIGN SPEC — implementation intentionally deferred while other functional workstreams are active.
Updated: 2026-08-27
Owner direction: Marcus

## 1. Purpose

Create one consistent visual language for the entire Kingdom Network / One Kingdom product so every member-facing, leader, admin, learning, group, reporting, onboarding, and future multi-church screen feels like the same premium product.

The interface must remain extremely simple for new, low-tech, mobile, and multilingual users even when the underlying platform is powerful.

This design workstream must not alter business logic, auth, permissions, data models, or active functional workflows unless separately coordinated through the Control Room.

## 2. Base44 capabilities we should use instead of rebuilding

Base44 currently provides a strong design layer that fits this project:

- Global Theme controls for palette, typography, and spacing.
- Visual Editor for page/section styling.
- Canvas for visual references, screenshots, moodboards, notes, and collaborative page review.
- AI redesign previews, including multiple alternative designs before applying one.
- Section-level redesigns so one area can be refined without redesigning the whole app.
- Responsive preview/editing.
- Template marketplace for studying proven layouts and interaction patterns.

The current Kingdom Network app already includes a large reusable UI kit based on Radix/shadcn-style primitives plus Tailwind tokens. Installed components include buttons, cards, dialogs, drawers, sheets, sidebar primitives, tabs, accordions, alerts, badges, avatars, forms, inputs, selects, switches, checkboxes, radio groups, tables, pagination, breadcrumbs, navigation menus, tooltips, popovers, command palette, carousels, charts, calendars, progress bars, skeletons, resizable panels, and toast systems.

Additional installed design/interaction libraries include Lucide icons, Framer Motion, Recharts, Embla Carousel, Vaul drawers, canvas-confetti, and Three.js.

Conclusion: do not import a whole marketplace template over the existing app. Use templates as references, then standardize the existing app through the Theme system and reusable components. This preserves the working product and avoids duplicating navigation/components.

## 3. Visual direction

Working visual phrase:

**Modern Kingdom / heroic premium / dark architectural / luminous blue / restrained gold.**

The color inspiration comes from the classic blue-yellow-black Wolverine/X-Men family, but Kingdom Network should have its own identity. Do not use Marvel/X-Men logos, costume shapes, claw graphics, character imagery, or trademarked presentation.

### Emotional target

- Strong, trustworthy, modern.
- Premium without becoming luxury-fashion ornate.
- Bold without looking like a game.
- Spiritual/church appropriate without relying on generic church clip-art.
- High contrast and instantly readable.
- Mobile-first and low-tech friendly.
- Calm enough for pastoral records, finance, training, and administration.

## 4. Proposed core palette — One Kingdom Hero Palette v1

### Foundation

- **Kingdom Black** `#080B12` — deepest navigation/background layer.
- **Carbon Navy** `#101722` — main dark surfaces.
- **Elevated Navy** `#172131` — cards, drawers, elevated panels.
- **Steel Border** `#2B3A4E` — borders/dividers on dark surfaces.

### Brand colors

- **Kingdom Blue** `#2F80ED` — primary buttons, active navigation, links, selected states.
- **Luminous Blue** `#55ACFF` — focus rings, hover glow, progress, important information.
- **Ice Blue** `#DCEEFF` — subtle blue text/background support.
- **Claw Gold** `#F6C945` — crown/logo accent, premium ownership, achievements, selected emphasis.
- **Bright Gold** `#FFD95A` — hover/highlight version of gold.

### Neutrals

- **Cloud White** `#F7FAFC` — primary light text.
- **Cool Gray** `#A8B4C5` — secondary text.
- **Slate** `#718096` — tertiary/inactive text.

### Semantic colors — never replace these with brand gold

- Success `#22C55E`
- Warning `#F59E0B`
- Error / destructive `#EF4444`
- Information uses Kingdom/Luminous Blue.

## 5. Color usage rules

1. Black/navy is the foundation, not pure flat black everywhere.
2. Blue is the primary interactive color.
3. Gold is special. Use it for crown/brand details, achievements, platform-owner/premium emphasis, important selected highlights, and small lines/icons — not giant yellow surfaces.
4. White/ice-blue text carries readability.
5. Red, green, and warning amber retain normal semantic meanings.
6. Do not make every card glow. Glow is for focus, active state, and important hero moments.
7. Avoid purple as a major brand color in this palette unless a later theme deliberately introduces it.

## 6. Existing app foundation to keep

The existing Base44 app already has the right technical foundation:

- CSS custom-property theme tokens in `src/index.css`.
- Dark-first `ThemeProvider`.
- Central brand configuration in `src/lib/brandConfig.js`.
- Runtime church-level primary/accent overrides.
- Inter for body text and Space Grotesk for headings/display.
- Reusable `Button`, `Card`, `Sidebar`, and other UI primitives.
- Central `BrandMark` component intended to accept the final logo.

These should be refined, not replaced.

## 7. Typography

Keep the fonts already installed unless live design review shows a strong reason to change:

- **Headings / display:** Space Grotesk.
- **Body / forms / tables:** Inter.

Rules:

- Page title: strong but compact.
- Section title: clear hierarchy, not oversized.
- Body copy: minimum comfortable mobile size.
- Form labels: visible, not placeholder-only.
- Avoid excessive uppercase.
- Use numeric emphasis for dashboards and progress.

## 8. Shape language

Target radius system:

- Small controls/chips: 8px.
- Buttons/inputs: 10px.
- Cards/panels: 14–16px.
- Hero containers: 18–24px only where appropriate.

Do not make every object pill-shaped.

Borders should be thin and blue/steel-toned. Shadows should be soft and dark rather than large gray drop shadows.

## 9. Button system

### Primary

Kingdom Blue fill, white text, Luminous Blue hover/focus. Used for the single main action on a screen.

### Secondary

Dark elevated surface, steel border, white/ice text. Used for supporting actions.

### Gold / premium

Gold should not become the normal primary button. Reserve a gold treatment for rare brand/premium/achievement/owner actions.

### Ghost

Transparent with subtle blue hover surface. Useful in navigation and toolbars.

### Destructive

Red only. Never gold or blue.

All important tap targets should meet the existing roughly 44px mobile target.

## 10. Cards and panels

Standard app card:

- Elevated Navy surface.
- 1px Steel Border.
- 14–16px radius.
- Low shadow.
- Clear heading.
- Optional thin blue/gold indicator only when meaningful.

Dashboard cards should not all look identical. Use hierarchy:

- Primary next-action card.
- Status/progress cards.
- Compact metric cards.
- List/action panels.

## 11. Navigation

### Desktop

Keep a left navigation structure because it scales to the church operating-system vision, but make it feel cleaner and more focused.

- Kingdom Black deepest layer.
- Active item = Kingdom Blue treatment.
- Gold crown/mark reserved for brand/owner details.
- Group related modules and progressively disclose admin complexity.
- Collapse behavior can use the already-installed sidebar primitives later.

### Mobile

- Clear top bar plus simple navigation/drawer.
- No desktop-sized menu dumped onto the phone.
- Member-facing navigation should expose only the few most important actions.

## 12. Backgrounds

Recommended hierarchy:

1. Authentication / welcome / major brand moments may use a richer dark-blue atmospheric background.
2. Normal working screens should use a quiet dark navy canvas.
3. Cards are visibly elevated from the canvas.
4. Avoid stars/celestial texture behind dense forms, tables, reports, pastoral records, or finance screens.

The existing celestial treatment can remain for controlled brand moments but should not become the visual texture of every page.

## 13. Logo direction

Working brand identity: **One Kingdom** with a compact **1K** symbol.

Preferred direction:

- Integrate the numeral `1` into the structure of the `K` instead of placing two disconnected characters side by side.
- Crown shape should feel constructed from the monogram or sit naturally within it.
- Gold mark with optional Kingdom Blue support.
- Must work at favicon size, mobile-header size, sidebar size, login size, and print size.
- Avoid generic church silhouettes, giant crosses as the primary mark, literal Wolverine claws, or comic-book styling.
- Produce monochrome, full-color, dark-background, and light-background variants after the final geometry is approved.

## 14. Theme architecture

Long term, support a controlled theme system without creating dozens of inconsistent interfaces.

Recommended hierarchy:

- **Platform design system:** fixed spacing, component behavior, accessibility, semantic status colors, typography rules.
- **Church brand layer:** logo, approved primary/accent colors, optional light/dark preference.
- **Member preference layer:** may choose from approved themes, but cannot change information hierarchy or accessibility.

Start with one excellent default theme before building many alternatives.

## 15. Base44 template strategy

Templates are useful for reference, not for replacing this app. When browsing the Base44 marketplace, prioritize examples from:

- Education / course platforms for Learning Center structure.
- Community apps for member/community layouts.
- Operations/admin apps for dashboards and records.
- Analytics apps for church-health reporting.
- Premium SaaS templates for visual polish, card hierarchy, filters, tables, and settings.

Extract patterns such as spacing, dashboard composition, tabs, filter bars, empty states, onboarding, and responsive navigation. Rebuild those patterns with the components already installed in Kingdom Network.

## 16. Design implementation sequence

Do not repaint pages randomly. Apply design in this order after coordination with active coding workstreams:

1. Final logo/brand mark.
2. Global palette and tokens.
3. Typography and spacing.
4. Buttons/inputs/forms.
5. Cards/panels/badges/statuses.
6. Desktop/mobile navigation shell.
7. Login/register/onboarding.
8. Member Home / Dashboard.
9. Learning.
10. Friendship Groups.
11. People/My Journey.
12. Events/calendar/scheduling.
13. Leader/admin screens.
14. Reports/finance/pastoral records.
15. Empty/loading/success/error states.
16. Cross-device visual QA and accessibility pass.

## 17. Current design status

- Design foundation: SPECIFIED, not implemented.
- Existing app theme/components: INSPECTED.
- Functional code: intentionally untouched by this design workstream.
- Preview verification: NOT STARTED.
- Deployment: HOLD.

No design change becomes READY until it is PREVIEW VERIFIED in the live app.