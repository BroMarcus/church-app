import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source=fs.readFileSync('src/app/auth/update-password/page.tsx','utf8')

test('password reset page keeps explicit language authoritative',()=>{
  assert.match(source,/if\(explicit===['"]es['"]\)return ['"]es['"]/)
  assert.match(source,/if\(explicit===['"]en['"]\)return ['"]en['"]/)
})

test('password reset page falls back to Spanish browser language',()=>{
  assert.match(source,/navigator\.language\.toLowerCase\(\)\.startsWith\(['"]es['"]\)\?['"]es['"]:['"]en['"]/)
  assert.match(source,/nextLang=preferredLanguage\(url\.searchParams\)/)
  assert.match(source,/listenerLang=preferredLanguage\(nextUrl\.searchParams\)/)
})

test('password reset page still validates and preserves invite and join context',()=>{
  assert.match(source,/safeInviteId\(url\.searchParams\.get\(['"]invite['"]\)\)/)
  assert.match(source,/safeJoinNext\(url\.searchParams\.get\(['"]next['"]\)\)/)
  assert.match(source,/\/login\?lang=\$\{lang\}&mode=signin/)
  assert.match(source,/\/account\/security\?lang=\$\{lang\}/)
})
