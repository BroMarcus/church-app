import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const confirmRoute=readFileSync(new URL('../src/app/auth/confirm/route.ts',import.meta.url),'utf8')
const verifyPage=readFileSync(new URL('../src/app/auth/verify/page.tsx',import.meta.url),'utf8')
const verifyActions=readFileSync(new URL('../src/app/auth/verify/actions.ts',import.meta.url),'utf8')

test('token-hash confirmation extracts only a safe private invite from the same-origin signup callback',()=>{
  assert.match(confirmRoute,/INVITE_ID_PATTERN/)
  assert.match(confirmRoute,/callback\.origin!==canonical\.origin\|\|callback\.pathname!=='\/auth\/callback'/)
  assert.match(confirmRoute,/callback\.searchParams\.get\('mode'\)==='recovery'/)
  assert.match(confirmRoute,/inviteId:safeInviteId\(callback\.searchParams\.get\('invite'\)\)/)
  assert.match(confirmRoute,/if\(inviteId\)verifyUrl\.searchParams\.set\('invite',inviteId\)/)
})

test('verification screen preserves bounded invite context and explains same-account behavior bilingually',()=>{
  assert.match(verifyPage,/INVITE_ID_PATTERN/)
  assert.match(verifyPage,/name="invite" value=\{inviteId\}/)
  assert.match(verifyPage,/Kingdom Network will safely connect this church invitation to this same account/)
  assert.match(verifyPage,/Kingdom Network conectará de forma segura esta invitación de la iglesia con esta misma cuenta/)
  assert.match(verifyPage,/inviteMalformed=Boolean\(params\.invite&&!inviteId\)/)
})

test('successful token-hash email verification redeems private invite only after verified session',()=>{
  const verifyIndex=verifyActions.indexOf('supabase.auth.verifyOtp')
  const redeemIndex=verifyActions.indexOf("supabase.rpc('redeem_invite_for_current_user'")
  assert.ok(verifyIndex>=0&&redeemIndex>verifyIndex,'invite redemption must occur after OTP verification')
  assert.match(verifyActions,/if\(rawType==='email'&&inviteId\)/)
  assert.match(verifyActions,/!row\?\.church_id/)
  assert.match(verifyActions,/signOut\(\{scope:'local'\}\)/)
  assert.match(verifyActions,/for\(let attempt=1;attempt<=2&&!cleanupSucceeded;attempt\+=1\)/)
  assert.match(verifyActions,/redirect\(`\/start\?lang=\$\{lang\}&message_code=joined_invite`\)/)
})

test('temporary verification retry and recovery preserve only validated invitation context',()=>{
  assert.match(verifyActions,/verifyRetryUrl\(tokenHash,rawType,lang,joinNext,inviteId\)/)
  assert.match(verifyActions,/if\(inviteId\)query\.set\('invite',inviteId\)/)
  assert.match(verifyActions,/if\(rawInviteId&&!inviteId\)redirect\(`\$\{loginBase\}&error_code=invite_invalid`\)/)
  assert.match(verifyActions,/redirect\(`\/auth\/update-password\?lang=\$\{lang\}\$\{nextPart\}\$\{invitePart\}`\)/)
})