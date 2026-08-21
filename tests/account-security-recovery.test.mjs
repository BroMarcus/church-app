import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('account security never renders arbitrary query-string error text',async()=>{
  const page=await read('src/app/account/security/page.tsx')
  assert.doesNotMatch(page,/\{query\.error\}/)
  assert.match(page,/query\.error\?'generic':null/)
  assert.match(page,/Object\.prototype\.hasOwnProperty\.call\(errorCopy,query\.status\)/)
  assert.match(page,/role="alert"/)
  assert.match(page,/Nothing was changed\. Please try again\./)
  assert.match(page,/No se cambió nada\. Inténtalo otra vez\./)
})

test('account security actions keep provider errors out of member-facing redirects',async()=>{
  const actions=await read('src/app/account/security/actions.ts')
  assert.doesNotMatch(actions,/encodeURIComponent\(error\.message\)/)
  assert.doesNotMatch(actions,/message=\$\{encodeURIComponent/)
  assert.match(actions,/failureUrl\(lang,'email_update_failed'\)/)
  assert.match(actions,/failureUrl\(lang,'password_update_failed'\)/)
  assert.match(actions,/failureUrl\(lang,'signout_failed'\)/)
  assert.match(actions,/safeAuthDiagnostic/)
  assert.match(actions,/Account security email update failed/)
  assert.match(actions,/Account security password update failed/)
  assert.match(actions,/Account security global sign-out failed/)
})

test('account security handles network failures and does not falsely report success',async()=>{
  const actions=await read('src/app/account/security/actions.ts')
  assert.match(actions,/Account security email update request failed/)
  assert.match(actions,/Account security password update request failed/)
  assert.match(actions,/Account security global sign-out request failed/)
  assert.match(actions,/const result=await supabase\.auth\.signOut\(\{scope:'global'\}\)/)
  assert.match(actions,/if\(signOutError\)/)
  assert.match(actions,/redirect\(`\/login\?lang=\$\{lang\}&mode=signin`\)/)
})

test('account security forms prevent accidental duplicate submits',async()=>{
  const page=await read('src/app/account/security/page.tsx')
  const button=await read('src/app/account/security/security-submit-button.tsx')
  assert.match(page,/SecuritySubmitButton/)
  assert.match(page,/Requesting change…/)
  assert.match(page,/Updating password…/)
  assert.match(page,/Signing out…/)
  assert.match(button,/useFormStatus/)
  assert.match(button,/disabled=\{pending\}/)
  assert.match(button,/aria-disabled=\{pending\}/)
})
