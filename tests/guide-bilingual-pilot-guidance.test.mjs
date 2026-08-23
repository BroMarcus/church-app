import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const guide=read('src/app/guide/page.tsx')
const help=read('src/lib/help-knowledge.ts')

test('Kingdom Guide includes bilingual recovery guidance for replaced invitations',()=>{
  assert.match(help,/id:'replaced-invite'/)
  assert.match(help,/Use the newest invitation or church join link your leader sent/)
  assert.match(help,/Usa la invitación o el enlace para unirte más reciente que te envió tu líder/)
  assert.match(help,/sign in with that same account instead of creating another one/)
  assert.match(help,/inicia sesión con esa misma cuenta en vez de crear otra/)
})

test('Kingdom Guide explains the safe Fresh Church Setup handoff in both languages',()=>{
  assert.match(help,/id:'fresh-church-setup'/)
  assert.match(help,/Approval creates or opens an unpublished Course Builder draft/)
  assert.match(help,/La aprobación crea o abre un borrador no publicado en Course Builder/)
  assert.match(help,/href:'\/church\/setup-inbox'/)
})

test('Spanish trusted-resource metadata is localized without changing stored values',()=>{
  assert.match(guide,/const displayMeta=/)
  assert.match(guide,/'official organization':'Organización oficial'/)
  assert.match(guide,/current:'Actual'/)
  assert.match(guide,/reference:'Referencia'/)
  assert.match(guide,/displayMeta\(r\.__authority,lang,'authority'\)/)
  assert.match(guide,/displayMeta\(r\.__status,lang,'status'\)/)
})

test('Guide search slightly favors resources matching the selected language without hiding other approved resources',()=>{
  assert.match(guide,/const languageScore=/)
  assert.match(guide,/languageScore\(r\.language_code,lang\)/)
  assert.doesNotMatch(guide,/\.eq\('language_code',lang\)/)
})

test('Guide diagnostics remain bounded and approved-resource filters stay intact',()=>{
  assert.match(guide,/const boundedCode=\(value:unknown\)=>String\(value\|\|'unknown'\)\.slice\(0,80\)/)
  assert.match(guide,/membership read failed',\{code:boundedCode\(membershipError\.code\)\}/)
  assert.match(guide,/resource search failed',\{code:boundedCode\(error\.code\)\}/)
  assert.match(guide,/\.eq\('approved_for_members',true\)/)
  assert.match(guide,/\.not\('archive_status','in','\(draft,retired\)'\)/)
})
