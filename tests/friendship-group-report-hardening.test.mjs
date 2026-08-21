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

test('Friendship Group report submission prevents repeat taps and explains saving in English and Spanish',async()=>{
  const [button,page]=await Promise.all([
    read('src/app/groups/[groupId]/report-submit-button.tsx'),
    read('src/app/groups/[groupId]/page.tsx')
  ])
  assert.match(button,/useFormStatus/)
  assert.match(button,/useSearchParams/)
  assert.match(button,/searchParams\.get\('lang'\)==='es'/)
  assert.match(button,/disabled=\{pending\}/)
  assert.match(button,/aria-disabled=\{pending\}/)
  assert.match(button,/aria-busy=\{pending\}/)
  assert.match(button,/aria-describedby="group-report-submit-help group-report-submit-status"/)
  assert.match(button,/role="status"/)
  assert.match(button,/aria-live="polite"/)
  assert.match(button,/Submitting report…/)
  assert.match(button,/Enviando reporte…/)
  assert.match(button,/Tap Submit report once\. Keep this page open until it finishes\./)
  assert.match(button,/Toca Enviar reporte una sola vez\. Mantén esta página abierta hasta que termine\./)
  assert.match(button,/Do not tap the button again\./)
  assert.match(button,/No vuelvas a tocar el botón\./)
  assert.match(page,/<ReportSubmitButton\/>/)
  assert.match(page,/One report is stored per group and meeting date\./)
})

test('Friendship Group overview shows a real report-derived attendance average',async()=>{
  const page=await read('src/app/groups/[groupId]/page.tsx')
  assert.match(page,/attendanceAverage=reports\.length\?Math\.round/)
  assert.match(page,/Number\(r\.attendance_count\)/)
  assert.match(page,/avg attendance/)
})

test('Friendship Group paper-report batch calculates totals, supports five guests, and preserves a phone draft',async()=>{
  const [page,helper]=await Promise.all([
    read('src/app/groups/[groupId]/page.tsx'),
    read('src/app/groups/[groupId]/report-parity-helper.tsx')
  ])
  assert.match(page,/data-friendship-report/)
  assert.match(page,/\[1,2,3,4,5\]\.map/)
  assert.match(page,/guest_\$\{n\}_visit/)
  assert.match(helper,/present\+extra\.children\+extra\.churchMembers\+extra\.otherGroupMembers/)
  assert.match(helper,/filter\(field=>field\.value==='1'\)\.length/)
  assert.match(helper,/localStorage\.setItem\(key/)
  assert.match(helper,/name="attendance_count" value=\{total\}/)
  assert.match(helper,/name="first_time_guests" value=\{firstTime\}/)
  assert.match(helper,/Borrador del teléfono encontrado/)
})

test('Friendship Group review page is branch-only, read-only, and shows the actual parity controls',async()=>{
  const page=await read('src/app/groups/report-preview/page.tsx')
  assert.match(page,/process\.env\.VERCEL_GIT_COMMIT_REF!==previewBranch/)
  assert.match(page,/notFound\(\)/)
  assert.match(page,/ReportParityHelper/)
  assert.match(page,/\[1,2,3,4,5\]\.map/)
  assert.match(page,/Preview only — no data will be submitted/)
  assert.doesNotMatch(page,/action=\{/)
})

test('Friendship Group roster removal is manager-scoped, protects the primary leader, and never reports false success',async()=>{
  const [actions,page]=await Promise.all([
    read('src/app/groups/[groupId]/roster/actions.ts'),
    read('src/app/groups/[groupId]/roster/page.tsx')
  ])
  assert.match(actions,/export async function removeRosterMember/)
  assert.match(actions,/requireRosterManager\(groupId,lang\)/)
  assert.match(actions,/memberUserId===leaderId/)
  assert.match(actions,/Reassign the group’s primary leader before removing this person from the roster\./)
  assert.match(actions,/from\('group_memberships'\)\.delete\(\)\.eq\('group_id',groupId\)\.eq\('user_id',memberUserId\)\.select\('user_id'\)\.maybeSingle\(\)/)
  assert.match(actions,/if\(error\|\|!removed\)/)
  assert.match(actions,/Refresh the roster and try again\./)
  assert.match(actions,/Actualiza la lista e inténtalo otra vez\./)
  assert.match(page,/action=\{removeRosterMember\}/)
  assert.match(page,/Confirm removal/)
  assert.match(page,/church account, profile, and history stay intact/)
})
