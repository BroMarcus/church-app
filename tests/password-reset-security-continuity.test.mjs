import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const resetPage=read('src/app/auth/update-password/page.tsx')
const securityPage=read('src/app/account/security/page.tsx')
const securityActions=read('src/app/account/security/actions.ts')

test('password-reset sign-out fallback preserves a safe church join destination',()=>{
  assert.match(resetPage,/const nextPart=joinNext\?`&next=\$\{encodeURIComponent\(joinNext\)\}`:''/)
  assert.match(resetPage,/const securityHref=`\/account\/security\?lang=\$\{lang\}\$\{nextPart\}`/)
  assert.match(resetPage,/signOutIncomplete\?securityHref:signInHref/)
})

test('Account Security accepts only rooted local church join recovery destinations',()=>{
  assert.match(securityPage,/function safeJoinNext/)
  assert.match(securityPage,/!value\.startsWith\('\/'\)/)
  assert.match(securityPage,/value\.startsWith\('\/\/'\)/)
  assert.match(securityPage,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(securityActions,/function safeJoinNext/)
  assert.match(securityActions,/!value\.startsWith\('\/'\)/)
  assert.match(securityActions,/value\.startsWith\('\/\/'\)/)
  assert.match(securityActions,/parsed\.pathname\.startsWith\('\/join\/'\)/)
})

test('global sign-out returns to sign-in with the same safe church context',()=>{
  assert.match(securityPage,/name="next" value=\{joinNext\}/)
  assert.match(securityActions,/const lang=langOf\(formData\),next=safeJoinNext\(text\(formData,'next'\)\),supabase=await createClient\(\)/)
  assert.match(securityActions,/redirect\(`\/login\?lang=\$\{lang\}&mode=signin\$\{nextPart\(next\)\}`\)/)
  assert.match(securityPage,/Finish your church connection/)
  assert.match(securityPage,/Termina tu conexión con la iglesia/)
})

test('unsafe recovery context is not reflected back to the browser',()=>{
  assert.doesNotMatch(securityPage,/query\.next[^\n]*href=/)
  assert.doesNotMatch(securityActions,/text\(formData,'next'\)[^\n]*redirect\(/)
})
