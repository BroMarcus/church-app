import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const route=readFileSync(new URL('../src/app/auth/callback/route.ts',import.meta.url),'utf8')

test('auth callback only labels explicit terminal auth-link codes as expired links',()=>{
  assert.match(route,/TERMINAL_AUTH_LINK_CODES=new Set\(\['otp_expired','flow_state_expired','flow_state_not_found','invite_not_found'\]\)/)
  assert.match(route,/TERMINAL_AUTH_LINK_CODES\.has\(code\)\?'callback_expired':'login_failed'/)
  assert.doesNotMatch(route,/status>=400&&status<500&&status!==429\?'callback_expired'/)
  assert.match(route,/classification:failureCode/)
})

test('temporary, ambiguous 4xx, or thrown callback failures fail closed without claiming the newest link expired',()=>{
  assert.match(route,/Supabase may use the same HTTP status \(notably 403\)/)
  assert.match(route,/try\{[\s\S]*exchangeCodeForSession\(code\)[\s\S]*\}catch\(error\)\{/)
  assert.match(route,/auth callback session exchange unavailable/)
  assert.match(route,/return loginError\('login_failed'\)/)
})

test('callback failure recovery preserves validated invite and church-join context',()=>{
  assert.match(route,/const loginError=\(errorCode:string\)=>NextResponse\.redirect\(new URL\(`\/login\?lang=\$\{lang\}&mode=signin\$\{inviteId\?/)
  assert.match(route,/\$\{joinNext\?`&next=\$\{encodeURIComponent\(joinNext\)\}`:''\}/)
})

test('callback diagnostics stay bounded instead of logging raw provider exceptions',()=>{
  assert.match(route,/boundedCode\(error\.code\)/)
  assert.match(route,/boundedCode\(error instanceof Error\?error\.name:'exchange_unavailable'\)/)
  assert.doesNotMatch(route,/console\.error\([^\n]*error\.message/)
})
