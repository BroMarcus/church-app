import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('first-login completion fails closed until the auth update is confirmed', async () => {
  const actions = await read('src/app/start/actions.ts')

  assert.match(actions, /try\{updateResult=await supabase\.auth\.updateUser/)
  assert.match(actions, /updatedUser\.user_metadata\?\.onboarding_completed!==true/)
  assert.match(actions, /updatedUser\.user_metadata\?\.preferred_language!==selectedLang/)
  assert.match(actions, /Nothing was removed/)
  assert.match(actions, /No se borró nada/)
})

test('password reset does not report success until a user is returned and local sign-out is verified', async () => {
  const reset = await read('src/app/auth/update-password/page.tsx')

  assert.match(reset, /if\(!data\?\.user\)/)
  assert.match(reset, /finishPostResetSignOut/)
  assert.match(reset, /verification\.data\.session/)
  assert.match(reset, /signOutIncomplete/)
  assert.match(reset, /Open Account Security/)
  assert.match(reset, /Abrir Seguridad de la Cuenta/)
  assert.match(reset, /maxLength=\{128\}/)
  assert.match(reset, /ONE KINGDOM/)
})

test('password reset preserves only bounded safe church-join and invite return context', async () => {
  const reset = await read('src/app/auth/update-password/page.tsx')

  assert.match(reset, /INVITE_ID_PATTERN/)
  assert.match(reset, /value\.length>500/)
  assert.match(reset, /parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(reset, /invitePart/)
  assert.match(reset, /nextPart/)
})
