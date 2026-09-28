import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const route=readFileSync(new URL('../src/app/auth/callback/route.ts',import.meta.url),'utf8')
const recovery=readFileSync(new URL('../src/app/auth/link-unavailable/page.tsx',import.meta.url),'utf8')

test('auth callback only labels explicit terminal auth-link codes as expired links',()=>{
  assert.match(route,/TERMINAL_AUTH_LINK_CODES=new Set\(\['otp_expired','flow_state_expired','flow_state_not_found','invite_not_found'\]\)/)
  assert.match(route,/TERMINAL_AUTH_LINK_CODES\.has\(code\)\?'callback_expired':'callback_unavailable'/)
  assert.doesNotMatch(route,/status>=400&&status<500&&status!==429\?'callback_expired'/)
  assert.match(route,/classification:failureCode/)
})

test('temporary, ambiguous 4xx, or thrown callback failures get a dedicated retry explanation instead of a credentials error',()=>{
  assert.match(route,/Supabase may use the same HTTP status \(notably 403\)/)
  assert.match(route,/try\{[\s\S]*exchangeCodeForSession\(code\)[\s\S]*\}catch\(error\)\{/)
  assert.match(route,/auth callback session exchange unavailable/)
  assert.match(route,/const linkUnavailable=\(\)=>NextResponse\.redirect\(new URL\(`\/auth\/link-unavailable\?lang=/)
  assert.match(route,/failureCode==='callback_expired'\?loginError\(failureCode\):linkUnavailable\(\)/)
  assert.match(route,/return linkUnavailable\(\)/)
  assert.doesNotMatch(route,/return loginError\('login_failed'\)/)
})

test('uncertain callback recovery clearly protects the newest email link and existing account in English and Spanish',()=>{
  assert.match(recovery,/This does not mean your newest link is expired or used/)
  assert.match(recovery,/Do not request another email unless Kingdom Network specifically tells you the newest link expired/)
  assert.match(recovery,/Do not create a second one/)
  assert.match(recovery,/Esto no significa que tu enlace más reciente haya vencido o ya se haya usado/)
  assert.match(recovery,/No solicites otro correo a menos que Kingdom Network te diga específicamente que el enlace más reciente venció/)
  assert.match(recovery,/No crees una segunda cuenta/)
})

test('callback failure recovery preserves validated invite and church-join context',()=>{
  assert.match(route,/const loginError=\(errorCode:string\)=>NextResponse\.redirect\(new URL\(`\/login\?lang=\$\{lang\}&mode=signin\$\{inviteId\?/)
  assert.match(route,/const linkUnavailable=\(\)=>NextResponse\.redirect\(new URL\(`\/auth\/link-unavailable\?lang=\$\{lang\}\$\{inviteId\?/)
  assert.match(route,/\$\{joinNext\?`&next=\$\{encodeURIComponent\(joinNext\)\}`:''\}/)
  assert.match(recovery,/const signInHref=`\/login\?lang=\$\{lang\}&mode=signin\$\{inviteId\?/)
  assert.match(recovery,/safeJoinNext\(params\.next\)/)
})

test('callback diagnostics stay bounded instead of logging raw provider exceptions',()=>{
  assert.match(route,/boundedCode\(error\.code\)/)
  assert.match(route,/boundedCode\(error instanceof Error\?error\.name:'exchange_unavailable'\)/)
  assert.doesNotMatch(route,/console\.error\([^\n]*error\.message/)
})
