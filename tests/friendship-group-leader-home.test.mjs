import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Friendship Group portal never renders arbitrary query-string errors',async()=>{
  const [page,client,attendance,guidelines]=await Promise.all([
    read('src/app/groups/[groupId]/portal/page.tsx'),
    read('src/app/groups/[groupId]/portal/portal-client.tsx'),
    read('src/app/groups/[groupId]/portal/attendance-actions.ts'),
    read('src/app/groups/[groupId]/portal/guidelines-actions.ts')
  ])
  assert.match(page,/validErrorCodes/)
  assert.match(page,/query\.error_code/)
  assert.doesNotMatch(page,/query\.error\b/)
  assert.match(client,/errors\[lang\]\[portalErrorCode\]/)
  assert.doesNotMatch(client,/portalError:string/)
  assert.match(attendance,/error_code=attendance_/)
  assert.doesNotMatch(attendance,/encodeURIComponent\('Leader or assistant/)
  assert.match(guidelines,/error_code=guidelines_/)
  assert.doesNotMatch(guidelines,/encodeURIComponent\('Group leader access/)
})

test('Friendship Group leader home supports selected English and Spanish',async()=>{
  const [page,client]=await Promise.all([
    read('src/app/groups/[groupId]/portal/page.tsx'),
    read('src/app/groups/[groupId]/portal/portal-client.tsx')
  ])
  assert.match(page,/query\.lang==='es'/)
  assert.match(client,/Portal del Grupo de Amistad/)
  assert.match(client,/Asistencia semanal/)
  assert.match(client,/REPORTE SEMANAL/)
  assert.match(client,/Peticiones activas/)
  assert.match(client,/name="lang" value=\{lang\}/)
})

test('Friendship Group overview summarizes the leader week from existing records',async()=>{
  const [page,client]=await Promise.all([
    read('src/app/groups/[groupId]/portal/page.tsx'),
    read('src/app/groups/[groupId]/portal/portal-client.tsx')
  ])
  assert.match(page,/reportSubmitted:reports\.some/)
  assert.match(page,/nextLesson/)
  assert.match(page,/openPrayerCount/)
  assert.match(page,/weeklyRoleCount/)
  assert.match(client,/leaderSummary\.reportSubmitted/)
  assert.match(client,/leaderSummary\.nextLesson/)
  assert.match(client,/leaderSummary\.openPrayerCount/)
  assert.match(client,/leaderSummary\.weeklyRoleCount/)
})
