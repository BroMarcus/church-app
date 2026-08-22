import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('simplified Home fails closed when the active church membership read fails',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/error:membershipError/)
  assert.match(source,/Home membership read failed/)
  assert.match(source,/We couldn't load your church connection\./)
  assert.match(source,/No pudimos cargar tu conexión con la iglesia\./)
  assert.match(source,/Nothing was changed\./)
  assert.match(source,/No se cambió nada\./)
  assert.match(source,/Check connection again/)
  assert.match(source,/Revisar conexión otra vez/)
})

test('simplified Home keeps unconnected users on their existing account and newest invite',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/Keep this account—do not create another one\./)
  assert.match(source,/newest invitation or join link/)
  assert.match(source,/Conserva esta cuenta; no crees otra\./)
  assert.match(source,/invitación o enlace más reciente/)
  assert.match(source,/I need help/)
  assert.match(source,/Necesito ayuda/)
})

test('simplified Home presents Kingdom Guide labels in Spanish',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/t\('Kingdom Guide','Guía Kingdom'\)/)
  assert.match(source,/Abrir Guía Kingdom/)
})

test('Home does not turn failed journey, group, or serving reads into a fake zero-state next step',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/milestonesError/)
  assert.match(source,/groupCountError/)
  assert.match(source,/teamCountError/)
  assert.match(source,/acceptedCountError/)
  assert.match(source,/newConvertCoursesError/)
  assert.match(source,/guidanceReadFailed=Boolean/)
  assert.match(source,/nextStep=guidanceReadFailed\?null:getNextStep/)
  assert.match(source,/We couldn't safely choose your next step\./)
  assert.match(source,/No pudimos elegir tu próximo paso con seguridad\./)
  assert.match(source,/Your progress was not changed\./)
})

test('Home does not tell a member to join a Friendship Group when membership count could not be read',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/groupMembershipKnown=!groupCountError/)
  assert.match(source,/!groupMembershipKnown\?t\('Friendship Groups','Grupos de Amistad'\)/)
  assert.match(source,/Open Groups to check your current connection\./)
  assert.match(source,/Abre Grupos para revisar tu conexión actual\./)
})

test('Home leadership summary fails closed instead of showing a false clear queue',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/leadershipReadFailed=false/)
  assert.match(source,/Home leadership summary read failed/)
  assert.match(source,/if\(!leadershipReadFailed\)leadershipNeeds=/)
  assert.match(source,/We couldn't check the leadership queue\./)
  assert.match(source,/No pudimos revisar la lista de liderazgo\./)
  assert.match(source,/Nothing was marked clear\./)
  assert.match(source,/No se marcó nada como resuelto\./)
})

test('Home learning resume failures degrade safely without changing progress guidance',async()=>{
  const source=await read('src/app/page.tsx')
  assert.match(source,/activeLearningError/)
  assert.match(source,/activeCourseError/)
  assert.match(source,/Home learning resume read failed/)
  assert.match(source,/Home learning resume failed/)
  assert.doesNotMatch(source,/console\.error\([^\n]*error\.message/)
})
