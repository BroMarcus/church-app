import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const actions=read('src/app/start/actions.ts')

test('Start Here never reports onboarding complete from an incomplete Auth update result',()=>{
  assert.match(actions,/const updatedUser=updateResult\.data\?\.user/)
  assert.match(actions,/!updatedUser\|\|updatedUser\.id!==user\.id/)
  assert.match(actions,/updatedUser\.user_metadata\?\.onboarding_completed!==true/)
  assert.match(actions,/updatedUser\.user_metadata\?\.preferred_language!==lang/)
  assert.match(actions,/start onboarding save returned incomplete state/)
  assert.match(actions,/onboarding_state_unconfirmed/)
  assert.match(actions,/error_code=onboarding_save_failed/)
})

test('Start Here only redirects Home after the saved user and language are positively confirmed',()=>{
  const confirmIndex=actions.indexOf("updatedUser.user_metadata?.preferred_language!==lang")
  const homeIndex=actions.lastIndexOf("redirect(`/${lang==='es'?'?lang=es':''}`)")
  assert.ok(confirmIndex>=0,'saved onboarding state must be explicitly verified')
  assert.ok(homeIndex>confirmIndex,'Home redirect must happen only after save certainty checks')
})
