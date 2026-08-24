import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const action=readFileSync(new URL('../src/app/auth/verify/actions.ts',import.meta.url),'utf8')
const page=readFileSync(new URL('../src/app/auth/verify/page.tsx',import.meta.url),'utf8')

test('legacy token verification distinguishes certain expired links from temporary outages',()=>{
  assert.match(action,/status>=400&&status<500&&status!==429/)
  assert.match(action,/verifyRetryUrl\(tokenHash,rawType,lang,joinNext\)/)
  assert.match(action,/auth token verification unavailable/)
  assert.doesNotMatch(action,/if\(error\)[\s\S]{0,220}callback_expired[\s\S]{0,80}\}/)
})

test('uncertain verification preserves the same newest token and safe join context for manual retry',()=>{
  assert.match(action,/new URLSearchParams\(\{token_hash:tokenHash,type:rawType,lang,error_code:'verify_unavailable'\}\)/)
  assert.match(action,/if\(joinNext\)query\.set\('next',joinNext\)/)
  assert.match(page,/params\.error_code==='verify_unavailable'&&hasLink/)
})

test('verification retry state is bilingual and does not falsely call the newest link expired',()=>{
  assert.match(page,/The link was not confirmed as expired/)
  assert.match(page,/No se confirmó que haya vencido/)
  assert.match(page,/Do not request several new emails unless this continues/)
  assert.match(page,/No solicites varios correos nuevos a menos que esto continúe/)
})

test('verification diagnostics are bounded and do not log provider message text',()=>{
  assert.match(action,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,48\)/)
  assert.doesNotMatch(action,/console\.error\([^\n]*\.message/)
})
