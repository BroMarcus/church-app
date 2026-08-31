import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const resetPage=read('src/app/auth/update-password/page.tsx')
const securityPage=read('src/app/account/security/page.tsx')
const securityActions=read('src/app/account/security/actions.ts')

test('password-reset sign-out fallback preserves safe church join and private invitation context',()=>{
  assert.match(resetPage,/const nextPart=joinNext\?`&next=\$\{encodeURIComponent\(joinNext\)\}`:''/)
  assert.match(resetPage,/const invitePart=inviteId\?`&invite=\$\{encodeURIComponent\(inviteId\)\}`:''/)
  assert.match(resetPage,/const securityHref=`\/account\/security\?lang=\$\{lang\}\$\{invitePart\}\$\{nextPart\}`/)
  assert.match(resetPage,/signOutIncomplete\?securityHref:signInHref/)
})

test('Account Security accepts only rooted local church join destinations and UUID invitations',()=>{
  assert.match(securityPage,/function safeJoinNext/)
  assert.match(securityPage,/!value\.startsWith\('\/'\)/)
  assert.match(securityPage,/value\.startsWith\('\/\/'\)/)
  assert.match(securityPage,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(securityPage,/INVITE_ID_PATTERN/)
  assert.match(securityActions,/function safeJoinNext/)
  assert.match(securityActions,/INVITE_ID_PATTERN/)
  assert.match(securityActions,/safeInviteId\(text\(formData,'invite_id'\)\)/)
})

test('global sign-out returns to sign-in with the same safe recovery context',()=>{
  assert.match(securityPage,/name="next" value=\{joinNext\}/)
  assert.match(securityPage,/name="invite_id" value=\{inviteId\}/)
  assert.match(securityActions,/redirect\(`\/login\?lang=\$\{lang\}&mode=signin\$\{contextPart\(next,invite\)\}`\)/)
  assert.match(securityPage,/Finish your church connection/)
  assert.match(securityPage,/Termina tu conexión con la iglesia/)
  assert.match(securityPage,/Do not create another account/)
  assert.match(securityPage,/No crees otra cuenta/)
})

test('unsafe recovery context is not reflected back to the browser',()=>{
  assert.doesNotMatch(securityPage,/query\.next[^\n]*href=/)
  assert.doesNotMatch(securityPage,/query\.invite[^\n]*href=/)
  assert.doesNotMatch(securityActions,/text\(formData,'next'\)[^\n]*redirect\(/)
})