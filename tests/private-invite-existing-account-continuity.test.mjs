import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const loginActions=read('src/app/login/actions.ts')
const loginPage=read('src/app/login/page.tsx')
const callback=read('src/app/auth/callback/route.ts')
const resetPage=read('src/app/auth/update-password/page.tsx')
const startPage=read('src/app/start/page.tsx')

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
  assert.ok(localSignouts.length>=2,'expected existing-account cleanup plus new-account cleanup')
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

test('confirmation callback applies the private invite with the verified session and goes directly to Start Here',()=>{
  assert.match(loginActions,/callbackUrl\(lang,'signup',startPath,inviteId\)/)
  const exchangeIndex=callback.indexOf('exchangeCodeForSession')
  const redeemIndex=callback.indexOf("redeem_invite_for_current_user")
  assert.ok(exchangeIndex>=0,'callback must verify the email/session first')
  assert.ok(redeemIndex>exchangeIndex,'callback must redeem only after session verification')
  assert.match(callback,/mode==='signup'&&inviteId/)
  assert.match(callback,/p_invite_id:inviteId/)
  assert.match(callback,/message_code=joined_invite/)
  assert.doesNotMatch(callback,/confirmation_ready_for_invite/)
  assert.match(startPage,/joined_invite/)
  assert.match(startPage,/correo está confirmado/i)
})

test('confirmed-invite RPC or cleanup transport failures fail closed instead of leaving an uncertain signed-in session',()=>{
  assert.match(callback,/confirmed private invitation redemption unavailable/)
  assert.match(callback,/for\(let attempt=1;attempt<=2&&!cleanupSucceeded;attempt\+=1\)/)
  assert.match(callback,/post-confirmation invite local sign out unavailable/)
  assert.match(callback,/if\(!cleanupSucceeded\)return NextResponse\.redirect\(new URL\(`\/account\/security\?lang=\$\{lang\}&invite=\$\{encodeURIComponent\(inviteId\)\}&status=signout_failed`/)
  assert.match(callback,/return loginError\('invite_redeem_failed'\)/)
})

test('new private-invite signup does not place invite id in unverified auth user metadata',()=>{
  assert.match(loginActions,/emailRedirectTo:callbackUrl\(lang,'signup',startPath,inviteId\)/)
  const signUpStart=loginActions.indexOf('supabase.auth.signUp')
  const signUpEnd=loginActions.indexOf('if(error)',signUpStart)
  assert.ok(signUpStart>=0&&signUpEnd>signUpStart,'signup call should be present')
  const signUpCall=loginActions.slice(signUpStart,signUpEnd)
  assert.doesNotMatch(signUpCall,/invite_id\s*:/,'unconfirmed user metadata must not consume/reserve the invite')
  assert.match(loginActions,/if\(data\.session&&inviteId\)/)
  assert.match(loginActions,/new-account private invitation redemption failed/)
  assert.match(loginActions,/message_code=joined_invite/)
})

test('private invitation ids are UUID bounded before RPC or redirect use',()=>{
  assert.match(loginActions,/INVITE_ID_PATTERN/)
  assert.match(loginActions,/safeInviteId\(rawInviteId\)/)
  assert.match(callback,/INVITE_ID_PATTERN/)
  assert.match(resetPage,/INVITE_ID_PATTERN/)
})
