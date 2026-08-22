import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page=await readFile(new URL('../src/app/church/readiness/phone-proof/page.tsx',import.meta.url),'utf8')

test('browser-local phone proof is isolated by church, authenticated tester, and deployed build',()=>{
  assert.match(page,/const evidenceScope=`\$\{membership\.church_id\}:\$\{userId\}:\$\{buildId\}`/)
  assert.match(page,/Browser-local evidence must never leak between two admins/)
  assert.match(page,/churchId=\{evidenceScope\}/)
  assert.doesNotMatch(page,/<code>\{userId\}<\/code>/)
})
