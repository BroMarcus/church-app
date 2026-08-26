# Package 1 — Real-Phone Verification Scorecard

Use with `docs/PACKAGE_1_REAL_PHONE_TEST_SCRIPT_EN_ES.md`.

**Package 2 stays on HOLD until Marcus reviews the completed results.**

**Implementation target:** `implementation/package-1-evangelism`

**Exact verified implementation head:** `54571b2d10a41cf4d189bd9dbe6dd530366a631f`

---

# A. Session information

- **Date:**
- **Coordinator/observer:**
- **Tester name or initials:**
- **Tester role:** ☐ English FG Leader ☐ Spanish FG Leader ☐ Ordinary Member ☐ Pastor/Admin/Outreach Leader ☐ Guest ☐ Other: ______
- **Primary language:** ☐ English ☐ Español
- **Phone:** ☐ iPhone ☐ Android ☐ Other: ______
- **Device/model:**
- **OS/version:**
- **Browser:**
- **Test URL:**
- **Build/SHA confirmed before testing:** ☐ Yes ☐ No
- **Implementation code matches `54571b2d…`:** ☐ Yes ☐ No ☐ Unknown
- **Started:**
- **Finished:**

If the build/SHA is unknown, mark the session **BLOCKED — BUILD IDENTITY NOT PROVEN** rather than treating the results as final verification evidence.

---

# B. Observer rule

Before starting, confirm:

- [ ] Tester received a goal, not button-by-button instructions.
- [ ] Tester was asked to think aloud.
- [ ] Observer did not coach unless the test could not continue.
- [ ] Any rescue/coaching was recorded below.
- [ ] Synthetic QA identities were used where guest records were created.
- [ ] No real confidential pastoral/minor/private-address information was entered for testing.

**Number of observer rescues/coaching moments:** ______

**Where was coaching required?**


---

# C. Scenario score

Use:

- **PASS** — tester completed the intended flow safely without rescue.
- **FAIL** — behavior was wrong, unsafe, misleading, or the primary flow could not complete.
- **BLOCKED** — prerequisite/test environment prevented a fair test.
- **N/A** — this tester was not assigned this scenario.

| # | Scenario | Status | Coaching? | Severity if failed | Evidence / notes |
|---|---|---|---|---|---|
| 1 | English public guest connection, no account |  |  |  |  |
| 2 | Spanish public guest connection, no account |  |  |  |  |
| 3 | Language switch EN ↔ ES preserves flow |  |  |  |  |
| 4 | Ordinary member personal invitation share |  |  |  |  |
| 5 | Friendship Group leader group-link share |  |  |  |  |
| 6 | Returning person remains one person + new source/history |  |  |  |  |
| 7 | Follow-up queue / owner / due date / history |  |  |  |  |
| 8 | Ordinary member cannot browse unrelated private Outreach |  |  |  |  |
| 9 | Paused link fails closed |  |  |  |  |
| 10 | Retry / double-submit remains duplicate-safe |  |  |  |  |
| 11 | Friendship Group report → canonical Outreach bridge |  |  |  |  |
| 12 | Mobile clarity / knows what to do next |  |  |  |  |

---

# D. Critical privacy / identity checks

These are not cosmetic. Any confirmed failure here is normally P0.

| Check | PASS / FAIL / BLOCKED | Notes |
|---|---|---|
| Public group link does not reveal private home address |  |  |
| Connection link does not grant church membership |  |  |
| Connection link does not grant group roster membership |  |  |
| Connection link does not grant leadership/special permissions |  |  |
| Ordinary inviter cannot read private follow-up merely because they shared a link |  |  |
| Ordinary member cannot browse unrelated church-wide private Outreach |  |  |
| Same exact same-church email does not create an unintended duplicate |  |  |
| Return visit preserves new source/history without overwriting original source |  |  |
| No wrong-person merge observed |  |  |
| No cross-church data exposure observed |  |  |
| FG report guest does not silently create official baptism/Holy Ghost truth |  |  |
| UI does not show false success when a consequential save actually failed |  |  |

---

# E. English quality check

Rate each **1–5**:

1 = unusable/confusing, 3 = usable but needs improvement, 5 = obvious and comfortable.

| English item | Score 1–5 | Notes |
|---|---:|---|
| I understood what the connection page was for |  |  |
| I understood what information was required vs optional |  |  |
| I understood what would happen after I submitted |  |  |
| I understood that the link did not make me a member/leader/group member |  |  |
| I could find Share & Connect |  |  |
| I could tell who needed follow-up |  |  |
| Buttons/labels made sense on my phone |  |  |
| Text was readable without awkward zoom/side-scrolling |  |  |
| Success/error states told me what to do next |  |  |
| Overall I could use this without someone training me first |  |  |

**English tester's own words — what was easiest?**


**English tester's own words — what was confusing or missing?**


---

# F. Revisión de calidad en Español

Califique cada punto de **1–5**:

1 = no se puede usar / muy confuso, 3 = se puede usar pero necesita mejorar, 5 = claro y fácil.

| Punto en Español | Calificación 1–5 | Notas |
|---|---:|---|
| Entendí para qué sirve la página de conexión |  |  |
| Entendí qué información era necesaria y qué era opcional |  |  |
| Entendí qué pasaría después de enviar la información |  |  |
| Entendí que el enlace no me convertía automáticamente en miembro/líder/miembro del grupo |  |  |
| Pude encontrar Compartir y conectar |  |  |
| Pude identificar quién necesitaba seguimiento |  |  |
| Los botones y textos tuvieron sentido en mi teléfono |  |  |
| El texto se pudo leer sin zoom incómodo ni desplazamiento lateral |  |  |
| Las pantallas de éxito/error me dijeron qué hacer después |  |  |
| En general podría usar esto sin que alguien me entrenara primero |  |  |

**En las propias palabras del probador — ¿qué fue lo más fácil?**


**En las propias palabras del probador — ¿qué fue confuso o faltó?**


---

# G. “Would I know what to do next?” answers

Record the tester's answer before explaining the screen.

### 1. What do you think this screen is for? / ¿Para qué cree que sirve esta pantalla?


### 2. What would you press next? / ¿Qué presionaría después?


### 3. What information do you think is private here? / ¿Qué información cree que es privada aquí?


### 4. Do you think this makes someone a church member or group member? / ¿Cree que esto convierte a alguien en miembro de la iglesia o del grupo?


### 5. What button/explanation did you expect but could not find? / ¿Qué botón o explicación esperaba encontrar y no encontró?


---

# H. Defect log

Severity:

- **P0 Critical** — security/privacy/cross-church leak/role escalation/data loss/wrong-person merge/identity corruption.
- **P1 Pilot Blocker** — primary Package 1 flow cannot complete, EN/ES dead end, FG report bridge failure, false success, or repeated serious usability failure.
- **P2 Improvement** — safe flow completes but confusing, hard to discover, or unnecessarily difficult.
- **P3 Polish** — minor visual/copy preference without workflow risk.

| Defect ID | Severity | Language | Device | Scenario | What happened | Expected | Reproduction steps | Screenshot/evidence | Retest status |
|---|---|---|---|---|---|---|---|---|---|
| P1- |  |  |  |  |  |  |  |  |  |
| P1- |  |  |  |  |  |  |  |  |  |
| P1- |  |  |  |  |  |  |  |  |  |
| P1- |  |  |  |  |  |  |  |  |  |

---

# I. Session outcome

Choose one:

- ☐ **PASS — contributes valid evidence toward Package 1 HUMAN VERIFIED**
- ☐ **RETEST REQUIRED — one or more issues must be fixed/retested**
- ☐ **BLOCKED — environment/build/test prerequisite prevented valid proof**

**Observer recommendation:**


**Tester recommendation in their own words:**


---

# J. Coordinator roll-up across all testers

Complete this after all 3–5 sessions.

## Tester/device coverage

| Tester | Role | Language | Device/browser | Primary scenarios | Outcome |
|---|---|---|---|---|---|
| A |  |  |  |  |  |
| B |  |  |  |  |  |
| C |  |  |  |  |  |
| D |  |  |  |  |  |
| E |  |  |  |  |  |

## Required gate roll-up

| Human verification requirement | PASS / FAIL / BLOCKED | Evidence / tester IDs |
|---|---|---|
| 3–5 tester coverage or documented reduced set |  |  |
| English critical path on real phone |  |  |
| Spanish critical path on real phone |  |  |
| iPhone evidence |  |  |
| Android evidence |  |  |
| Public no-account capture |  |  |
| Personal invitation sharing |  |  |
| Friendship Group link sharing + privacy |  |  |
| Returning-person duplicate-safe behavior |  |  |
| Follow-up owner/due/history |  |  |
| Ordinary-member private-Outreach boundary |  |  |
| Paused-link fail-closed behavior |  |  |
| Retry/double-submit idempotency |  |  |
| Friendship Group report → Outreach bridge |  |  |
| No automatic membership/group/leadership grant |  |  |
| No unresolved P0 |  |  |
| No unresolved P1 |  |  |
| Repeated tester confusion triaged |  |  |

---

# K. Final Package 1 recommendation

Only choose **HUMAN VERIFIED** when the full required gate is green.

- ☐ **HUMAN VERIFIED — recommend Package 1 move to VERIFIED / combined-deployment readiness review**
- ☐ **NOT VERIFIED — repair and bounded retest required**
- ☐ **BLOCKED — prerequisite/environment gap remains**

**Open P0 issues:**


**Open P1 issues:**


**Accepted P2/P3 items for later:**


**Coordinator summary:**


**Marcus review:**

- Decision: ☐ Accept Package 1 human verification ☐ Retest required ☐ Hold
- Notes:
- Date:

**Package 2 remains on HOLD until this review is complete.**
