# Kingdom Network V2 — Navigation Contract

Status: NAVIGATION DECISION APPROVED · STEP 1 PREVIEW STILL AWAITS MARCUS REVIEW
Step: 1 — Foundation

## Permanent member navigation

The V2 member shell uses exactly five bottom destinations by default:

| Position | English | Spanish | Default destination |
| --- | --- | --- | --- |
| 1 | Home | Inicio | `/v2` |
| 2 | My Group | Mi Grupo | `/v2/groups` |
| 3 | Learn | Aprender | `/v2/learn` |
| 4 | Serve | Servir | `/v2/serve` |
| 5 | More | Más | `/v2/more` |

These labels are the approved default navigation. Individual feature screens are **not** implied to exist merely because their destination is reserved.

## Bottom-bar visual contract

- Total height: 76px.
- Bottom padding: 10px for the device home-indicator area.
- Five evenly spaced destinations.
- Icon: 20px stroked SVG, 1.75 stroke width, round caps/joins.
- Label: 10.5px.
- Icon-to-label gap: 4px.
- Active icon/label: `gold-400` / `#E3C179`.
- Inactive icon/label: `ink-500` / `#8894B4`.
- Minimum tap target: 44px.
- Do not draw a fake operating-system status bar or fake keyboard.

## User customization requirement

The default five tabs are configuration-driven so a future user may repoint a tab to a destination that is more useful to that person. Example: an authorized Friendship Group leader may point `My Group` directly at that leader's own group dashboard.

Rules:

1. Preferences belong to the individual user, not to the role as a whole.
2. A user may customize destinations only from destinations they are actually allowed to access.
3. Navigation customization **never grants authorization**. Server/database permission checks remain authoritative.
4. A bad/stale custom destination must fail safely and return the user to an understandable allowed screen.
5. The five default tabs remain the fallback when no preference is stored or a saved destination becomes invalid.
6. Step 1 implements a config-driven navigation component only. Persisting per-user preferences is deferred because that would be a live write workflow and must be tested/approved separately.

## Groups hierarchy contract

V2 must preserve two distinct concepts:

### 1. Groups List

A church-wide browse/directory surface showing groups the signed-in person is permitted to discover. It is not a leader operations screen.

### 2. Group Dashboard

A scoped workspace entered after opening one specific group. Group-specific operations belong here: roster, attendance, weekly reporting, lessons, prayer/group activity, schedule, guidelines, and session assignments according to permission.

**Never place one group's private/operational tools on the Groups List.**

`My Group` may eventually route a person directly to the correct Group Dashboard when there is one clear active group. If the user has no group, more than one relevant group, or a stale saved destination, the app must provide a simple safe choice rather than guessing incorrectly.

## Member simplicity

The five-tab shell is intentionally small. Secondary destinations live behind contextual actions or `More`, rather than becoming additional permanent bottom tabs. Likely secondary areas include Community, Prayer, Messages, Calendar/Events, My Journey/Profile, Directory, Documents, Business Partners, settings, and authorized leadership tools. Their exact placement is decided when their owning step is designed.

## Leader/admin access

Leadership tools must not clutter the ordinary member experience. A leader, pastor, or admin may receive contextual actions or a role-appropriate workspace inside an allowed destination, but elevated navigation is never a substitute for server-side/database authorization.

## Branding

Every V2 screen includes the fixed Kingdom Network lockup at top-left, with the active church name underneath and an optional small church mark. See `docs/KINGDOM_NETWORK_V2_FOUNDATION.md` for exact visual tokens.

## Approval state

Marcus supplied and approved the five-tab navigation decision as part of the Claude Step 1 Navigation & Design System Brief. The navigation decision gate is therefore settled.

The overall **Step 1 foundation is not yet complete** until Marcus reviews and approves the updated V2 preview. Until then, no real Home, Groups, Learning, Serve, Finance, AI, or other feature implementation begins.
