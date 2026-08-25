import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const routes=[
  ['Join Center','src/app/church/join-center/error.tsx','src/app/church/join-center/loading.tsx'],
  ['Invitations','src/app/church/invites/error.tsx','src/app/church/invites/loading.tsx'],
  ['Invite Person','src/app/church/invite-person/error.tsx','src/app/church/invite-person/loading.tsx'],
]

test('invitation admin routes have one-language bilingual recovery instead of mixed-language failures',()=>{
  for(const [name,errorFile,loadingFile] of routes){
    const error=read(errorFile),loading=read(loadingFile)
    for(const source of [error,loading]){
      assert.match(source,/URLSearchParams\(window\.location\.search\)/,`${name} should preserve explicit language`)
      assert.match(source,/requested==='es'|requested === 'es'/,`${name} should support Spanish`)
      assert.match(source,/document\.documentElement\.lang/,`${name} should respect document language`)
      assert.doesNotMatch(source,/ • .*Español| \/ /,`${name} should not stack both languages in one message`)
    }
    assert.match(error,/onClick=\{reset\}/,`${name} should offer retry`)
    assert.match(error,/mode=signin/,`${name} should offer explicit returning-user sign in`)
    assert.doesNotMatch(error,/error\.message|error\.stack|digest\}/,`${name} must not expose technical error details`)
    assert.match(loading,/aria-busy="true"/,`${name} should expose busy state`)
    assert.match(loading,/role="status"/,`${name} loading should be announced`)
    assert.match(loading,/aria-live="polite"/,`${name} loading should be polite`)
  }
})

test('invitation recovery copy prevents unsafe assumptions, duplicate work, and false certainty',()=>{
  const joinError=read('src/app/church/join-center/error.tsx')
  const invitesError=read('src/app/church/invites/error.tsx')
  const personError=read('src/app/church/invite-person/error.tsx')
  assert.match(joinError,/Do not assume signup is open or paused/)
  assert.match(joinError,/No asumas que el registro está abierto o pausado/)
  assert.match(invitesError,/could not verify whether the last invitation action finished/i)
  assert.match(invitesError,/No pudimos confirmar si terminó la última acción de invitación/)
  assert.match(invitesError,/Refresh and review the invitation list before creating, copying, or revoking anything again/)
  assert.match(personError,/could not verify whether the last invitation action finished/i)
  assert.match(personError,/Review existing invitations before creating another one/)
  assert.match(personError,/Revisa las invitaciones existentes antes de crear otra/)
})
