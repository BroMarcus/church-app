import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import '../phone-proof.css'

type Lang='en'|'es'
type Scenario={title:string;account:string;steps:string[];pass:string;stop:string}

const copy={
  en:{
    pill:'PRIVATE INVITE PROOF',title:'Prove private invitations on a real phone',body:'Use test accounts only. These checks prove the same-account, confirmation, and recovery safeguards that matter most before pilot launch.',
    back:'← Phone Proof',runbook:'Safe test runbook',readiness:'Pilot Readiness',home:'Home',english:'English',spanish:'Español',build:'Build under test',
    buildWarning:'STOP — this deployed page does not expose an exact 40-character Git commit. Do not record PASS evidence for private invitations here.',
    ruleTitle:'One rule before every test',rules:['Use only the newest private invitation unless a step explicitly asks you to test an old/revoked/malformed link.','Keep the same Kingdom Network account through recovery. Never create a second account for an existing user.','Never paste invitation tokens, confirmation links, reset links, passwords, one-time codes, or real member information into test notes.','Run every scenario in English and Spanish on the same exact deployed build before treating it as PASS.'],
    scenarios:'Required private-invite scenarios',accountLabel:'Account',passLabel:'PASS means',stopLabel:'Stop and record FAIL if',
    finish:'When these are green',finishBody:'Return to Phone Proof and record the invitation evidence there. These instructions do not write church/member data; only the normal test flows you intentionally perform can change designated test records.'
  },
  es:{
    pill:'PRUEBA DE INVITACIÓN PRIVADA',title:'Comprueba invitaciones privadas en un teléfono real',body:'Usa solamente cuentas de prueba. Estas pruebas comprueban las protecciones de misma cuenta, confirmación y recuperación más importantes antes del piloto.',
    back:'← Prueba con Teléfono',runbook:'Guía segura de prueba',readiness:'Preparación del Piloto',home:'Inicio',english:'English',spanish:'Español',build:'Versión que estás probando',
    buildWarning:'DETENTE — esta página desplegada no muestra un commit Git exacto de 40 caracteres. No registres PASÓ para invitaciones privadas aquí.',
    ruleTitle:'Una regla antes de cada prueba',rules:['Usa solamente la invitación privada más reciente a menos que un paso te pida probar un enlace viejo/revocado/dañado.','Conserva la misma cuenta de Kingdom Network durante la recuperación. Nunca crees una segunda cuenta para un usuario existente.','Nunca pegues tokens de invitación, enlaces de confirmación, enlaces de restablecimiento, contraseñas, códigos de un solo uso ni información real de miembros en las notas.','Prueba cada escenario en inglés y español en la misma versión desplegada exacta antes de tratarlo como PASÓ.'],
    scenarios:'Escenarios requeridos de invitación privada',accountLabel:'Cuenta',passLabel:'PASÓ significa',stopLabel:'Detente y registra FALLÓ si',
    finish:'Cuando todo esté en verde',finishBody:'Regresa a Phone Proof y registra allí la evidencia de invitación. Estas instrucciones no escriben datos de la iglesia/miembro; solamente los flujos normales de prueba que tú hagas intencionalmente pueden cambiar registros de prueba designados.'
  }
} as const

const scenarios:{en:Scenario[];es:Scenario[]}={
  en:[
    {
      title:'1. NEW account → private invite → confirm newest email → Start Here',account:'NEW test email with no Kingdom Network account',
      steps:['Open the newest private invitation and choose Create Account once.','Create the new test account once. Do not expect the invitation to be consumed before email verification.','Open only the newest confirmation email on the same phone.','Finish confirmation and continue without entering the password a second time if a verified session already exists.','Confirm Start Here says the account/church connection is ready, then continue Home.'],
      pass:'The invitation is applied only after verified authentication, the new account reaches Start Here/Home, and no duplicate account or second password prompt is required.',
      stop:'the invite appears consumed before confirmation, confirmation loses the church, a second account is suggested, raw technical text appears, or the generated membership cannot be verified.'
    },
    {
      title:'2. EXISTING account → private invite → Sign In',account:'EXISTING test account not yet connected to the target church',
      steps:['Open the newest private invitation.','Choose Sign In — not Create Account — and use the existing account.','Confirm the private invitation is applied to that same account.','Check Home/Start Here for the expected church connection.'],
      pass:'The same existing account joins successfully and no duplicate account is created or encouraged.',
      stop:'Create Account is required, the invitation context disappears, the wrong church is shown, redemption is uncertain but presented as success, or the user is left in a loop.'
    },
    {
      title:'3. EXISTING account → private invite → forgot password → reset → return',account:'EXISTING test account that needs password recovery',
      steps:['Open the newest private invitation and choose Sign In.','Use Forgot Password once. Verify a failed/invalid request can be corrected immediately without a false cooldown.','After a confirmed email send, verify the 60-second cooldown appears only for that successful send.','Open only the newest reset email, set the new password once, and continue.','Confirm the same private invitation survives reset/sign-in and applies to the same existing account.','After the cooldown later expires, refresh the old success URL and confirm it does not manufacture another cooldown without another email send.'],
      pass:'Password recovery preserves the private invite and same account; cooldown behavior matches actual email sends; the user returns to the intended church flow.',
      stop:'the invitation is lost, another account is suggested, an old success URL restarts cooldown, reset claims success while cleanup is uncertain, or recovery lands on the wrong church.'
    },
    {
      title:'4. UNCONFIRMED existing account → resend confirmation → confirm → return',account:'EXISTING unconfirmed test account with a valid private invite',
      steps:['Open the newest private invitation and attempt Sign In with the unconfirmed test account.','Use Resend Confirmation once. A failed request must be correctable immediately; a confirmed send may start the normal cooldown.','Open only the newest confirmation email.','Confirm the same private invitation survives verification and is applied only after verified authentication.'],
      pass:'The newest confirmation finishes the same-account invitation flow without creating another account or losing the church.',
      stop:'the user is told to create another account, the invitation disappears, a temporary Auth failure is mislabeled as an expired newest link, or the invitation is redeemed before verified authentication.'
    },
    {
      title:'5. Old / revoked / malformed private invitation',account:'ADMIN + member test accounts',
      steps:['Using only designated test invitations, open an old/revoked link and confirm it does not join the account.','Open a safely malformed/truncated test link that contains no real secret copied into notes.','Confirm Create Account stays unavailable for malformed or unverifiable private-invite context.','Follow the bilingual recovery guidance to use the newest invitation with the same existing account.'],
      pass:'Unsafe invitation context fails closed, never falls through to ordinary signup, and clearly directs the member to the newest invitation/same account.',
      stop:'a bad invite enables ordinary account creation, joins the wrong church, exposes technical/provider text, or gives no clear recovery path.'
    },
    {
      title:'6. Redemption failure → verified browser cleanup',account:'Designated test account and safe failure condition only',
      steps:['Use a safe test condition where private-invite redemption cannot be verified.','Confirm Kingdom Network does not claim success.','If it says the browser was signed out, verify the current-browser session is actually gone.','If cleanup cannot be verified, confirm the flow goes to Account Security rather than claiming a clean sign-out.'],
      pass:'Uncertain redemption fails closed; browser cleanup is verified before sign-out is claimed; unrelated devices are not intentionally signed out.',
      stop:'a half-finished membership is presented as success, the app claims sign-out while the current session remains, or recovery signs out unrelated devices as normal cleanup.'
    }
  ],
  es:[
    {
      title:'1. Cuenta NUEVA → invitación privada → confirmar correo más reciente → Empieza Aquí',account:'Correo NUEVO de prueba sin cuenta de Kingdom Network',
      steps:['Abre la invitación privada más reciente y elige Crear Cuenta una sola vez.','Crea la cuenta nueva de prueba una sola vez. La invitación no debe consumirse antes de verificar el correo.','Abre solamente el correo de confirmación más reciente en el mismo teléfono.','Termina la confirmación y continúa sin escribir la contraseña otra vez si ya existe una sesión verificada.','Confirma que Empieza Aquí indique que la cuenta/iglesia está conectada y continúa a Inicio.'],
      pass:'La invitación se aplica solamente después de autenticación verificada, la cuenta nueva llega a Empieza Aquí/Inicio y no se requiere cuenta duplicada ni segunda contraseña.',
      stop:'la invitación parece consumida antes de confirmar, se pierde la iglesia, se sugiere otra cuenta, aparece texto técnico o no se puede verificar la membresía creada.'
    },
    {
      title:'2. Cuenta EXISTENTE → invitación privada → Entrar',account:'Cuenta EXISTENTE de prueba todavía no conectada a la iglesia destino',
      steps:['Abre la invitación privada más reciente.','Elige Entrar — no Crear Cuenta — y usa la cuenta existente.','Confirma que la invitación privada se aplique a esa misma cuenta.','Revisa Inicio/Empieza Aquí para confirmar la conexión esperada.'],
      pass:'La misma cuenta existente se une correctamente y no se crea ni se recomienda una cuenta duplicada.',
      stop:'se requiere Crear Cuenta, desaparece la invitación, aparece otra iglesia, una redención incierta se muestra como éxito o el usuario queda en un ciclo.'
    },
    {
      title:'3. Cuenta EXISTENTE → invitación privada → olvidé contraseña → restablecer → regresar',account:'Cuenta EXISTENTE de prueba que necesita recuperar contraseña',
      steps:['Abre la invitación privada más reciente y elige Entrar.','Usa Olvidé Contraseña una sola vez. Verifica que una solicitud inválida/fallida pueda corregirse inmediatamente sin espera falsa.','Después de un envío de correo confirmado, verifica que la espera de 60 segundos aparezca solamente por ese envío exitoso.','Abre solamente el correo de restablecimiento más reciente, cambia la contraseña una vez y continúa.','Confirma que la misma invitación privada sobreviva el restablecimiento/entrada y se aplique a la misma cuenta existente.','Cuando termine la espera, actualiza la URL vieja de éxito y confirma que no cree otra espera sin enviar otro correo.'],
      pass:'La recuperación conserva la invitación y la misma cuenta; la espera coincide con correos realmente enviados; el usuario regresa al flujo correcto de iglesia.',
      stop:'se pierde la invitación, se sugiere otra cuenta, una URL vieja reinicia la espera, se muestra éxito con limpieza incierta o la recuperación llega a otra iglesia.'
    },
    {
      title:'4. Cuenta existente SIN CONFIRMAR → reenviar confirmación → confirmar → regresar',account:'Cuenta EXISTENTE sin confirmar con invitación privada válida',
      steps:['Abre la invitación privada más reciente e intenta Entrar con la cuenta sin confirmar.','Usa Reenviar Confirmación una sola vez. Una solicitud fallida debe poder corregirse inmediatamente; un envío confirmado puede iniciar la espera normal.','Abre solamente el correo de confirmación más reciente.','Confirma que la misma invitación sobreviva la verificación y se aplique solamente después de autenticación verificada.'],
      pass:'La confirmación más reciente termina el flujo de invitación con la misma cuenta sin crear otra cuenta ni perder la iglesia.',
      stop:'se pide crear otra cuenta, desaparece la invitación, una falla temporal de Auth se llama enlace expirado o la invitación se redime antes de autenticación verificada.'
    },
    {
      title:'5. Invitación privada vieja / revocada / dañada',account:'ADMIN + cuentas de miembro de prueba',
      steps:['Usando solamente invitaciones de prueba designadas, abre un enlace viejo/revocado y confirma que no una la cuenta.','Abre un enlace de prueba dañado/truncado de forma segura sin copiar secretos reales en notas.','Confirma que Crear Cuenta permanezca deshabilitado con contexto de invitación malformado o no verificable.','Sigue la recuperación bilingüe hacia la invitación más reciente usando la misma cuenta existente.'],
      pass:'El contexto inseguro falla de forma cerrada, nunca cae al registro público normal y dirige claramente al miembro a la invitación más reciente/misma cuenta.',
      stop:'una invitación mala permite crear cuenta normal, une a otra iglesia, muestra texto técnico o no ofrece una recuperación clara.'
    },
    {
      title:'6. Falla de redención → limpieza verificada del navegador',account:'Cuenta de prueba designada y condición segura de falla solamente',
      steps:['Usa una condición segura de prueba donde no se pueda verificar la redención de la invitación.','Confirma que Kingdom Network no muestre éxito.','Si dice que cerró sesión del navegador, verifica que la sesión de este navegador realmente haya desaparecido.','Si no puede verificar la limpieza, confirma que vaya a Seguridad de Cuenta en lugar de afirmar que cerró sesión.'],
      pass:'La redención incierta falla cerrada; se verifica la limpieza antes de afirmar cierre de sesión; no se cierran intencionalmente otros dispositivos como limpieza normal.',
      stop:'una membresía incompleta se muestra como éxito, dice que cerró sesión mientras sigue activa o la recuperación cierra otros dispositivos como limpieza normal.'
    }
  ]
}

function boundedCode(value:unknown){
  const code=typeof value==='object'&&value&&'code' in value?String((value as {code?:unknown}).code??'UNKNOWN'):'UNKNOWN'
  return code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'UNKNOWN'
}
function isVerifiedBuild(buildId:string){return /^[0-9a-f]{40}$/i.test(buildId.trim())}

export default async function PrivateInvitePhoneProof({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang:Lang=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  if(claimsError){
    console.error('[private-invite-phone-proof] auth unavailable',{code:boundedCode(claimsError)})
    throw new Error('PRIVATE_INVITE_PHONE_PROOF_AUTH_UNAVAILABLE')
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
    console.error('[private-invite-phone-proof] membership unavailable',{code:boundedCode(membershipError)})
    throw new Error('PRIVATE_INVITE_PHONE_PROOF_MEMBERSHIP_UNAVAILABLE')
  }
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect(lang==='es'?'/?lang=es':'/')

  const buildId=(process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA||'local-dev').trim().slice(0,40)||'local-dev'
  const verifiedBuild=isVerifiedBuild(buildId)

  return <main className="phone-proof-shell">
    <header className="phone-proof-top">
      <div><div className="pill">{t.pill}</div><h1>{t.title}</h1><p>{t.body}</p></div>
      <nav className="proof-links" aria-label={lang==='es'?'Navegación de invitación privada':'Private invitation proof navigation'}>
        <Link href={`/church/readiness/phone-proof?lang=${lang}`}>{t.back}</Link>
        <Link href={`/church/readiness/phone-proof/runbook?lang=${lang}`}>{t.runbook}</Link>
        <Link href={`/church/readiness${lang==='es'?'?lang=es':''}`}>{t.readiness}</Link>
        <Link href={lang==='es'?'/?lang=es':'/'}>{t.home}</Link>
        <Link href="/church/readiness/phone-proof/private-invite?lang=en">{t.english}</Link>
        <Link href="/church/readiness/phone-proof/private-invite?lang=es">{t.spanish}</Link>
      </nav>
    </header>

    <section className="local-note"><strong>{t.build}:</strong> <code>{buildId}</code></section>
    {!verifiedBuild&&<p className="evidence-hint" role="alert">{t.buildWarning}</p>}

    <section className="proof-item"><h2>{t.ruleTitle}</h2><ul>{t.rules.map(rule=><li key={rule}>{rule}</li>)}</ul></section>

    <section className="proof-list" aria-label={t.scenarios}>
      <h2>{t.scenarios}</h2>
      {scenarios[lang].map(scenario=><article className="proof-item" key={scenario.title}>
        <h2>{scenario.title}</h2>
        <p><strong>{t.accountLabel}:</strong> {scenario.account}</p>
        <ol>{scenario.steps.map(step=><li key={step}>{step}</li>)}</ol>
        <p><strong>{t.passLabel}:</strong> {scenario.pass}</p>
        <p className="evidence-hint"><strong>{t.stopLabel}:</strong> {scenario.stop}</p>
      </article>)}
    </section>

    <section className="local-note complete"><strong>{t.finish}</strong><p>{t.finishBody}</p><div className="proof-links"><Link href={`/church/readiness/phone-proof?lang=${lang}`}>{t.back}</Link></div></section>
  </main>
}