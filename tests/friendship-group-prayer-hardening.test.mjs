import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Prayer actions use bounded status codes instead of rendering provider/query-string text',async()=>{
  const [actions,reactions,page]=await Promise.all([
    read('src/app/prayer/actions.ts'),
    read('src/app/prayer/reaction-actions.ts'),
    read('src/app/prayer/page.tsx')
  ])
  assert.match(actions,/error_code:'prayer_failed'/)
  assert.match(actions,/message_code:postType==='testimony'\?'testimony_shared':'prayer_submitted'/)
  assert.match(actions,/error_code:'answer_failed'/)
  assert.doesNotMatch(actions,/&error=/)
  assert.doesNotMatch(reactions,/&error=/)
  assert.doesNotMatch(reactions,/encodeURIComponent\(error\.message\)/)
  assert.match(page,/errorMessages/)
  assert.match(page,/successMessages/)
  assert.doesNotMatch(page,/query\.error&&/)
})

test('Prayer reactions are constrained to the signed-in member active church',async()=>{
  const reactions=await read('src/app/prayer/reaction-actions.ts')
  assert.match(reactions,/from\('church_memberships'\).*eq\('user_id',userId\).*eq\('status','active'\)/)
  assert.match(reactions,/eq\('church_id',membership\.church_id\)\.eq\('post_type','prayer_request'\)/)
})

test('Prayer creation, reactions, and answered actions prevent repeat taps on slow phones',async()=>{
  const [button,page]=await Promise.all([
    read('src/app/prayer/pending-button.tsx'),
    read('src/app/prayer/page.tsx')
  ])
  assert.match(button,/useFormStatus/)
  assert.match(button,/disabled=\{isPending\}/)
  assert.match(button,/aria-busy=\{isPending\}/)
  assert.match(button,/Tap once and keep this page open until it finishes\./)
  assert.match(button,/Toca una sola vez y mantén esta página abierta hasta que termine\./)
  assert.match(page,/PrayerPendingButton/)
  assert.match(page,/Submitting prayer…/)
  assert.match(page,/Enviando petición…/)
  assert.match(page,/Mark answered/)
  assert.match(page,/Marcar contestada/)
})

test('Prayer requests are private by default while verified leader follow-up remains explicit',async()=>{
  const page=await read('src/app/prayer/page.tsx')
  assert.match(page,/value="private" defaultChecked/)
  assert.doesNotMatch(page,/value="public" defaultChecked/)
  assert.match(page,/Private — recommended/)
  assert.match(page,/Privada — recomendada/)
  assert.match(page,/Prayer requests start Private\. Your Friendship Group leaders are still notified so they can follow up\./)
  assert.match(page,/Your Friendship Group leader or assistant is still notified for follow-up\./)
  assert.match(page,/Your leaders are notified either way\. Check this only if you also want the full request visible on the private prayer wall/)
  assert.match(page,/Leadership will receive a follow-up task to help connect you with a group\./)
  assert.match(page,/Los líderes de tu Grupo de Amistad reciben una notificación para poder dar seguimiento\./)
  assert.match(page,/El liderazgo recibirá una tarea de seguimiento para ayudarte a conectarte con un grupo\./)
})

test('Prayer loading and crash recovery respect the selected language and preserve user data',async()=>{
  const [loading,error]=await Promise.all([
    read('src/app/prayer/loading.tsx'),
    read('src/app/prayer/error.tsx')
  ])
  assert.match(loading,/useSearchParams/)
  assert.match(loading,/Cargando peticiones de oración…/)
  assert.match(error,/useSearchParams/)
  assert.match(error,/Prayer route failed/)
  assert.match(error,/No se cambió ninguna petición, opción de privacidad ni estado\./)
  assert.match(error,/Go Home/)
  assert.match(error,/Ir a Inicio/)
})
