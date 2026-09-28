import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const privacyPage=read('src/app/account/privacy/page.tsx')
const privacyActions=read('src/app/account/privacy/actions.ts')
const notificationPage=read('src/app/account/notifications/page.tsx')
const notificationActions=read('src/app/account/notifications/actions.ts')

for(const [label,page,actions] of [
  ['Privacy',privacyPage,privacyActions],
  ['Notification preferences',notificationPage,notificationActions],
]){
  test(`${label} distinguishes Auth uncertainty from a real signed-out state`,()=>{
    assert.match(page,/error:claimsError/)
    assert.match(page,/if\(claimsError\)return recovery/)
    assert.match(page,/if\(!userId\)redirect/)
    assert.match(page,/mode=signin/)
    assert.match(actions,/error:claimsError/)
    assert.match(actions,/if\(claimsError\)/)
    assert.match(actions,/status=auth_unavailable/)
    assert.match(actions,/if\(!userId\)redirect/)
  })

  test(`${label} catches thrown client and claims failures before rendering account state`,()=>{
    assert.match(page,/try\{supabase=await createClient\(\)\}catch\(error\)\{return recovery\(`client:/)
    assert.match(page,/try\{claimsResult=await supabase\.auth\.getClaims\(\)\}catch\(error\)\{return recovery\(`claims:/)
    assert.match(page,/const thrownCode=/)
  })

  test(`${label} keeps backend diagnostics bounded and out of user-facing text`,()=>{
    assert.match(page,/\.slice\(0,80\)/)
    assert.match(actions,/\.slice\(0,80\)/)
    assert.doesNotMatch(page,/claimsError\.message/)
    assert.doesNotMatch(actions,/claimsError\.message/)
  })
}

test('Privacy read failures and thrown reads share one bilingual fail-closed recovery state',()=>{
  assert.match(privacyPage,/membershipResult\.error\)return recovery/)
  assert.match(privacyPage,/profileResult\.error\)return recovery/)
  assert.match(privacyPage,/try\{membershipResult=await supabase\.from\('church_memberships'\)/)
  assert.match(privacyPage,/catch\(error\)\{return recovery\(`membership:/)
  assert.match(privacyPage,/try\{profileResult=await supabase\.from\('profiles'\)/)
  assert.match(privacyPage,/catch\(error\)\{return recovery\(`profile:/)
  assert.match(privacyPage,/We could not load your privacy settings/)
  assert.match(privacyPage,/No pudimos cargar tu configuración de privacidad/)
})

test('Notification preference read failures cannot look like legitimate defaults',()=>{
  assert.match(notificationPage,/prefsResult\.error\)return recovery/)
  assert.match(notificationPage,/try\{prefsResult=await supabase\.from\('notification_preferences'\)/)
  assert.match(notificationPage,/catch\(error\)\{return recovery\(`preferences:/)
  assert.match(notificationPage,/We could not load your notification preferences/)
  assert.match(notificationPage,/No pudimos cargar tus preferencias de notificación/)
  assert.match(notificationPage,/const prefs=prefsResult\.data,on=/)
})
