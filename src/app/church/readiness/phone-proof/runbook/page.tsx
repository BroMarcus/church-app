import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import '../phone-proof.css'

type Lang='en'|'es'
type Flow={title:string;account:string;steps:string[];success:string;failure:string}

const copy={
  en:{
    pill:'PHONE TEST RUNBOOK',title:'Run the pilot test safely',body:'Use this page while testing on a real phone. It keeps the test simple, protects real church data, and makes failures reproducible.',
    back:'← Phone Proof',readiness:'Pilot Readiness',home:'Home',english:'English',spanish:'Español',build:'Build under test',
    before:'Before you start',beforeItems:['Use test accounts only. Never experiment with a real member account.','Use one exact preview/site for the full run. Do not mix evidence from different previews.','Have access to the test email inbox before starting signup or password reset.','Keep the Phone Proof checklist open in another tab so evidence is recorded immediately.','For Spanish proof, start the flow in Español and keep it in Spanish through the expected finish.'],
    accounts:'Test accounts to prepare',accountItems:['NEW: an email address that has never had a Kingdom Network account.','EXISTING: an existing test account that is not connected to the target church.','ADMIN: a pastor/church-admin test account for invitations and Fresh Church Setup.'],
    order:'Recommended test order',successLabel:'PASS means',failureLabel:'If it fails',stopTitle:'Stop and report instead of retrying repeatedly when',stopItems:['a page shows raw database/provider/technical text','signup, join, reset, approval, or upload appears to submit more than once','an existing-account join asks you to create another account','Spanish unexpectedly drops into an English-only dead end','Fresh Church Setup publishes a course instead of leaving an unpublished draft'],
    capture:'Capture this failure evidence',captureItems:['Flow name and exact step number that failed.','Phone/browser, test-account type, date, exact site/preview, and the deployed Git build shown on Phone Proof.','A short description of what you tapped and what appeared next.','A screenshot only if it does not expose a password, email verification token, password-reset token/link, invitation token, or private member/church information.'],
    never:'Never paste into the Control Room',neverItems:['passwords or one-time codes','full confirmation or password-reset links','invitation/join tokens or secret query strings','real member personal information','private prayer, pastoral-care, finance, or meeting-address data'],
    finish:'When the run is finished',finishBody:'Return to Phone Proof and record PASS or FAIL immediately. A green automated build is not a substitute for this real-phone evidence.',openChecklist:'Open Phone Proof checklist'
  },
  es:{
    pill:'GUÍA DE PRUEBA EN TELÉFONO',title:'Prueba el piloto de forma segura',body:'Usa esta página mientras pruebas en un teléfono real. Mantiene la prueba sencilla, protege los datos reales de la iglesia y hace que las fallas se puedan reproducir.',
    back:'← Prueba con Teléfono',readiness:'Preparación del Piloto',home:'Inicio',english:'English',spanish:'Español',build:'Versión que estás probando',
    before:'Antes de comenzar',beforeItems:['Usa solamente cuentas de prueba. Nunca experimentes con la cuenta de un miembro real.','Usa un solo sitio/vista previa exacta durante toda la prueba. No mezcles evidencia de vistas previas diferentes.','Asegúrate de poder abrir el correo de la cuenta de prueba antes del registro o restablecimiento de contraseña.','Mantén abierta la lista Phone Proof en otra pestaña para guardar la evidencia inmediatamente.','Para comprobar español, empieza el flujo en Español y mantenlo en español hasta el resultado esperado.'],
    accounts:'Cuentas de prueba que debes preparar',accountItems:['NUEVA: un correo que nunca haya tenido cuenta de Kingdom Network.','EXISTENTE: una cuenta de prueba que ya existe y no está conectada a la iglesia destino.','ADMIN: una cuenta de prueba pastor/admin de iglesia para invitaciones y Fresh Church Setup.'],
    order:'Orden recomendado de prueba',successLabel:'PASÓ significa',failureLabel:'Si falla',stopTitle:'Detente y reporta en lugar de volver a intentar muchas veces cuando',stopItems:['una página muestra texto técnico, del proveedor o de la base de datos','registro, unión, restablecimiento, aprobación o carga parece enviarse más de una vez','al unirse con una cuenta existente te pide crear otra cuenta','el español cae inesperadamente en un callejón sin salida solamente en inglés','Fresh Church Setup publica un curso en lugar de dejar un borrador sin publicar'],
    capture:'Guarda esta evidencia de la falla',captureItems:['Nombre del flujo y número exacto del paso que falló.','Teléfono/navegador, tipo de cuenta de prueba, fecha, sitio/vista previa exacta y el commit Git mostrado en Phone Proof.','Una descripción corta de lo que tocaste y lo que apareció después.','Una captura solamente si no muestra contraseña, token de verificación, enlace/token de restablecimiento, token de invitación ni información privada del miembro/iglesia.'],
    never:'Nunca pegues en el Control Room',neverItems:['contraseñas o códigos de un solo uso','enlaces completos de confirmación o restablecimiento de contraseña','tokens de invitación/unión ni parámetros secretos','información personal de miembros reales','datos privados de oración, cuidado pastoral, finanzas o dirección de reunión'],
    finish:'Cuando termines la prueba',finishBody:'Regresa a Phone Proof y registra PASÓ o FALLÓ inmediatamente. Un build automático en verde no reemplaza esta evidencia en teléfono real.',openChecklist:'Abrir lista Phone Proof'
  }
} as const

const flows:{en:Flow[];es:Flow[]}={
  en:[
    {title:'1. New signup → confirmation → Start Here → sign out/in',account:'NEW test account',steps:['Open public signup in English and create the new account once.','Open only the newest confirmation email on the same phone.','Complete Start Here.','Sign out and sign back in with the same account.','Repeat the critical first-login path in Spanish with a separate NEW test account.'],success:'Each account reaches Home, keeps the selected language, and can sign back in without creating a duplicate.',failure:'Record the exact screen where the flow stopped. Do not keep resubmitting signup or confirmation.'},
    {title:'2. Existing account → join church',account:'EXISTING test account',steps:['Open the newest church join link.','Choose Sign In, not Create Account.','Sign in with the existing test account.','Finish joining and check Home/My Journey.','Repeat in Spanish.'],success:'The same existing account becomes connected to the church and no second account is created.',failure:'If the flow asks for a new account, loses the church, or loops, stop and record the exact step.'},
    {title:'3. Invitation replacement / old-link recovery',account:'ADMIN + member test account',steps:['Create/use a current test invitation.','Open the newest invitation on the member phone.','If a replaced/older invitation exists, open that old link too.','Follow its recovery guidance back to the newest invitation.','Repeat the member-facing recovery in Spanish.'],success:'Newest invitation works; old/replaced links recover clearly without raw errors or a dead end.',failure:'Do not paste the invitation token. Record only the flow step, visible safe message, device, build, and site.'},
    {title:'4. Forgot password → newest reset email → sign in',account:'EXISTING test account',steps:['From Sign In, request a password reset once.','Open only the newest reset email.','Set a new password once.','Continue to Sign In and log in.','Repeat the recovery path in Spanish.'],success:'The new password works, stale links do not create confusion, and safe church-join return context is preserved.',failure:'Never copy the reset URL/token. Record the screen before and after the failure instead.'},
    {title:'5. Kingdom Guide recovery help',account:'Connected member test account',steps:['Ask in English how to reset a password and how to join a church with an existing account.','Switch to Spanish and ask equivalent recovery questions.','Use a safe retry/recovery path if available.'],success:'Guide answers simply in the selected language and never exposes provider/database text.',failure:'Record the exact question in sanitized form and the safe visible result. Do not include private church/member data.'},
    {title:'6. Fresh Church Setup → recommendation → unpublished draft',account:'ADMIN test account',steps:['Open Church Builder → Setup Inbox on the phone.','Upload only harmless test material.','Review and approve the recommendation once.','Open the resulting Course Builder item.','Repeat the navigation/recovery checks in Spanish.'],success:'The flow is understandable, repeat taps are guarded, and the generated course remains unpublished.',failure:'If anything publishes automatically or appears to submit twice, stop immediately and record the exact step.'}
  ],
  es:[
    {title:'1. Registro nuevo → confirmación → Empieza Aquí → salir/entrar',account:'Cuenta de prueba NUEVA',steps:['Abre el registro público en inglés y crea la cuenta nueva una sola vez.','Abre solamente el correo de confirmación más reciente en el mismo teléfono.','Completa Empieza Aquí.','Cierra sesión y vuelve a entrar con la misma cuenta.','Repite la ruta crítica del primer ingreso en español con otra cuenta NUEVA de prueba.'],success:'Cada cuenta llega a Inicio, conserva el idioma seleccionado y puede volver a entrar sin crear un duplicado.',failure:'Guarda la pantalla exacta donde se detuvo. No sigas enviando registro o confirmación muchas veces.'},
    {title:'2. Cuenta existente → unirse a la iglesia',account:'Cuenta de prueba EXISTENTE',steps:['Abre el enlace más reciente para unirse a la iglesia.','Elige Entrar, no Crear Cuenta.','Entra con la cuenta de prueba existente.','Termina la unión y revisa Inicio/Mi Jornada.','Repite en español.'],success:'La misma cuenta existente queda conectada a la iglesia y no se crea una segunda cuenta.',failure:'Si pide una cuenta nueva, pierde la iglesia o entra en un ciclo, detente y guarda el paso exacto.'},
    {title:'3. Reemplazo de invitación / recuperación de enlace viejo',account:'ADMIN + cuenta de miembro de prueba',steps:['Crea/usa una invitación de prueba vigente.','Abre la invitación más reciente en el teléfono del miembro.','Si existe una invitación anterior/reemplazada, abre también ese enlace viejo.','Sigue su recuperación hacia la invitación más reciente.','Repite la recuperación visible al miembro en español.'],success:'La invitación más reciente funciona; los enlaces viejos/reemplazados se recuperan claramente sin errores técnicos ni callejón sin salida.',failure:'No pegues el token de invitación. Guarda solamente el paso, mensaje seguro visible, dispositivo, versión y sitio.'},
    {title:'4. Olvidé contraseña → correo más reciente → entrar',account:'Cuenta de prueba EXISTENTE',steps:['Desde Entrar, solicita el restablecimiento una sola vez.','Abre solamente el correo de restablecimiento más reciente.','Crea una contraseña nueva una sola vez.','Continúa a Entrar e inicia sesión.','Repite la recuperación en español.'],success:'La contraseña nueva funciona, los enlaces viejos no confunden y se conserva cualquier regreso seguro a la iglesia.',failure:'Nunca copies la URL/token de restablecimiento. Guarda las pantallas antes y después de la falla.'},
    {title:'5. Ayuda de recuperación en Kingdom Guide',account:'Cuenta de miembro conectado de prueba',steps:['Pregunta en inglés cómo restablecer la contraseña y cómo unirte a una iglesia con una cuenta existente.','Cambia a español y haz preguntas equivalentes.','Usa una ruta segura de reintento/recuperación si está disponible.'],success:'Guide responde de forma sencilla en el idioma seleccionado y nunca muestra texto del proveedor/base de datos.',failure:'Guarda la pregunta de forma segura y el resultado visible. No incluyas datos privados del miembro/iglesia.'},
    {title:'6. Fresh Church Setup → recomendación → borrador sin publicar',account:'Cuenta ADMIN de prueba',steps:['Abre Church Builder → Setup Inbox en el teléfono.','Sube solamente material inofensivo de prueba.','Revisa y aprueba la recomendación una sola vez.','Abre el elemento resultante en Course Builder.','Repite en español las verificaciones de navegación/recuperación.'],success:'El flujo se entiende, los toques repetidos están protegidos y el curso generado permanece sin publicar.',failure:'Si algo se publica automáticamente o parece enviarse dos veces, detente inmediatamente y guarda el paso exacto.'}
  ]
}

function boundedCode(value:unknown){
  const code=typeof value==='object'&&value&&'code' in value?String((value as {code?:unknown}).code??'UNKNOWN'):'UNKNOWN'
  return code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'UNKNOWN'
}

export default async function PhoneProofRunbook({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang:Lang=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  if(claimsError){
    console.error('[phone-proof-runbook] auth unavailable',{code:boundedCode(claimsError)})
    throw new Error('PHONE_PROOF_RUNBOOK_AUTH_UNAVAILABLE')
  }
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}&mode=signin`)

  const {data:membership,error:membershipError}=await supabase
    .from('church_memberships')
    .select('church_id,role')
    .eq('user_id',userId)
    .eq('status','active')
    .limit(1)
    .maybeSingle()
  if(membershipError){
    console.error('[phone-proof-runbook] membership unavailable',{code:boundedCode(membershipError)})
    throw new Error('PHONE_PROOF_RUNBOOK_MEMBERSHIP_UNAVAILABLE')
  }
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect(lang==='es'?'/?lang=es':'/')

  const buildId=(process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA||'local-dev').trim().slice(0,40)||'local-dev'

  return <main className="phone-proof-shell">
    <header className="phone-proof-top">
      <div><div className="pill">{t.pill}</div><h1>{t.title}</h1><p>{t.body}</p></div>
      <nav className="proof-links" aria-label={lang==='es'?'Navegación de la guía':'Runbook navigation'}>
        <Link href={`/church/readiness/phone-proof?lang=${lang}`}>{t.back}</Link>
        <Link href={`/church/readiness${lang==='es'?'?lang=es':''}`}>{t.readiness}</Link>
        <Link href={lang==='es'?'/?lang=es':'/'}>{t.home}</Link>
        <Link href="/church/readiness/phone-proof/runbook?lang=en">{t.english}</Link>
        <Link href="/church/readiness/phone-proof/runbook?lang=es">{t.spanish}</Link>
      </nav>
    </header>

    <section className="local-note"><strong>{t.build}:</strong> <code>{buildId}</code></section>

    <section className="proof-item"><h2>{t.before}</h2><ul>{t.beforeItems.map(item=><li key={item}>{item}</li>)}</ul></section>
    <section className="proof-item"><h2>{t.accounts}</h2><ul>{t.accountItems.map(item=><li key={item}>{item}</li>)}</ul></section>

    <section className="proof-list" aria-label={t.order}>
      <h2>{t.order}</h2>
      {flows[lang].map(flow=><article className="proof-item" key={flow.title}>
        <h2>{flow.title}</h2>
        <p><strong>{lang==='es'?'Cuenta':'Account'}:</strong> {flow.account}</p>
        <ol>{flow.steps.map(step=><li key={step}>{step}</li>)}</ol>
        <p><strong>{t.successLabel}:</strong> {flow.success}</p>
        <p className="evidence-hint"><strong>{t.failureLabel}:</strong> {flow.failure}</p>
      </article>)}
    </section>

    <section className="proof-item"><h2>{t.stopTitle}</h2><ul>{t.stopItems.map(item=><li key={item}>{item}</li>)}</ul></section>
    <section className="proof-item"><h2>{t.capture}</h2><ul>{t.captureItems.map(item=><li key={item}>{item}</li>)}</ul></section>
    <section className="proof-item"><h2>{t.never}</h2><ul>{t.neverItems.map(item=><li key={item}>{item}</li>)}</ul></section>

    <section className="local-note complete"><strong>{t.finish}</strong><p>{t.finishBody}</p><div className="proof-links"><Link href={`/church/readiness/phone-proof?lang=${lang}`}>{t.openChecklist}</Link></div></section>
  </main>
}
