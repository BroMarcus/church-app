import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const login=read('src/app/login/page.tsx')
const start=read('src/app/start/page.tsx')
const guide=read('src/lib/help-knowledge.ts')
const builder=read('src/app/church/launch/page.tsx')

test('account entry defaults safely to login and requires an intentional signup choice',()=>{
  assert.match(login,/const explicitSignin=params\.mode==='signin',explicitSignup=params\.mode==='signup'/)
  assert.match(login,/const mode=explicitSignup&&canCreate\?'signup':'signin'/)
  const loginChoice=login.indexOf("{t.signinTitle}</Link>")
  const createChoice=login.indexOf("{t.create}</Link>")
  assert.ok(loginChoice>=0&&createChoice>loginChoice,'Log in must be presented before Create account')
  assert.match(login,/Do not make another one\. Log in with the account you already have\./)
  assert.match(login,/No crees otra\. Inicia sesión con la cuenta que ya tienes\./)
})

test('common account-recovery failures expose recovery help without another navigation decision',()=>{
  assert.match(login,/open=\{Boolean\(statusError&&\['invalid_credentials','email_unconfirmed','email_failed','email_rate_limit'\]\.includes\(params\.error_code\?\?''\)\)\}/)
  assert.match(login,/Forgot password or never confirmed your email\?/)
  assert.match(login,/¿Olvidaste tu contraseña o nunca confirmaste tu correo\?/)
  assert.match(login,/Reset my password/)
  assert.match(login,/Send confirmation email again/)
})

test('first login explicitly tells members they can stop and go Home',()=>{
  assert.match(start,/title:"You're in\."/)
  assert.match(start,/You do not have to fill anything else out right now\./)
  assert.match(start,/title:'Ya entraste\.'/)
  assert.match(start,/No tienes que llenar nada más ahora\./)
  const homeAction=start.indexOf('<section className="card start-note">')
  const optional=start.indexOf('<details className="card start-how">')
  assert.ok(homeAction>=0&&optional>homeAction,'Go Home must appear before optional exploration')
  assert.doesNotMatch(start,/className="card start-account"/)
})

test('Church Builder exposes one next step before optional complexity',()=>{
  assert.match(builder,/title:'Set up one thing at a time\.'/)
  assert.match(builder,/title:'Configura una sola cosa a la vez\.'/)
  const nextCard=builder.indexOf('<section className="card launch-next">')
  const allSteps=builder.indexOf('<details className="card launch-optional"><summary>{t.allSteps}</summary>')
  const safety=builder.indexOf('<details className="card launch-optional"><summary>{t.safety}</summary>')
  assert.ok(nextCard>=0&&allSteps>nextCard&&safety>allSteps,'one next step must precede full checklist and safety details')
  assert.match(builder,/allSteps:'See all pilot setup steps'/)
  assert.match(builder,/allSteps:'Ver todos los pasos del piloto'/)
})

test('Kingdom Guide retains low-tech account and Fresh Setup answers in English and Spanish',()=>{
  for(const id of ['password','confirm-email','existing-account-join','duplicate-account','fresh-church-setup']){
    assert.match(guide,new RegExp(`id:'${id}'`))
  }
  assert.match(guide,/No\. Keep one Kingdom Network account\./)
  assert.match(guide,/No\. Conserva una sola cuenta de Kingdom Network\./)
  assert.match(guide,/review that draft before anyone publishes it/i)
  assert.match(guide,/revisa ese borrador antes de que alguien lo publique/i)
})
