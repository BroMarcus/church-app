import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('member invitation actions never expose backend messages and use fixed status codes',async()=>{
  const source=await read('src/app/church/invites/actions.ts')
  assert.doesNotMatch(source,/encodeURIComponent\(.*error\.message/)
  assert.doesNotMatch(source,/:error\.message/)
  assert.match(source,/church invite creation failed/)
  assert.match(source,/error\.code==='23505'\?'duplicate_open':'create_failed'/)
  assert.match(source,/redirect\(path\(lang,'revoke_failed'\)\)/)
})

test('invite revoke proves an open invite row changed before reporting success',async()=>{
  const source=await read('src/app/church/invites/actions.ts')
  assert.match(source,/\.is\('redeemed_at',null\)\.is\('revoked_at',null\)\.select\('id'\)\.maybeSingle\(\)/)
  assert.match(source,/if\(!data\?\.id\)redirect\(path\(lang,'invite_not_open'\)\)/)
})

test('member invitations fail closed on list errors and prevent duplicate submit taps',async()=>{
  const page=await read('src/app/church/invites/page.tsx')
  const pending=await read('src/app/church/invites/pending-submit.tsx')
  assert.match(page,/if\(invitesError\)console\.error\('member invitations list failed'/)
  assert.match(page,/Nothing was changed\. Refresh this page before creating or revoking an invitation\./)
  assert.match(page,/No se cambió nada\. Actualiza esta página antes de crear o revocar una invitación\./)
  assert.match(page,/InvitePendingSubmit/)
  assert.match(pending,/disabled=\{pending\}/)
  assert.match(pending,/aria-busy=\{pending\}/)
})

test('invitation admin screens teach newest-link and existing-account behavior bilingually',async()=>{
  const invites=await read('src/app/church/invites/page.tsx')
  const known=await read('src/app/church/invite-person/page.tsx')
  assert.match(invites,/same account—not create another one/)
  assert.match(invites,/misma cuenta; no debe crear otra/)
  assert.match(invites,/Send only the newest open invitation/)
  assert.match(known,/send only the newest open link/)
  assert.match(known,/envía solamente el enlace abierto más reciente/)
})

test('known-person invitation uses fixed member-safe failure states',async()=>{
  const actions=await read('src/app/church/invite-person/actions.ts')
  const page=await read('src/app/church/invite-person/page.tsx')
  assert.doesNotMatch(actions,/error\.message/)
  assert.match(actions,/createKnownPersonInvite failed.*code:error\.code/s)
  assert.match(actions,/redirect\(path\(lang,'create_failed'\)\)/)
  assert.doesNotMatch(page,/params\.error/)
})

test('Join Center does not misrepresent a failed status read as paused or zero',async()=>{
  const source=await read('src/app/church/join-center/page.tsx')
  assert.match(source,/if\(statusError\)console\.error\('join center public signup status failed'/)
  assert.match(source,/Do not assume signup is paused or open\. Nothing was changed\./)
  assert.match(source,/No asumas que el registro está pausado o abierto\. No se cambió nada\./)
  assert.match(source,/\{!statusError&&<div/)
})

test('Join Center QR and preview preserve selected Spanish language',async()=>{
  const source=await read('src/app/church/join-center/page.tsx')
  assert.match(source,/activeJoinUrl=es\?joinUrlEs:joinUrl/)
  assert.match(source,/JoinQr url=\{activeJoinUrl\}/)
  assert.match(source,/href=\{l\(`\/join\/\$\{slug\}`\)\}/)
})
