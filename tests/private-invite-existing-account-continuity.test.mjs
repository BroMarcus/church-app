import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const loginActions=read('src/app/login/actions.ts')
const loginPage=read('src/app/login/page.tsx')
const callback=read('src/app/auth/callback/route.ts')
const resetPage=read('src/app/auth/update-password/page.tsx')

test('existing-account private invite is redeemed only after authenticated sign-in',()=>{
  assert.match(loginActions,/redeem_invite_for_current_user/)
  assert.match(loginActions,/p_invite_id:inviteId/)
  assert.match(loginActions,/redirect\(`\/start\?lang=\$\{lang\}&message_code=joined_existing`\)/)
  assert.match(loginActions,/auth\.signOut\(\{scope:'local'\}\)/)
  assert.match(loginActions,/post-invite-failure local sign out failed/)
  assert.match(loginActions,/invite_redeem_failed/)
})

test('failed invite redemption verifies local cleanup before claiming the browser was signed out',()=>{
  const localSignouts=loginActions.match(/auth\.signOut\(\{scope:'local'\}\)/g)??[]
  assert.ok(localSignouts.length>=2,'expected one local cleanup attempt plus one safe retry')
  assert.match(loginActions,/const \{error:retrySignOutError\}=await supabase\.auth\.signOut\(\{scope:'local'\}\)/)
  assert.match(loginActions,/post-invite-failure local sign out retry failed/)
  assert.match(loginActions,/redirect\(`\/account\/security\?lang=\$\{lang\}&invite=\$\{encodeURIComponent\(inviteId\)\}&status=signout_failed`\)/)
  assert.match(loginActions,/redirect\(loginUrl\(lang,'&mode=signin'\+invitePart\+statusPart\('error','invite_redeem_failed'\)\)\)/)
})

test('login page carries only a validated open invite into sign-in and recovery actions',()=>{
  assert.match(loginPage,/INVITE_ID_PATTERN/)
  assert.match(loginPage,/validInvite&&<input type="hidden" name="invite_id" value=\{inviteParam\}/)
  assert.match(loginPage,/inviteReturning/)
  assert.match(loginPage,/do not create a second account/i)
  assert.match(loginPage,/no crees una segunda cuenta/i)
})

test('forgot password preserves the same private invitation until the next sign-in',()=>{
  assert.match(loginActions,/resetPasswordForEmail\(email,\{redirectTo:recoveryUrl\(lang,next,inviteId\)\}\)/)
  assert.match(resetPage,/setInviteId\(safeInviteId\(url\.searchParams\.get\('invite'\)\)\)/)
  assert.match(resetPage,/const signInHref=`\/login\?lang=\$\{lang\}&mode=signin\$\{invitePart\}\$\{nextPart\}`/)
})

test('resend-confirmation callback returns an invited existing account to sign-in with the same invite',()=>{
  assert.match(loginActions,/callbackUrl\(lang,'signup',startPath,inviteId\)/)
  assert.match(callback,/confirmation_ready_for_invite/)
  assert.match(callback,/safeInviteId\(url\.searchParams\.get\('invite'\)\)/)
  assert.match(loginPage,/confirmation_ready_for_invite/)
})

test('private invitation ids are UUID bounded before RPC or redirect use',()=>{
  assert.match(loginActions,/INVITE_ID_PATTERN/)
  assert.match(loginActions,/safeInviteId\(rawInviteId\)/)
  assert.match(callback,/INVITE_ID_PATTERN/)
  assert.match(resetPage,/INVITE_ID_PATTERN/)
})
