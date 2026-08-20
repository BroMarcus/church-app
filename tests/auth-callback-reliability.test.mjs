import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('auth callback normalizes and limits continuation routes to pilot-safe destinations',async()=>{
  const source=await read('src/app/auth/callback/route.ts')
  assert.match(source,/function allowedAuthDestination/)
  assert.match(source,/path\.startsWith\('\/join\/'\)/)
  assert.match(source,/path\.startsWith\('\/start\?'\)/)
  assert.match(source,/path\.startsWith\('\/auth\/update-password\?'\)/)
  assert.match(source,/const requested=new URL\(raw,canonical\)/)
  assert.match(source,/requested\.origin!==canonical\.origin/)
  assert.match(source,/return allowedAuthDestination\(local\)\?local:fallback/)
  assert.doesNotMatch(source,/raw\.startsWith\('\/'\).*allowedAuthDestination\(raw\)/s)
})

test('auth callback failures return members to sign-in with safe bilingual guidance',async()=>{
  const source=await read('src/app/auth/callback/route.ts')
  assert.match(source,/mode=signin&error=/)
  assert.match(source,/That email link is incomplete\. Request one fresh email and open the newest link\./)
  assert.match(source,/Ese enlace de correo está incompleto\. Solicita un correo nuevo y abre el enlace más reciente\./)
  assert.match(source,/That link expired or was already used\. Request one fresh email and open only the newest link\./)
  assert.match(source,/Ese enlace venció o ya fue usado\. Solicita un correo nuevo y abre solamente el más reciente\./)
  assert.match(source,/console\.error\('auth callback session exchange failed'/)
  assert.doesNotMatch(source,/error\.message\}\`,siteUrl/)
})