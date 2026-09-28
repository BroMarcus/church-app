import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source=fs.readFileSync('src/app/auth/update-password/error.tsx','utf8')

test('password reset error recovery keeps explicit language authoritative',()=>{
  assert.match(source,/explicitLang===['"]es['"]\?['"]es['"]:/)
  assert.match(source,/explicitLang===['"]en['"]\?['"]en['"]:/)
})

test('password reset error recovery falls back to Spanish browser language',()=>{
  assert.match(source,/navigator\.language\.toLowerCase\(\)\.startsWith\(['"]es['"]\)/)
  assert.match(source,/setBrowserLang\(['"]es['"]\)/)
})

test('password reset error recovery preserves safe sign-in context',()=>{
  assert.match(source,/safeInviteId\(params\.get\(['"]invite['"]\)\)/)
  assert.match(source,/safeJoinNext\(params\.get\(['"]next['"]\)\)/)
  assert.match(source,/\/login\?lang=\$\{lang\}&mode=signin/)
  assert.match(source,/Do not create another account\./)
  assert.match(source,/No crees otra cuenta\./)
})
