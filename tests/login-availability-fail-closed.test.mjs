import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const page=fs.readFileSync(path.join(process.cwd(),'src/app/login/page.tsx'),'utf8')
const actions=fs.readFileSync(path.join(process.cwd(),'src/app/login/actions.ts'),'utf8')

test('login page distinguishes availability failures from real closed or invalid states',()=>{
  assert.match(page,/const inviteDecisionInvalid=Boolean\(inviteParam\)&&!inviteCheckFailed&&\(!invite\|\|typeof invite\.valid!==['"]boolean['"]\)/)
  assert.match(page,/invalid_invite_preview/)
  assert.match(page,/publicStatusInvalid=!publicStatusError&&\(!publicStatus\|\|typeof publicStatus\.open!==['"]boolean['"]\)/)
  assert.match(page,/invalid_signup_status/)
  assert.match(page,/publicStatusFailed=Boolean\(publicStatusError\)\|\|publicStatusInvalid/)
  assert.match(page,/const validInvite=!inviteMalformed&&!inviteCheckFailed&&!inviteDecisionInvalid&&invite\?\.valid===true/)
  assert.match(page,/const availabilityFailed=inviteCheckFailed\|\|inviteDecisionInvalid\|\|\(!explicitSignin&&!validInvite&&publicStatusFailed\)/)
  assert.match(page,/const invalidInviteKnown=Boolean\(params\.invite\)&&!validInvite&&!inviteCheckFailed&&!inviteDecisionInvalid/)
  assert.match(page,/!explicitSignin&&!params\.invite&&!publicOpen&&!publicStatusFailed/)
  assert.doesNotMatch(page,/Boolean\(invite\?\.valid\)/)
})

test('explicit returning-user sign in does not depend on public signup availability',()=>{
  assert.match(page,/const explicitSignin=params\.mode===['"]signin['"]/)
  assert.match(page,/if\(!explicitSignin\)\{[\s\S]*get_public_signup_status/)
  assert.match(page,/const canCreate=!explicitSignin&&!availabilityFailed&&\(validInvite\|\|publicOpen\)/)
  assert.match(page,/const mode=explicitSignin\|\|!canCreate\?['"]signin['"]:['"]signup['"]/)
  assert.match(page,/!explicitSignin&&!params\.invite&&!publicOpen&&!publicStatusFailed/)
  assert.ok(page.includes("invalidSignin:'That invitation is no longer available. Sign in with your same account."))
  assert.ok(page.includes("invalidSignin:'Esa invitación ya no está disponible. Inicia sesión con tu misma cuenta."))
  assert.match(page,/invalidInviteKnown&&<div className="notice">\{explicitSignin\?t\.invalidSignin:\(publicOpen\?t\.invalidOpen:t\.invalidClosed\)\}<\/div>/)
})

test('known unusable invitations never claim signup is open when public signup is closed',()=>{
  assert.ok(page.includes("invalidOpen:'That old invitation is no longer available, but public signup is open below.'"))
  assert.ok(page.includes("invalidClosed:'That invitation is no longer available, and public signup is closed right now."))
  assert.ok(page.includes("invalidOpen:'Esa invitación anterior ya no está disponible, pero el registro público está abierto abajo.'"))
  assert.ok(page.includes("invalidClosed:'Esa invitación ya no está disponible y el registro público está cerrado en este momento."))
  assert.match(page,/explicitSignin\?t\.invalidSignin:\(publicOpen\?t\.invalidOpen:t\.invalidClosed\)/)
  assert.match(page,/gridTemplateColumns:canCreate\?'1fr 1fr':'1fr'/)
  assert.match(page,/\{canCreate&&<Link className=\{mode==='signup'\?'btn':'ghost'\} href=\{query\('signup'\)\}>\{t\.create\}<\/Link>\}/)
})

test('sign in branches on stable Auth codes and keeps uncertain failures neutral',()=>{
  assert.match(actions,/const authCode=boundedCode\(error\.code\)/)
  assert.match(actions,/if\(authCode==='invalid_credentials'\)code='invalid_credentials'/)
  assert.match(actions,/else if\(authCode==='email_not_confirmed'\)code='email_unconfirmed'/)
  assert.match(actions,/else console\.error\('login unavailable',\{code:authCode,status:/)
  assert.doesNotMatch(actions,/error\.message\.toLowerCase\(\)/)
  assert.ok(page.includes('We could not safely complete sign in right now. Your account may be fine.'))
  assert.ok(page.includes('No pudimos completar el inicio de sesión de forma segura en este momento. Tu cuenta puede estar bien.'))
})

test('signup action does not mislabel backend read failures or indeterminate results as closed signup or invalid invitation',()=>{
  assert.match(actions,/if\(inviteError\)[\s\S]*fail\('invite_check_unavailable'\)/)
  assert.match(actions,/if\(typeof valid!==['"]boolean['"]\)[\s\S]*empty_invite_validation[\s\S]*fail\('invite_check_unavailable'\)/)
  assert.match(actions,/if\(!valid\)fail\('invite_invalid'\)/)
  assert.match(actions,/if\(statusError\)[\s\S]*fail\('signup_status_unavailable'\)/)
  assert.match(actions,/if\(!row\|\|typeof row\.open!==['"]boolean['"]\)[\s\S]*invalid_signup_status[\s\S]*fail\('signup_status_unavailable'\)/)
  assert.match(actions,/if\(!row\.open\)fail\('signup_closed'\)/)
})

test('availability recovery guidance is bilingual and discourages duplicate accounts',()=>{
  assert.ok(page.includes('We could not safely check account creation or invitation status right now.'))
  assert.ok(page.includes('No pudimos verificar de forma segura el registro o la invitación en este momento.'))
  assert.ok(page.includes('Do not create a second account.'))
  assert.ok(page.includes('No crees otra cuenta.'))
})

test('availability diagnostics use bounded sanitized error codes instead of provider messages',()=>{
  assert.match(page,/boundedCode\(error\.code\)/)
  assert.match(page,/boundedCode\(publicStatusError\.code\)/)
  assert.match(page,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,48\)/)
  assert.match(actions,/boundedCode\(inviteError\.code\)/)
  assert.match(actions,/boundedCode\(statusError\.code\)/)
  assert.match(actions,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,48\)/)
  assert.doesNotMatch(actions,/invite validation unavailable'\s*,\s*\{message:/)
  assert.doesNotMatch(actions,/signup status unavailable'\s*,\s*\{message:/)
})

test('legacy first-login inference does not treat failed reads as proof of no activity',()=>{
  assert.match(actions,/const \[profileResult,groupsResult,enrollmentsResult\]=await Promise\.all/)
  assert.match(actions,/const inferenceError=profileResult\.error\|\|groupsResult\.error\|\|enrollmentsResult\.error/)
  assert.match(actions,/if\(inferenceError\)[\s\S]*legacy onboarding inference unavailable/)
  assert.match(actions,/\}else\{[\s\S]*const hasActivity=\(groupsResult\.count\?\?0\)>0\|\|\(enrollmentsResult\.count\?\?0\)>0/)
  assert.match(actions,/profile:profileResult\.error\?boundedCode\(profileResult\.error\.code\):'ok'/)
})

test('login page only carries rooted local church join paths through auth recovery',()=>{
  assert.match(page,/function safeJoinNext\(value:string\|undefined\)/)
  assert.match(page,/!value\.startsWith\('\/'\)\|\|value\.startsWith\('\/\/'\)/)
  assert.match(page,/const parsed=new URL\(value,base\)/)
  assert.match(page,/parsed\.origin!==base\|\|!parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(page,/const lang=params\.lang===['"]es['"]\?['"]es['"]:['"]en['"],t=copy\[lang\],joinNext=safeJoinNext\(params\.next\)/)
  assert.doesNotMatch(page,/params\.next\?\.startsWith\('\/join\/'\).*includes\('\.\.'\)/)
})
