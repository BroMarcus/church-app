import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const actions=fs.readFileSync(path.join(process.cwd(),'src/app/church/invite-person/actions.ts'),'utf8')
const page=fs.readFileSync(path.join(process.cwd(),'src/app/church/invite-person/page.tsx'),'utf8')

test('create action requires a valid invitation UUID before reporting success',()=>{
  assert.match(actions,/const inviteIdPattern=/)
  assert.match(actions,/const inviteId=String\(row\?\.invite_id\?\?''\)\.trim\(\)/)
  assert.match(actions,/if\(!inviteIdPattern\.test\(inviteId\)\)[\s\S]*create_failed/)
  assert.match(actions,/redirect\(path\(lang,'created',inviteId\)\)/)
})

test('share card requires an invitation that is open now',()=>{
  assert.ok(page.includes("expires_at,revoked_at,redeemed_at"))
  assert.match(page,/const isOpen=!r\.data\.revoked_at&&!r\.data\.redeemed_at&&Number\.isFinite\(expiresAt\)&&expiresAt>Date\.now\(\)/)
  assert.match(page,/if\(isOpen\)invite=r\.data[\s\S]*else createdInviteClosed=true/)
})

test('closed invitation recovery is clear in English and Spanish',()=>{
  assert.ok(page.includes('This link was used, revoked, or expired. Do not resend it.'))
  assert.ok(page.includes('Este enlace fue usado, revocado o venció. No lo vuelvas a enviar.'))
  assert.ok(page.includes('share only the newest open invitation.'))
  assert.ok(page.includes('comparte solamente la invitación abierta más reciente.'))
})
