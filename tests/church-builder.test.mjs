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

test('Setup Inbox fails closed instead of marking curriculum ready after course creation failure',async()=>{
  const actions=await read('src/app/church/setup-inbox/actions.ts')
  const page=await read('src/app/church/setup-inbox/page.tsx')
  assert.match(actions,/if\(error\|\|!course\?\.id\).*redirect\(inbox\(lang,'approve'\)\)/s)
  assert.match(actions,/const \{error:updateError\}=await supabase\.from\('church_setup_uploads'\)\.update/)
  assert.match(actions,/if\(updateError\).*redirect\(inbox\(lang,'approve'\)\)/s)
  assert.match(page,/Nothing was marked ready\. Try again\./)
  assert.match(page,/Nada se marcó como listo\. Inténtalo de nuevo\./)
  assert.match(page,/name="lang" value=\{lang\}/)
})

test('Setup Inbox uploader hides provider errors and always releases the busy state',async()=>{
  const source=await read('src/app/church/setup-inbox/setup-uploader.tsx')
  assert.doesNotMatch(source,/setStatus\(upload\.error\.message\)/)
  assert.doesNotMatch(source,/setStatus\(insert\.error\.message\)/)
  assert.match(source,/finally\{setSaving\(false\)\}/)
  assert.match(source,/notice \$\{status\.kind\}/)
  assert.match(source,/The file could not be uploaded\. Try again\./)
  assert.match(source,/No se pudo subir el archivo\. Inténtalo de nuevo\./)
})
