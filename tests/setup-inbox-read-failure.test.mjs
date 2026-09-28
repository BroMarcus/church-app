import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Setup Inbox fails closed instead of showing an empty inbox when required reads fail',async()=>{
  const source=await read('src/app/church/setup-inbox/page.tsx')
  assert.match(source,/const \{data:claims,error:claimsError\}=await supabase\.auth\.getClaims\(\)/)
  assert.match(source,/if\(claimsError\).*throw new Error\('setup-inbox-load-failed'\)/s)
  assert.match(source,/const \{data:m,error:membershipError\}=await supabase\.from\('church_memberships'\)/)
  assert.match(source,/if\(membershipError\).*throw new Error\('setup-inbox-load-failed'\)/s)
  assert.match(source,/const \{data:rows,error:rowsError\}=await supabase\.from\('church_setup_uploads'\)/)
  assert.match(source,/if\(rowsError\).*throw new Error\('setup-inbox-load-failed'\)/s)
  assert.match(source,/console\.error\('SetupInbox records read failed'/)
})
