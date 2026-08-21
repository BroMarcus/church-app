import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Church Builder requires a real non-admin pilot member before people setup is ready',async()=>{
  const source=await read('src/app/church/launch/page.tsx')
  assert.match(source,/not\('role','in','\(pastor,church_admin\)'\)/)
  assert.match(source,/const people=\(pilotMembers\?\?0\)>0/)
  const peopleAssignment=source.match(/const people=[^\n]+/)?.[0]??''
  assert.doesNotMatch(peopleAssignment,/openInvites/)
})

test('Church Builder sends people setup through the safer Join Center flow',async()=>{
  const source=await read('src/app/church/launch/page.tsx')
  assert.match(source,/href:l\('\/church\/join-center'\)/)
  assert.match(source,/href:'\/church\/join-center'/)
  assert.match(source,/A pending invitation alone does not count as complete/)
  assert.match(source,/Una invitación pendiente por sí sola no cuenta como completado/)
})

test('Church Builder gives bilingual duplicate-account and password-recovery guidance',async()=>{
  const source=await read('src/app/church/launch/page.tsx')
  for(const phrase of [
    'Do not create a second account for the same person.',
    'No crees una segunda cuenta para la misma persona.',
    'Practice password recovery once',
    'Prueba la recuperación de contraseña una vez'
  ]) assert.match(source,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
  assert.match(source,/href=\{l\('\/login'\)\}/)
})

test('Church Builder remains pastor/admin only and preserves Spanish route context',async()=>{
  const source=await read('src/app/church/launch/page.tsx')
  assert.match(source,/!\['pastor','church_admin'\]\.includes\(membership\.role\)/)
  assert.match(source,/const l=\(path:string\)=>lang==='es'/)
  assert.match(source,/\/church\/launch\?lang=es/)
})

test('church settings does not expose raw database errors to pastors or admins',async()=>{
  const source=await read('src/app/church/settings/actions.ts')
  assert.doesNotMatch(source,/encodeURIComponent\(error\.message\)/)
  assert.match(source,/console\.error\('updateChurchSettings failed'/)
  assert.match(source,/We could not save the changes\. Try again\./)
  assert.match(source,/No se pudieron guardar los cambios\. Inténtalo de nuevo\./)
})

test('Setup Inbox approval is retry-safe and never publishes generated curriculum',async()=>{
  const actions=await read('src/app/church/setup-inbox/actions.ts')
  const page=await read('src/app/church/setup-inbox/page.tsx')
  assert.match(actions,/if\(row\.status==='ready'\).*return/s)
  assert.match(actions,/\.eq\('status','reviewing'\)\.select\('id'\)\.maybeSingle\(\)/)
  assert.match(actions,/\.eq\('slug',slug\)\.maybeSingle\(\)/)
  assert.match(actions,/if\(existing\.published\)/)
  assert.match(actions,/published:false/)
  assert.match(actions,/if\(error\|\|!course\?\.id\).*redirect\(inbox\(lang,'approve'\)\)/s)
  assert.match(actions,/if\(updateError\|\|!updated\).*redirect\(inbox\(lang,'approve'\)\)/s)
  assert.match(page,/Nothing was marked ready\. Try again\./)
  assert.match(page,/Nada se marcó como listo\. Inténtalo de nuevo\./)
  assert.match(page,/Nothing is published automatically/)
  assert.match(page,/Nada se publica automáticamente/)
})

test('Setup Inbox plan actions expose one-tap pending states in both languages',async()=>{
  const button=await read('src/app/church/setup-inbox/setup-action-button.tsx')
  const page=await read('src/app/church/setup-inbox/page.tsx')
  assert.match(button,/useFormStatus/)
  assert.match(button,/disabled=\{pending\}/)
  assert.match(button,/aria-busy=\{pending\}/)
  assert.match(button,/Approving…/)
  assert.match(button,/Aprobando…/)
  assert.match(page,/Tap once and keep this page open until it finishes\./)
  assert.match(page,/Toca una vez y mantén esta página abierta hasta que termine\./)
})

test('Setup Inbox uploader hides provider errors, validates uploads, and always releases busy state',async()=>{
  const source=await read('src/app/church/setup-inbox/setup-uploader.tsx')
  assert.doesNotMatch(source,/setStatus\(upload\.error\.message\)/)
  assert.doesNotMatch(source,/setStatus\(insert\.error\.message\)/)
  assert.match(source,/if\(saving\)return/)
  assert.match(source,/allowedTypes\.has\(file\.type\)/)
  assert.match(source,/20\*1024\*1024/)
  assert.match(source,/slice\(0,1000\)/)
  assert.match(source,/finally\{setSaving\(false\)\}/)
  assert.match(source,/aria-busy=\{saving\}/)
  assert.match(source,/The file could not be uploaded\. Try again\./)
  assert.match(source,/No se pudo subir el archivo\. Inténtalo de nuevo\./)
})

test('Setup Inbox crash recovery uses one selected language and keeps a Church Builder escape path',async()=>{
  const source=await read('src/app/church/setup-inbox/error.tsx')
  assert.match(source,/useSearchParams/)
  assert.match(source,/params\.get\('lang'\)==='es'/)
  assert.match(source,/Back to Church Builder/)
  assert.match(source,/Volver al Constructor de Iglesia/)
  assert.match(source,/\/church\/launch\?lang=es/)
})
