import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('pilot readiness fails closed when auth or membership verification fails',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.match(source,/error:claimsError/)
  assert.match(source,/Pilot readiness auth check failed/)
  assert.match(source,/error:membershipError/)
  assert.match(source,/Pilot readiness membership check failed/)
  assert.match(source,/\.maybeSingle\(\)/)
  assert.match(source,/We could not verify your church access/)
  assert.match(source,/No pudimos verificar tu acceso a la iglesia/)
  assert.doesNotMatch(source,/claimsError\.message/)
  assert.doesNotMatch(source,/membershipError\.message/)
})

test('readiness RPC failure never becomes a fake zero-percent or zero-action result',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.match(source,/const rows=readinessError\?\[\]/)
  assert.match(source,/const score=readinessError\?null/)
  assert.match(source,/const blockers=readinessError\?null/)
  assert.match(source,/!readinessError&&<section className="readiness-grid"/)
  assert.match(source,/score===null\?'—'/)
  assert.match(source,/blockers===null\?<section/)
  assert.match(source,/Do not treat this as a 0% score or a clear checklist/)
  assert.match(source,/No interpretes esto como 0% ni como una lista sin problemas/)
  assert.doesNotMatch(source,/readinessError\.message/)
})

test('pilot readiness distinguishes automated checks from human phone proof',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.match(source,/PHONE PROOF GATE/)
  assert.match(source,/PRUEBA REAL EN TELÉFONO/)
  assert.match(source,/Automated checks are not pilot proof/)
  assert.match(source,/Las revisiones automáticas no prueban que el piloto está listo/)
  assert.match(source,/HUMAN PROOF REQUIRED/)
  assert.match(source,/REQUIERE PRUEBA HUMANA/)
  assert.match(source,/phone\/device, language, account type, date, PASS\/FAIL/)
  assert.match(source,/teléfono\/dispositivo, idioma, tipo de cuenta, fecha, PASÓ\/FALLÓ/)
  assert.match(source,/Use test accounts only/)
  assert.match(source,/Usa solamente cuentas de prueba/)
})

test('pilot readiness includes the critical pilot phone flows',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.match(source,/Test the public signup path all the way through/)
  assert.match(source,/Test an existing account joining a church/)
  assert.match(source,/without creating a duplicate account/)
  assert.match(source,/Test password recovery/)
  assert.match(source,/Test a Spanish first login on a phone/)
  assert.match(source,/Test Kingdom Guide recovery help/)
  assert.match(source,/Test Fresh Church Setup \/ Church Builder/)
  assert.match(source,/href=\{`\/guide/)
  assert.match(source,/href=\{`\/church\/setup-inbox/)
  assert.match(source,/opens as an unpublished draft/)
})

test('readiness crash and loading shells use one selected language',async()=>{
  const error=await read('src/app/church/readiness/error.tsx')
  const loading=await read('src/app/church/readiness/loading.tsx')
  assert.match(error,/useSearchParams/)
  assert.match(error,/searchParams\.get\('lang'\)==='es'/)
  assert.match(error,/No se cambió nada en la configuración de tu iglesia/)
  assert.doesNotMatch(error,/Try again \/ Intentar de nuevo/)
  assert.match(loading,/useSearchParams/)
  assert.match(loading,/searchParams\.get\('lang'\)==='es'/)
  assert.match(loading,/No cierres la página/)
  assert.match(loading,/Keep this page open/)
  assert.doesNotMatch(loading,/PILOT READINESS • PREPARACIÓN DEL PILOTO/)
})

test('readiness mobile styles keep recovery and human proof prominent',async()=>{
  const css=await read('src/app/church/readiness/readiness.css')
  assert.match(css,/\.readiness-score\.unavailable/)
  assert.match(css,/\.proof-gate/)
  assert.match(css,/\.human-proof/)
  assert.match(css,/\.readiness-recovery/)
  assert.match(css,/\.unavailable-footer/)
  assert.match(css,/min-height:40px/)
})
