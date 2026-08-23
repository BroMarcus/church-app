import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const page=read('src/app/start/page.tsx')
const actions=read('src/app/start/actions.ts')
const joinActions=read('src/app/join/[slug]/actions.ts')
const submit=read('src/app/start/start-submit-button.tsx')

test('Start Here does not echo arbitrary query-string error or message text',()=>{
  assert.doesNotMatch(page,/params\.error\b/)
  assert.doesNotMatch(page,/params\.message\b/)
  assert.match(page,/error_code\?:string/)
  assert.match(page,/message_code\?:string/)
  assert.match(page,/statusCopy/)
  assert.match(page,/messageCopy/)
  assert.match(page,/onboarding_save_failed/)
})

test('Start Here distinguishes temporary auth and data-read failures from real empty membership state',()=>{
  assert.match(page,/error:authError/)
  assert.match(page,/if\(authError\)return recovery/)
  assert.match(page,/profileResult\.error\|\|membershipResult\.error/)
  assert.match(page,/if\(!membership\?\.church_id\)redirect/)
})

test('Start Here failure recovery is bilingual and keeps diagnostics bounded',()=>{
  assert.match(page,/We could not safely load Start Here/)
  assert.match(page,/No pudimos cargar Empieza Aquí de forma segura/)
  assert.match(page,/const boundedCode=\(value:unknown\)=>String\(value\|\|'unknown'\)\.slice\(0,80\)/)
  assert.match(page,/Try Start Here again/)
  assert.match(page,/Intentar Empieza Aquí otra vez/)
})

test('onboarding completion uses fixed status codes and does not put provider text in the URL',()=>{
  assert.match(actions,/error_code=onboarding_save_failed/)
  assert.match(actions,/error_code=connection_unavailable/)
  assert.doesNotMatch(actions,/encodeURIComponent\(message\)/)
  assert.match(actions,/console\.error\('start onboarding save failed',\{code:boundedCode\(error\.code\)\}\)/)
})

test('existing-account church join gets a fixed bilingual success confirmation on Start Here',()=>{
  assert.match(joinActions,/message_code=\$\{row\?\.already_member\?'already_joined':'joined_existing'\}/)
  assert.match(page,/joined_existing:'You are connected to this church with your existing Kingdom Network account/)
  assert.match(page,/already_joined:'You are already connected to this church/)
  assert.match(page,/joined_existing:'Ya estás conectado a esta iglesia con tu cuenta existente de Kingdom Network/)
  assert.match(page,/already_joined:'Ya estabas conectado a esta iglesia/)
  assert.match(page,/const statusMessage=\(messageCopy\[lang\]/)
  assert.match(page,/notice success/)
  assert.match(page,/aria-live="polite"/)
})

test('Spanish Start Here presents common church roles in Spanish',()=>{
  assert.match(page,/church_admin:'Administrador de iglesia'/)
  assert.match(page,/member:'Miembro'/)
  assert.match(page,/leader:'Líder'/)
  assert.match(page,/group_leader:'Líder de Grupo de Amistad'/)
  assert.match(page,/assistant_leader:'Líder asistente'/)
  assert.match(page,/ministry_leader:'Líder de ministerio'/)
  assert.match(page,/finance_admin:'Administrador de finanzas'/)
  assert.match(page,/roleLabel\(membership\.role,lang\)/)
})

test('first login puts one simple Home action before optional setup and hides extra learning behind details',()=>{
  assert.match(page,/quickTitle:'That is all you need for now\.'/)
  assert.match(page,/quickTitle:'Eso es todo lo que necesitas por ahora\.'/)
  assert.match(page,/finish:'Take me Home'/)
  assert.match(page,/finish:'Ir a Inicio'/)
  const quickIndex=page.indexOf('className="card start-note"')
  const optionalIndex=page.indexOf('<details className="card start-how">')
  assert.ok(quickIndex>=0&&optionalIndex>quickIndex,'primary Home completion action should appear before optional detail sections')
  assert.match(page,/OPTIONAL: SET UP MORE/)
  assert.match(page,/OPCIONAL: CONFIGURAR MÁS/)
  assert.match(page,/LEARN THE APP LATER/)
  assert.match(page,/APRENDE LA APLICACIÓN DESPUÉS/)
})

test('optional first-login setup stays focused and avoids leader/admin feature overload',()=>{
  const optionalLine=page.split('\n').find((line)=>line.trim().startsWith('const optional='))||''
  for(const path of ['/profile','/journey','/groups']) assert.match(optionalLine,new RegExp(`'${path.replaceAll('/','\\/')}'`))
  for(const path of ['/finance','/outreach','/teams','/network','/fundraising','/church/member-control']) assert.doesNotMatch(optionalLine,new RegExp(`'${path.replaceAll('/','\\/')}'`))
})

test('collapsed app tour stays limited to five core member-safe destinations',()=>{
  const tourLine=page.split('\n').find((line)=>line.trim().startsWith('const tour='))||''
  for(const path of ['/','/learning','/groups','/guide','/prayer']) assert.match(tourLine,new RegExp(`'${path.replaceAll('/','\\/')}'`))
  for(const path of ['/calendar','/documents','/updates','/notifications','/outreach','/teams','/network','/fundraising']) assert.doesNotMatch(tourLine,new RegExp(`'${path.replaceAll('/','\\/')}'`))
  assert.match(page,/You can come back to Start Here anytime/)
  assert.match(page,/Puedes volver a Empieza Aquí cuando quieras/)
})

test('finish onboarding blocks repeat taps and announces bilingual pending guidance',()=>{
  assert.match(page,/StartSubmitButton label=\{t\.finish\} pendingLabel=\{t\.saving\}/)
  assert.match(page,/Saving — keep this page open/)
  assert.match(page,/Guardando — mantén esta página abierta/)
  assert.match(submit,/useFormStatus/)
  assert.match(submit,/disabled=\{pending\}/)
  assert.match(submit,/aria-disabled=\{pending\}/)
  assert.match(submit,/aria-busy=\{pending\}/)
  assert.match(submit,/aria-live="polite"/)
  assert.match(submit,/pending\?pendingLabel:label/)
})
