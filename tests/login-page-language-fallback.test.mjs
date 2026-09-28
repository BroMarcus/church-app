import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source=fs.readFileSync('src/app/login/page.tsx','utf8')

test('login entry keeps explicit language authoritative',()=>{
  assert.match(source,/params\.lang===['"]es['"]\?['"]es['"]:params\.lang===['"]en['"]\?['"]en['"]/)
})

test('login entry falls back to Spanish request language',()=>{
  assert.match(source,/import \{ headers \} from ['"]next\/headers['"]/)
  assert.match(source,/requestHeaders=await headers\(\)/)
  assert.match(source,/requestHeaders\.get\(['"]accept-language['"]\)/)
  assert.match(source,/function prefersSpanish\(acceptLanguage:string\|null\)/)
})

test('language fallback does not weaken invite or join safety',()=>{
  assert.match(source,/INVITE_ID_PATTERN/)
  assert.match(source,/safeJoinNext\(params\.next\)/)
  assert.match(source,/carryInviteContext=Boolean\(inviteParam\)&&!invalidInviteKnown/)
  assert.match(source,/do not create another account/i)
  assert.match(source,/No crees otra cuenta/i)
})
