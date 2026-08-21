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

test('Prayer privacy copy does not promise unverified leadership routing',async()=>{
  const page=await read('src/app/prayer/page.tsx')
  assert.match(page,/Use the separate Friendship Group choice below if you want your group to see it\./)
  assert.match(page,/Esta opción estará disponible después de que te unas a uno\./)
  assert.doesNotMatch(page,/It still routes to the proper Friendship Group leader or leadership follow-up\./)
  assert.doesNotMatch(page,/Leadership will be notified so someone can invite and connect you\./)
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
