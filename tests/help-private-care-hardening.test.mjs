import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')

test('private care never renders arbitrary query or provider errors',()=>{
  const page=read('src/app/help/page.tsx')
  const actions=read('src/app/help/actions.ts')
  assert.doesNotMatch(page,/\{query\.error\}/)
  assert.match(page,/query\.error\?'temporary_problem'/)
  assert.doesNotMatch(actions,/error\.message/)
  assert.match(actions,/logHelpError\('create'/)
  assert.match(actions,/status=\$\{encodeURIComponent\(status\)\}/)
})

test('private care critical reads fail closed instead of becoming empty state',()=>{
  const page=read('src/app/help/page.tsx')
  assert.match(page,/if\(membershipError\)readFailure\('membership'/)
  assert.match(page,/if\(myRequestsError\)readFailure\('member_requests'/)
  assert.match(page,/if\(careResult\.error\)readFailure\('pastoral_queue'/)
  assert.match(page,/if\(leaderResult\.error\)readFailure\('pastoral_leaders'/)
  assert.match(page,/if\(profilesResult\.error\)readFailure\('pastoral_profiles'/)
  assert.match(page,/if\(detailsResult\.error\)readFailure\('pastoral_contacts'/)
})

test('care writes are bounded and pastoral updates verify a changed record',()=>{
  const actions=read('src/app/help/actions.ts')
  assert.match(actions,/bounded\(subject,160\)/)
  assert.match(actions,/bounded\(message,5000\)/)
  assert.match(actions,/bounded\(note,2000\)/)
  assert.match(actions,/\.select\('id'\)[\s\S]*\.maybeSingle\(\)/)
  assert.match(actions,/if\(!data\?\.id\)redirect\(helpUrl\(lang,'request_not_found'\)\)/)
})

test('slow-phone care actions disable while pending and provide bilingual guidance',()=>{
  const page=read('src/app/help/page.tsx')
  const button=read('src/app/help/help-submit-button.tsx')
  assert.match(button,/useFormStatus/)
  assert.match(button,/disabled=\{pending\}/)
  assert.match(button,/aria-disabled=\{pending\}/)
  assert.match(page,/Sending… keep this page open/)
  assert.match(page,/Enviando… mantén esta página abierta/)
  assert.match(page,/Tap once\. Wait for the confirmation/)
  assert.match(page,/Toca una vez\. Espera la confirmación/)
})

test('help loading and crash recovery honor one selected language',()=>{
  const loading=read('src/app/help/loading.tsx')
  const error=read('src/app/help/error.tsx')
  assert.match(loading,/useSearchParams/)
  assert.match(loading,/searchParams\.get\('lang'\)==='es'/)
  assert.match(error,/useSearchParams/)
  assert.match(error,/searchParams\.get\('lang'\)==='es'/)
  assert.match(error,/Nothing was changed\./)
  assert.match(error,/No se cambió nada\./)
})
