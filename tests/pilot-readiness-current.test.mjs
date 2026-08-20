import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('failed auth email links return to sign in',async()=>{
  const source=await read('src/app/auth/callback/route.ts')
  assert.match(source,/\/login\?lang=\$\{lang\}&mode=signin&error=/)
})

test('password update blocks duplicate submissions and returns to sign in',async()=>{
  const source=await read('src/app/auth/update-password/page.tsx')
  assert.match(source,/if\(busy\)return/)
  assert.match(source,/disabled=\{busy\}/)
  assert.match(source,/aria-busy=\{busy\}/)
  assert.match(source,/mode=signin/)
})

test('password recovery preserves a pending church invitation',async()=>{
  const actions=await read('src/app/login/actions.ts')
  const updatePassword=await read('src/app/auth/update-password/page.tsx')
  assert.match(actions,/recoveryUrl=\(lang:'en'\|'es',inviteId=''/)
  assert.match(actions,/redirectTo:recoveryUrl\(lang,inviteId\)/)
  assert.match(updatePassword,/setInviteId\(nextInvite\)/)
  assert.match(updatePassword,/mode=signin\$\{invitePart\}/)
})

test('confirmation resend preserves only an invitation still awaiting an existing account',async()=>{
  const actions=await read('src/app/login/actions.ts')
  assert.match(actions,/let confirmationNext=startPath/)
  assert.match(actions,/validate_invite_email.*p_invite_id:inviteId,p_email:email/)
  assert.match(actions,/if\(validInvite\)/)
  assert.match(actions,/Email confirmed\. Sign in with this email to connect the invitation to your account/)
  assert.match(actions,/Correo confirmado\. Inicia sesión con este correo para conectar la invitación a tu cuenta/)
  assert.match(actions,/callbackUrl\(lang,'signup',confirmationNext\)/)
})

test('existing accounts can securely redeem a retained church invitation after sign in',async()=>{
  const actions=await read('src/app/login/actions.ts')
  const loginPage=await read('src/app/login/page.tsx')
  const inviteAdmin=await read('src/app/church/invites/page.tsx')
  const migration=await read('supabase/migrations/20260820053000_existing_account_invite_redemption.sql')

  assert.match(loginPage,/name="invite_id" value=\{params\.invite/)
  assert.match(loginPage,/connect this church to your existing account automatically/)
  assert.match(loginPage,/Conectaremos esta iglesia a tu cuenta existente automáticamente/)
  assert.match(inviteAdmin,/someone who already has a Kingdom Network account can simply sign in/)
  assert.match(inviteAdmin,/si ya tiene una cuenta de Kingdom Network, solo necesita iniciar sesión/)
  assert.match(actions,/redeem_invite_for_current_user/)
  assert.match(actions,/existing account invite redemption failed/)
  assert.match(actions,/invitePart\+'&mode=signin&message='/)

  assert.match(migration,/v_user_id uuid := auth\.uid\(\)/)
  assert.match(migration,/lower\(trim\(v_invite\.email\)\)<>v_email/)
  assert.match(migration,/v_invite\.revoked_at is not null/)
  assert.match(migration,/v_invite\.redeemed_at is not null/)
  assert.match(migration,/v_invite\.expires_at<=now\(\)/)
  assert.match(migration,/v_invite\.role not in \('member','group_leader','ministry_leader','minister'\)/)
  assert.match(migration,/already has a church membership record/)
  assert.match(migration,/'private_invite',now\(\),v_invite\.created_by/)
  assert.match(migration,/revoke all on function public\.redeem_invite_for_current_user\(uuid\) from anon/)
  assert.match(migration,/grant execute on function public\.redeem_invite_for_current_user\(uuid\) to authenticated/)
})

test('explicit invitation relationship source is not overwritten by old auth metadata',async()=>{
  const migration=await read('supabase/migrations/20260820053000_existing_account_invite_redemption.sql')
  assert.match(migration,/if new\.relationship_source is distinct from 'legacy_backfill' then/)
  assert.match(migration,/return new;/)
})

test('church-specific signup hides raw auth failures',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/friendlySignupError/)
  assert.match(source,/console\.error\('joinChurch signup failed'/)
  assert.doesNotMatch(source,/fail\(error\.message,error\.message\)/)
})

test('existing-account church signup guidance does not imply automatic membership',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/church admin can add that account without creating another one/)
  assert.match(source,/un administrador puede añadir tu cuenta sin crear otra/)
  assert.match(source,/mode=signin&message=/)
})

test('Kingdom Guide resource search is accent tolerant and language preserving',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/normalize\('NFD'\)/)
  assert.match(source,/queryTokens=normalizedQuery\.split/)
  assert.match(source,/__matchedTokens===queryTokens\.length/)
  assert.match(source,/withLang\(`\/resources\?q=/)
})

test('pilot readiness hides raw backend errors and exposes one next action',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.match(source,/console\.error\('church_pilot_readiness failed'/)
  assert.doesNotMatch(source,/\{t\.load\} \{error\.message\}/)
  assert.match(source,/const nextAction=rows\.find/)
  assert.match(source,/statusLabel\(r\.check_status,lang\)/)
})
