import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Kingdom Guide distinguishes resource read failure from a real empty result set',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/resourceSearchFailed=false/)
  assert.match(source,/resourceSearchFailed=true/)
  assert.match(source,/We could not safely check your church resources right now\./)
  assert.match(source,/No pudimos revisar con seguridad los recursos de tu iglesia en este momento\./)
  assert.match(source,/Nothing was removed or changed\./)
  assert.match(source,/No se borró ni cambió nada\./)
  assert.match(source,/role="alert"/)
  assert.match(source,/Try search again/)
  assert.match(source,/Intentar búsqueda otra vez/)
})

test('Kingdom Guide keeps backend diagnostics bounded',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/Kingdom Guide resource search failed.*code:/s)
  assert.match(source,/Kingdom Guide membership read failed.*code:/s)
  assert.doesNotMatch(source,/console\.error\([^\n]*error\.message/)
  assert.doesNotMatch(source,/console\.error\([^\n]*membershipError\.message/)
})

test('Kingdom Guide preserves approved-member-only resource filtering',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/\.eq\('church_id',membership\.church_id\)/)
  assert.match(source,/\.eq\('approved_for_members',true\)/)
  assert.match(source,/\.not\('archive_status','in','\(draft,retired\)'\)/)
})

test('Kingdom Guide retains bilingual account and church-join help entry points',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/fix an account problem, join your church/)
  assert.match(source,/resolver un problema de cuenta, unirte a tu iglesia/)
  assert.match(source,/I forgot my password, how do I join my church/)
  assert.match(source,/olvidé mi contraseña, cómo me uno a mi iglesia/)
})
