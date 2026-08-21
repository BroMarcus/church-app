import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

const allowedMeetingTypes=['regular','matthew_party','picnic','barbecue','special_event','other']

test('Friendship Group report meeting types match the live database contract',async()=>{
  const [actions,page]=await Promise.all([
    read('src/app/groups/actions.ts'),
    read('src/app/groups/[groupId]/page.tsx')
  ])
  for(const meetingType of allowedMeetingTypes){
    assert.match(actions,new RegExp(`'${meetingType}'`))
    assert.match(page,new RegExp(`value="${meetingType}"`))
  }
  assert.doesNotMatch(page,/value="outreach"/)
  assert.doesNotMatch(page,/value="fellowship"/)
  assert.doesNotMatch(page,/value="special"/)
})

test('Friendship Group duplicate reports get a specific recovery message',async()=>{
  const actions=await read('src/app/groups/actions.ts')
  assert.match(actions,/error\?\.code==='23505'/)
  assert.match(actions,/A report already exists for this group and meeting date\./)
  assert.match(actions,/Open Meeting history instead of submitting it again\./)
})

test('Friendship Group report submission prevents repeat taps while saving',async()=>{
  const [button,page]=await Promise.all([
    read('src/app/groups/[groupId]/report-submit-button.tsx'),
    read('src/app/groups/[groupId]/page.tsx')
  ])
  assert.match(button,/useFormStatus/)
  assert.match(button,/disabled=\{pending\}/)
  assert.match(button,/aria-disabled=\{pending\}/)
  assert.match(button,/Submitting report…/)
  assert.match(page,/<ReportSubmitButton\/>/)
  assert.match(page,/One report is stored per group and meeting date\./)
})
