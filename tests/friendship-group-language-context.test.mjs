import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Friendship Group weekly-role navigation preserves the selected language',async()=>{
  const client=await read('src/app/groups/[groupId]/portal/portal-client.tsx')
  assert.match(client,/roleManageHref=scheduleId\?`\/calendar\/manage\?schedule=\$\{scheduleId\}&lang=\$\{lang\}`:`\/calendar\/manage\?lang=\$\{lang\}`/)
  assert.match(client,/href=\{roleManageHref\}/)
})
