import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const page=readFileSync(new URL('../src/app/auth/update-password/page.tsx',import.meta.url),'utf8')

test('temporary reset session lookup failure is not mislabeled as an expired link',()=>{
  assert.match(page,/const \{data,error\}=await supabase\.auth\.getSession\(\)/)
  assert.match(page,/if\(error\)\{[\s\S]*setRetryAvailable\(true\)[\s\S]*setMessage\(c\.sessionUnavailable\)[\s\S]*return/)
  assert.match(page,/sessionUnavailable:'We could not safely check your reset session right now/)
  assert.match(page,/sessionUnavailable:'No pudimos verificar de forma segura tu sesión para cambiar la contraseña/)
})

test('reset initialization failures offer an explicit retry without discarding safe church context',()=>{
  assert.match(page,/setRetryAvailable\(true\)/)
  assert.match(page,/onClick=\{\(\)=>window\.location\.reload\(\)\}/)
  assert.match(page,/const next=safeJoinNext\(url\.searchParams\.get\('next'\)\)/)
  assert.match(page,/const nextPart=joinNext\?`&next=\$\{encodeURIComponent\(joinNext\)\}`:''/)
})

test('password update retry guidance avoids forcing extra reset emails after a temporary failure',()=>{
  assert.match(page,/failed:'We could not update the password right now\. Keep this page open and try once more/)
  assert.match(page,/failed:'No pudimos cambiar la contraseña en este momento\. Mantén esta página abierta e inténtalo una vez más/)
})

test('password update submit blocks repeat taps and announces progress',()=>{
  assert.match(page,/disabled=\{busy\}/)
  assert.match(page,/aria-disabled=\{busy\}/)
  assert.match(page,/aria-busy=\{busy\}/)
  assert.match(page,/aria-live="polite"/)
})
