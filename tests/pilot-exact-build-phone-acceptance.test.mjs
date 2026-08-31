import fs from 'node:fs'
import assert from 'node:assert/strict'

const doc=fs.readFileSync('docs/PILOT_EXACT_BUILD_PHONE_ACCEPTANCE.md','utf8')

const required=[
  'exact 40-character Git SHA',
  'Run the same required scenarios in English and Spanish',
  'Existing users must keep the same Kingdom Network account',
  'New private invitation',
  'Forgot password while joining a church/private invitation',
  'Login-email change confirmation',
  'Magic-link sign-in',
  'Missing/unsupported callback mode',
  'Kingdom Guide — extreme simplicity',
  'Setup Inbox upload',
  'unpublished Course Builder draft',
  'Pilot Readiness / Phone Proof integrity',
  'Stop-the-release conditions',
  'Production deployment remains HOLD'
]

for(const phrase of required){
  assert.ok(doc.includes(phrase),`pilot acceptance gate lost required coverage: ${phrase}`)
}

assert.match(doc,/duplicate account/i)
assert.match(doc,/Spanish/i)
assert.match(doc,/do not upload the same file again yet/i)
assert.match(doc,/must not claim success unless the current browser session is actually gone/i)

console.log('pilot exact-build phone acceptance gate: PASS')
