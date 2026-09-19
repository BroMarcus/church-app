import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const station=read('src/app/church/readiness/phone-proof/page.tsx')
const proof=read('src/app/church/readiness/phone-proof/private-invite/page.tsx')

test('Phone Proof exposes a dedicated bilingual private-invite recovery proof path',()=>{
  assert.match(station,/privateInvite:'Open private-invite recovery proof'/)
  assert.match(station,/privateInvite:'Abrir prueba de recuperación de invitación privada'/)
  assert.match(station,/\/church\/readiness\/phone-proof\/private-invite\?lang=\$\{lang\}/)
})

test('private-invite proof requires the newest high-risk invitation paths in English and Spanish',()=>{
  for(const expected of [
    'NEW account → private invite → confirm newest email → Start Here',
    'EXISTING account → private invite → Sign In',
    'forgot password → reset → return',
    'resend confirmation → confirm → return',
    'Old / revoked / malformed private invitation',
    'Redemption failure → verified browser cleanup',
    'Cuenta NUEVA → invitación privada',
    'Cuenta EXISTENTE → invitación privada',
    'olvidé contraseña → restablecer → regresar',
    'reenviar confirmación → confirmar → regresar',
    'Invitación privada vieja / revocada / dañada',
    'Falla de redención → limpieza verificada del navegador',
  ]) assert.match(proof,new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
})

test('private-invite proof explicitly protects same-account, post-verification redemption and cooldown behavior',()=>{
  assert.match(proof,/Never create a second account for an existing user/)
  assert.match(proof,/Nunca crees una segunda cuenta para un usuario existente/)
  assert.match(proof,/applied only after verified authentication/)
  assert.match(proof,/solamente después de autenticación verificada/)
  assert.match(proof,/60-second cooldown appears only for that successful send/)
  assert.match(proof,/espera de 60 segundos aparezca solamente por ese envío exitoso/)
  assert.match(proof,/does not manufacture another cooldown without another email send/)
  assert.match(proof,/no cree otra espera sin enviar otro correo/)
})

test('private-invite proof fails closed on bad links and uncertain redemption cleanup',()=>{
  assert.match(proof,/Create Account stays unavailable for malformed or unverifiable private-invite context/)
  assert.match(proof,/Crear Cuenta permanezca deshabilitado con contexto de invitación malformado o no verificable/)
  assert.match(proof,/browser cleanup is verified before sign-out is claimed/)
  assert.match(proof,/se verifica la limpieza antes de afirmar cierre de sesión/)
  assert.match(proof,/Account Security rather than claiming a clean sign-out/)
  assert.match(proof,/Seguridad de Cuenta en lugar de afirmar que cerró sesión/)
})

test('phone proof accepts only an exact build identity and never manufactures one by truncation',()=>{
  for(const source of [station,proof]){
    assert.match(source,/\^\[0-9a-f\]\{40\}\$/i)
    assert.match(source,/return 'unverified'/)
    assert.match(source,/VERCEL_GIT_COMMIT_SHA/)
    assert.match(source,/NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA/)
    assert.doesNotMatch(source,/slice\(0,40\)/)
    assert.match(source,/server\.toLowerCase\(\)!==browser\.toLowerCase\(\)/)
  }
})

test('private-invite proof is admin-only, exact-build aware, read-only as a proof page, and does not expose raw errors',()=>{
  assert.match(proof,/\['pastor','church_admin'\]\.includes\(membership\.role\)/)
  assert.match(proof,/\^\[0-9a-f\]\{40\}\$/i)
  assert.match(proof,/Do not record PASS evidence/)
  assert.match(proof,/No registres PASÓ/)
  assert.match(proof,/boundedCode/)
  assert.doesNotMatch(proof,/error\.message|error\.stack/)
  assert.doesNotMatch(proof,/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/)
})