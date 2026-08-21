import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Friendship Group weekly-role navigation preserves the selected language',async()=>{
  const client=await read('src/app/groups/[groupId]/portal/portal-client.tsx')
  assert.match(client,/roleManageHref=scheduleId\?`\/calendar\/manage\?schedule=\$\{scheduleId\}&lang=\$\{lang\}`:`\/calendar\/manage\?lang=\$\{lang\}`/)
  assert.match(client,/href=\{roleManageHref\}/)
})

test('leader self-create preserves language and uses fixed recovery status codes',async()=>{
  const [page,action]=await Promise.all([
    read('src/app/groups/page.tsx'),
    read('src/app/groups/self-create-actions.ts')
  ])
  assert.match(page,/name="lang" value=\{lang\}/)
  assert.match(action,/withLang\('\/login',lang\)/)
  assert.match(action,/status=leader_access/)
  assert.match(action,/status=\$\{status\}/)
  assert.match(action,/withLang\(`\/groups\/\$\{groupId\}\/portal`,lang\)/)
})

test('Friendship Group directory never renders arbitrary query-string error text',async()=>{
  const page=await read('src/app/groups/page.tsx')
  assert.match(page,/params\.error\?statusCopy\[lang\]\.generic:null/)
  assert.doesNotMatch(page,/\{params\.error&&<div[^>]*>\{params\.error\}/)
  assert.match(page,/role="alert"/)
})
