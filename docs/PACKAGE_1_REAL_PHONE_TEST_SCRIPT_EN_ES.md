# Package 1 — Evangelism / Guest Stewardship
# EN/ES Real-Phone Human Verification Script

**Status:** HUMAN VERIFICATION PACKAGE — Package 2 remains on HOLD

**Implementation under test:** `implementation/package-1-evangelism`

**Exact verified implementation head:** `54571b2d10a41cf4d189bd9dbe6dd530366a631f`

**PR:** #57 — Package 1: source-aware Evangelism guest stewardship

**Production deployment:** HOLD

This script is the official human-verification gate for Package 1. It is intentionally separate from the implementation branch so QA paperwork does not change the exact code SHA already proven by automated CI and the disposable Supabase runtime gate.

---

## 1. What this test is proving

Package 1 is not VERIFIED because code compiles. It is VERIFIED only when real people can use the critical flow on real phones without coaching and without breaking privacy, identity, or follow-up behavior.

The human proof must show that a real Madera New Life user can:

1. share a simple connection link from a phone;
2. let a guest connect without first creating an account;
3. use English or Spanish without a dead end;
4. preserve where/how the guest connected;
5. recognize a returning person instead of creating duplicate people;
6. place the person into an actionable follow-up flow;
7. preserve Friendship Group privacy and permission boundaries;
8. move a guest from a Friendship Group report into canonical Outreach correctly;
9. fail closed when a link is paused/unavailable;
10. avoid accidental duplicate records when a user retries or double-submits.

**Package 2 boundary:** the success screen may show **Create or open my account / Crear o abrir mi cuenta**. Testers may confirm that the button is understandable, but **do not continue into account claiming/onboarding as part of this Package 1 test**.

---

## 2. Required testers

Target **3–5 people**. One person may fill more than one role if only three testers are available, but keep the ordinary-member and leadership/privacy checks distinct.

Recommended coverage:

- **Tester A — English Friendship Group leader**
- **Tester B — Spanish Friendship Group leader**
- **Tester C — Ordinary member**
- **Tester D — Pastor/Admin or authorized Outreach leader**
- **Tester E — Optional brand-new guest with no account**

Device target:

- at least one **iPhone / Safari**;
- at least one **Android / Chrome**;
- record any other browser/device used.

If one device family is unavailable, record the gap. Do not silently call it cross-device verification.

---

## 3. Coordinator preflight — do this before inviting testers

Do not start human testing until all items below are true.

- [ ] The phone-accessible test URL is confirmed to run the Package 1 implementation represented by exact head `54571b2d10a41cf4d189bd9dbe6dd530366a631f`, or a build with identical implementation code and only QA-document changes.
- [ ] The URL is **not an unknown/stale build**.
- [ ] Production has not been changed merely to make this test possible unless Marcus separately approved that deployment.
- [ ] Test accounts have the intended roles only.
- [ ] An ordinary-member account is available.
- [ ] An English Friendship Group leader account is available.
- [ ] A Spanish Friendship Group leader account is available.
- [ ] A Pastor/Admin or explicit `manage_outreach` user is available.
- [ ] At least one safe Friendship Group/report can be used for QA without rewriting a real historical ministry report.
- [ ] No tester will enter real confidential pastoral notes, protected prayer details, minors' sensitive information, or private home-address information.
- [ ] Automated messaging remains disabled unless separately approved. Leave SMS/email consent unchecked for synthetic QA identities.
- [ ] The coordinator has a copy of `docs/PACKAGE_1_REAL_PHONE_SCORECARD.md` for each tester/session.

If a safe phone-accessible build cannot be identified, **stop**. The script is ready, but the verification run is BLOCKED until the correct build is available.

---

## 4. Safe test identities

Use synthetic identities so the test does not pollute real member/contact history.

Use reserved `example.com` email addresses and no real phone number.

Examples:

- English guest: `P1 English Guest AB` — `p1-en-ab-20260826@example.com`
- Spanish guest: `P1 Spanish Guest CD` — `p1-es-cd-20260826@example.com`
- Retry guest: `P1 Retry Guest EF` — `p1-retry-ef-20260826@example.com`
- Group-report guest: `P1 FG Guest GH` — `p1-fg-gh-20260826@example.com`

Replace initials/date so each testing session has unique values.

For the **returning-person test**, intentionally reuse the exact same email from the first submission through a second source link. That is the point of that scenario.

Do not check email/SMS consent for these synthetic identities.

---

## 5. Observer rule — no coaching

The observer gives the tester a goal, not navigation instructions.

### English read-aloud

> Please use this phone as if you had never seen Kingdom Network before. I will give you a goal, but I will not tell you which button to press. Say out loud what you think each screen or button means. If you get stuck, tell me what you expected to happen. I will only help if the test cannot continue.

### Español para leer en voz alta

> Use este teléfono como si nunca hubiera visto Kingdom Network. Le voy a dar una meta, pero no le voy a decir qué botón debe presionar. Diga en voz alta qué cree que significa cada pantalla o botón. Si se queda atorado, dígame qué esperaba que pasara. Solo le ayudaré si la prueba no puede continuar.

**Observer records every rescue/coaching moment.** If two or more testers get confused at the same step, treat that as a product signal, not as user error.

---

# TEST SCENARIOS

## Scenario 1 — Public guest connection, English, no account

**Tester:** English guest or English leader acting in private/incognito browsing.

**Starting condition:** Open a valid Package 1 connection link while signed out.

### Goal to read to tester

> You visited this church and want someone to follow up with you. You do not have a Kingdom Network account. Leave only the minimum information needed so the church can contact you.

### What the tester should be able to discover without coaching

- The page identifies the church and connection context.
- The page says an account is not required.
- The tester can enter first name plus at least email or phone.
- Optional fields are not forced.
- The consent boxes are understandable and optional.
- The tester can submit once and understand the success state.
- The account button is understandable, but stop before continuing into Package 2.

### Pass evidence

- [ ] No login was required before guest capture.
- [ ] Required/minimum fields were understandable.
- [ ] Submission succeeded.
- [ ] Success screen clearly said the information was received/connected.
- [ ] Tester understood what would happen next.
- [ ] Tester did not believe the connection automatically made them a member/leader/group member.
- [ ] No private group address or unrelated member data appeared.

---

## Scenario 2 — Conexión pública de visita, Español, sin cuenta

**Tester:** Spanish-speaking guest or Spanish leader acting signed out/private.

**Condición inicial:** Abrir un enlace válido de Package 1 sin iniciar sesión.

### Meta para leer al probador

> Usted visitó esta iglesia y quiere que alguien le dé seguimiento. No tiene una cuenta de Kingdom Network. Deje solamente la información mínima necesaria para que la iglesia pueda comunicarse con usted.

### Lo que debe poder descubrir sin ayuda

- La página identifica la iglesia y el contexto de conexión.
- La página explica que no necesita una cuenta.
- Puede ingresar nombre y por lo menos correo o teléfono.
- Los detalles opcionales no son obligatorios.
- Los consentimientos se entienden como opcionales.
- Puede enviar la información y entender la confirmación.
- El botón para crear/abrir cuenta se entiende, pero la prueba se detiene antes de entrar a Package 2.

### Evidencia de aprobación

- [ ] No pidió iniciar sesión antes de registrar la visita.
- [ ] Los campos mínimos fueron claros.
- [ ] El envío funcionó.
- [ ] La confirmación fue clara en español.
- [ ] El probador entendió qué pasará después.
- [ ] No creyó que el enlace le diera membresía, liderazgo o acceso automático a un grupo.
- [ ] No apareció dirección privada de grupo ni información de otros miembros.

---

## Scenario 3 — Language switch survives the critical flow

**Tester:** One English and one Spanish tester.

### Goal

English:
> Switch the connection page to the other language, then switch back. Continue the guest flow and tell me whether anything becomes confusing or changes meaning.

Español:
> Cambie la página de conexión al otro idioma y después vuelva al idioma original. Continúe el proceso de visita y dígame si algo se vuelve confuso o cambia de significado.

### Pass evidence

- [ ] English → Spanish works.
- [ ] Spanish → English works.
- [ ] Source/church context remains correct.
- [ ] Error/success guidance remains in selected language.
- [ ] No critical control becomes English-only or Spanish-only.

---

## Scenario 4 — Ordinary member shares a personal invitation

**Tester:** Ordinary member, not Pastor/Admin and not granted church-wide Outreach management.

### Goal

English:
> Invite a friend to connect with the church from your phone. Find the simplest shareable link and send/copy it as you normally would.

Español:
> Invite a un amigo a conectarse con la iglesia desde su teléfono. Encuentre el enlace más sencillo para compartirlo y envíelo o cópielo como lo haría normalmente.

### Pass evidence

- [ ] Tester can discover **Share & Connect / Compartir y conectar** without coaching.
- [ ] Tester can prepare a personal invitation link.
- [ ] Copy link works on the phone.
- [ ] Native Share works when the browser/device supports it; fallback copy is acceptable otherwise.
- [ ] Tester understands that sharing the link does not grant membership/group access/leadership.
- [ ] After the synthetic guest responds, the ordinary inviter does **not** gain unintended access to private follow-up notes just because they shared the link.

**Critical privacy failure:** ordinary inviter can read private guest follow-up data solely because they invited the person.

---

## Scenario 5 — Friendship Group leader shares a group connection link

**Tester:** Friendship Group leader/assistant who legitimately belongs to or operates the selected group.

### Goal

English:
> A visitor is interested in your Friendship Group. Share the group connection link with them from your phone.

Español:
> Una visita está interesada en su Grupo de Amistad. Comparta con ella el enlace de conexión del grupo desde su teléfono.

### Pass evidence

- [ ] Leader can find their own active group.
- [ ] Leader can prepare/share the group link.
- [ ] Public guest page identifies the group/context in a useful way.
- [ ] Public page does **not** reveal a private home address.
- [ ] Guest is not automatically placed on the official group roster.
- [ ] Guest is not automatically given member/leader permissions.

---

## Scenario 6 — Returning person stays one person, gains another source/history event

**Tester:** Guest + authorized Outreach reviewer.

**Setup:** First submit a synthetic guest through one valid source link. Then open a different valid source link and submit the **same exact email** again.

### Goal for guest

English:
> You are returning to the church through a different invitation. Use the same contact information you used the first time.

Español:
> Usted está regresando a la iglesia por medio de otra invitación. Use la misma información de contacto que usó la primera vez.

### Coordinator verification

- [ ] One canonical Outreach contact/person is preserved rather than two duplicate contacts.
- [ ] The second touch/source is preserved in interaction/source history.
- [ ] The original acquisition/source is not silently overwritten.
- [ ] Follow-up remains actionable after the return.
- [ ] No false success hides a duplicate-person problem.

**P0 failure:** the same exact same-church email creates an unintended duplicate person/contact or merges across the wrong church/person.

---

## Scenario 7 — Follow-up queue is actionable on a phone

**Tester:** Pastor/Admin, explicit `manage_outreach`, or a legitimately scoped leader who should see the selected contact.

### Goal

English:
> A guest needs follow-up. Find the person who needs attention, assign the right owner if needed, set the next follow-up, and record what happened.

Español:
> Una visita necesita seguimiento. Encuentre a la persona que necesita atención, asigne al responsable correcto si hace falta, ponga el próximo seguimiento y registre lo que pasó.

### Pass evidence

- [ ] Overdue / due soon / unassigned attention is understandable.
- [ ] Authorized tester can open the intended person.
- [ ] Follow-up owner can be set within authorized scope.
- [ ] Follow-up due date/time can be set and is understandable in church timezone.
- [ ] A legitimate interaction can be recorded.
- [ ] History shows the interaction after save.
- [ ] User receives clear success/failure feedback.
- [ ] No raw database/provider error is shown to the human user.

---

## Scenario 8 — Permission boundary: ordinary member cannot browse church-wide private Outreach

**Tester:** Ordinary member.

### Goal

English:
> Try to find private follow-up information for people you did not create, are not assigned to, and are not connected to through a group you operate.

Español:
> Intente encontrar información privada de seguimiento de personas que usted no creó, que no le fueron asignadas y que no pertenecen a un grupo que usted dirige.

### Pass evidence

- [ ] Ordinary member cannot browse church-wide private Outreach records.
- [ ] Private notes are not exposed.
- [ ] Unrelated prayer/follow-up data is not exposed.
- [ ] No route or menu wording falsely suggests church-wide authority.

**P0 failure:** unrelated private Outreach records are readable by an ordinary member.

---

## Scenario 9 — Paused link fails closed

**Tester:** Authorized person who can pause their link + signed-out guest.

### Goal

English for owner:
> Pause this test connection link.

Then English for guest:
> Open the same link and tell me what you understand from the screen.

Español para el responsable:
> Pause este enlace de conexión de prueba.

Después para la visita:
> Abra el mismo enlace y dígame qué entiende de la pantalla.

### Pass evidence

- [ ] Paused link no longer accepts a guest submission.
- [ ] Guest sees a safe unavailable-link explanation.
- [ ] No private source data leaks through the unavailable state.
- [ ] Reactivating the link restores normal behavior for an authorized owner.

---

## Scenario 10 — Retry / double-submit does not create duplicate Outreach records

**Tester:** Signed-out guest using the designated `P1 Retry Guest` synthetic identity.

### Goal

English:
> Submit this test connection form. If the phone appears slow, tap the submit button one extra time as a normal impatient user might.

Español:
> Envíe este formulario de conexión de prueba. Si el teléfono parece lento, toque el botón de enviar una vez más como lo haría una persona impaciente.

### Coordinator verification

- [ ] The human sees one understandable completion state.
- [ ] Only one canonical Outreach contact is created/reused for this synthetic identity.
- [ ] The same request does not create duplicate interaction/history rows.
- [ ] If the app cannot confirm save, the user is told not to repeatedly submit and receives understandable retry guidance.

**Do this only with synthetic QA data.**

---

## Scenario 11 — Friendship Group report → canonical Outreach bridge

**Tester:** Authorized Friendship Group leader using a safe QA group/report.

This scenario directly human-verifies the runtime path that was repaired before the Package 1 automated gate turned green.

### Setup

Use a designated QA report or a current test occurrence. Do **not** rewrite a real historical report.

Use a synthetic guest with a stable email such as `p1-fg-gh-20260826@example.com`.

### Goal

English:
> Complete the Friendship Group report as you normally would and include this guest. Save/submit the report, then confirm the guest is available for proper follow-up without entering the person twice.

Español:
> Complete el informe del Grupo de Amistad como lo haría normalmente e incluya esta visita. Guarde o envíe el informe y después confirme que la visita está disponible para seguimiento sin tener que registrar a la persona dos veces.

### Pass evidence

- [ ] Group report submits successfully on a real phone.
- [ ] Guest with stable phone/email reaches canonical Outreach.
- [ ] Source/group/report history is preserved.
- [ ] Guest name alone, without stable phone/email, is treated as report data rather than weak identity proof.
- [ ] Reported baptism/Holy Ghost names do not silently become official verified milestones.
- [ ] No duplicate person/contact is created by the bridge.
- [ ] No false success is shown if guest synchronization fails.

If there is no safe QA Friendship Group/report available, mark this scenario **BLOCKED**. Package 1 remains HUMAN-VERIFICATION PENDING until this path is exercised safely.

---

## Scenario 12 — Mobile readability and “would I know what to do next?”

Every tester answers these before the observer explains anything.

English:

1. What do you think this screen is for?
2. What would you press next?
3. What information do you think is private here?
4. Do you think this action makes someone a church member or group member?
5. Was there anywhere you expected a button or explanation and could not find it?

Español:

1. ¿Para qué cree que sirve esta pantalla?
2. ¿Qué presionaría después?
3. ¿Qué información cree que es privada aquí?
4. ¿Cree que esta acción convierte a alguien automáticamente en miembro de la iglesia o del grupo?
5. ¿Hubo algún lugar donde esperaba encontrar un botón o una explicación y no la encontró?

Observer records answers verbatim or close to verbatim in the scorecard.

---

# 6. Severity / triage during testing

Use these levels consistently.

### P0 — Critical

Security/privacy exposure, cross-church leak, role escalation, destructive/data-loss behavior, wrong-person merge, duplicate identity corruption, or a flow that writes consequential data to the wrong person/church.

**Action:** stop the affected test immediately. Package 1 cannot be VERIFIED.

### P1 — Pilot blocker

A primary Package 1 workflow cannot be completed, English or Spanish has a critical dead end, Friendship Group report bridge fails, follow-up falsely reports success, or the same serious usability problem requires coaching for multiple testers.

**Action:** Package 1 cannot be VERIFIED until repaired and retested.

### P2 — Improvement

Flow completes safely but is confusing, wordy, hard to discover, or requires avoidable extra steps.

**Action:** fix before pilot if small/high-value; otherwise explicitly track.

### P3 — Polish

Cosmetic/spacing/minor copy preference with no meaningful workflow risk.

---

# 7. Package 1 human VERIFIED gate

Package 1 may be marked HUMAN VERIFIED only when all of the following are true:

- [ ] 3–5 real testers completed the planned coverage, or any reduced tester set is documented with reason.
- [ ] At least one English critical path passed on a real phone.
- [ ] At least one Spanish critical path passed on a real phone.
- [ ] iPhone and Android evidence exists when both device families are reasonably available; otherwise the device gap is explicit.
- [ ] No unresolved P0 issue exists.
- [ ] No unresolved P1 issue exists.
- [ ] Public no-account guest capture passes.
- [ ] Personal invitation sharing passes.
- [ ] Friendship Group link privacy passes.
- [ ] Returning-person duplicate-safe behavior passes.
- [ ] Authorized follow-up owner/due/history flow passes.
- [ ] Ordinary-member private-Outreach boundary passes.
- [ ] Paused-link fail-closed behavior passes.
- [ ] Retry/double-submit idempotency passes with synthetic data.
- [ ] Friendship Group report → canonical Outreach bridge passes on a safe QA report.
- [ ] No public Friendship Group link reveals a private home address.
- [ ] No connection link automatically grants church membership, group roster membership, leadership, or special permissions.
- [ ] Critical EN/ES screens can be completed without observer rescue.
- [ ] Repeated confusion from two or more testers has been triaged instead of dismissed.
- [ ] Marcus reviews the scorecard/results before Package 2 begins.

**Until this gate is reviewed, Package 2 stays on HOLD.**

---

# 8. Evidence to capture

For each tester/session, record:

- tester role (name may be initials if preferred);
- device + OS + browser;
- language used;
- exact URL/build identifier;
- scenario PASS / FAIL / BLOCKED / N/A;
- whether observer coaching was required;
- what confused the tester;
- screenshots only when useful and privacy-safe;
- defect severity P0/P1/P2/P3;
- exact reproduction steps;
- final recommendation: PASS, RETEST REQUIRED, or BLOCKED.

Do **not** include screenshots of private pastoral notes, real member sensitive data, private home addresses, or other information not needed to prove the test.
