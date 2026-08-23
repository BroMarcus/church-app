import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const privateActions=fs.readFileSync(path.join(process.cwd(),'src/app/church/invite-person/actions.ts'),'utf8')
const privatePage=fs.readFileSync(path.join(process.cwd(),'src/app/church/invite-person/page.tsx'),'utf8')
const inviteActions=fs.readFileSync(path.join(process.cwd(),'src/app/church/invites/actions.ts'),'utf8')
const invitePage=fs.readFileSync(path.join(process.cwd(),'src/app/church/invites/page.tsx'),'utf8')

test('private invitation server action independently verifies manage_members authority',()=>{
  assert.match(privateActions,/current_user_has_church_permission/)
  assert.match(privateActions,/p_permission_key:'manage_members'/)
  assert.match(privateActions,/const isChurchAdmin=\['pastor','church_admin'\]\.includes\(membership\.role\)/)
  assert.match(privateActions,/const canInvite=isChurchAdmin\|\|Boolean\(custom\)/)
  assert.match(privateActions,/if\(!canInvite\)redirect\(path\(lang,'not_authorized'\)\)/)
})

test('custom member managers cannot forge elevated starting roles',()=>{
  assert.match(privateActions,/if\(requestedRole!==['"]member['"]&&!isChurchAdmin\)redirect\(path\(lang,'role_not_allowed'\)\)/)
  assert.match(privatePage,/const roleOptions=\['pastor','church_admin'\]\.includes\(membership\.role\)\?leadershipInviteOptions:\[\['member'/)
  assert.ok(privatePage.includes('Pastor and Church Admin are never preassigned by invitation.'))
  assert.ok(privatePage.includes('Pastor y Administrador nunca se preasignan por invitación.'))
})

test('private invitation access reads fail closed instead of looking unauthorized or successful',()=>{
  assert.match(privateActions,/claimsError[\s\S]*access_unavailable/)
  assert.match(privateActions,/membershipError[\s\S]*access_unavailable/)
  assert.match(privateActions,/permissionError[\s\S]*access_unavailable/)
  assert.match(privatePage,/claimsError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
  assert.match(privatePage,/membershipError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
  assert.match(privatePage,/permissionError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
})

test('private invitation diagnostics are bounded and do not log provider messages',()=>{
  assert.match(privateActions,/const boundedCode=/)
  assert.match(privateActions,/errorCode:boundedCode\(claimsError\.code\)/)
  assert.match(privateActions,/errorCode:boundedCode\(membershipError\.code\)/)
  assert.match(privateActions,/errorCode:boundedCode\(permissionError\.code\)/)
  assert.doesNotMatch(privateActions,/error\.message|claimsError\.message|membershipError\.message|permissionError\.message/)
  assert.doesNotMatch(privatePage,/error\.message|claimsError\.message|membershipError\.message|permissionError\.message/)
})

test('private invitation inputs are bounded server-side and client-side',()=>{
  assert.match(privateActions,/validEmail\(email\)/)
  assert.match(privateActions,/validText\(firstName,80\)/)
  assert.match(privateActions,/validText\(lastName,80\)/)
  assert.match(privateActions,/validText\(phone,40\)/)
  assert.match(privatePage,/name="first_name"[\s\S]*maxLength=\{80\}/)
  assert.match(privatePage,/name="last_name"[\s\S]*maxLength=\{80\}/)
  assert.match(privatePage,/name="phone"[\s\S]*maxLength=\{40\}/)
  assert.match(privatePage,/name="email"[\s\S]*maxLength=\{254\}/)
})

test('private invitation recovery is bilingual and does not encourage duplicate accounts',()=>{
  assert.ok(privatePage.includes('We could not verify your invitation access right now. Nothing was changed.'))
  assert.ok(privatePage.includes('No pudimos verificar tu acceso para invitar en este momento. No se cambió nada.'))
  assert.ok(privatePage.includes('they should sign in with that same account—not create another one.'))
  assert.ok(privatePage.includes('debe iniciar sesión con la misma cuenta; no debe crear otra.'))
})

test('member invitation create and revoke actions fail closed on uncertain access',()=>{
  assert.match(inviteActions,/claimsError[\s\S]*access_unavailable/)
  assert.match(inviteActions,/membershipError[\s\S]*access_unavailable/)
  assert.match(inviteActions,/!membership\?\.church_id\|\|!\['pastor','church_admin'\]\.includes\(membership\.role\)[\s\S]*not_authorized/)
  assert.match(inviteActions,/validEmail\(email\)/)
  assert.match(inviteActions,/inviteIdPattern\.test\(inviteId\)/)
})

test('member invitation page distinguishes backend uncertainty from real authorization denial',()=>{
  assert.match(invitePage,/claimsError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
  assert.match(invitePage,/membershipError[\s\S]*AccessRecovery lang=\{lang\} kind="unavailable"/)
  assert.match(invitePage,/!membership\?\.church_id\|\|!\['pastor','church_admin'\]\.includes\(membership\.role\)[\s\S]*AccessRecovery lang=\{lang\} kind="unauthorized"/)
  assert.ok(invitePage.includes('This may be a temporary connection problem. No invitation was created, changed, or revoked.'))
  assert.ok(invitePage.includes('Puede ser un problema temporal de conexión. No se creó, cambió ni revocó ninguna invitación.'))
})

test('member invitation diagnostics and inputs stay bounded',()=>{
  assert.match(inviteActions,/errorCode:boundedCode\(claimsError\.code\)/)
  assert.match(inviteActions,/errorCode:boundedCode\(membershipError\.code\)/)
  assert.match(inviteActions,/errorCode:boundedCode\(error\.code\)/)
  assert.match(invitePage,/errorCode:boundedCode\(invitesError\.code\)/)
  assert.doesNotMatch(inviteActions,/error\.message|claimsError\.message|membershipError\.message/)
  assert.doesNotMatch(invitePage,/error\.message|claimsError\.message|membershipError\.message|invitesError\.message/)
  assert.match(invitePage,/name="email"[\s\S]*maxLength=\{254\}/)
})