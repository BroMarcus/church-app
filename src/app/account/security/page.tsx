import Link from 'next/link'
import {redirect} from 'next/navigation'
import {KeyRound,LogOut,Mail,MessageSquareWarning,ShieldCheck} from 'lucide-react'
import {PasswordField} from '@/components/password-field'
import {createClient} from '@/lib/supabase/server'
import {changeLoginEmail,changePassword,signOutEverywhere} from './actions'
import {SecuritySubmitButton} from './security-submit-button'
import './security.css'

const errorCopy={
  auth_unavailable:{en:'We could not safely verify your account right now. Nothing was changed. Please try again.',es:'No pudimos verificar tu cuenta de forma segura en este momento. No se cambió nada. Inténtalo otra vez.'},
  email_invalid:{en:'Enter a valid email address.',es:'Escribe un correo válido.'},
  email_update_failed:{en:'We could not change your login email right now. Nothing was changed. Please try again.',es:'No pudimos cambiar tu correo de acceso en este momento. No se cambió nada. Inténtalo otra vez.'},
  password_short:{en:'Use at least 12 characters for your new password.',es:'Usa por lo menos 12 caracteres para tu nueva contraseña.'},
  password_too_long:{en:'Use 128 characters or fewer for your new password.',es:'Usa 128 caracteres o menos para tu nueva contraseña.'},
  password_mismatch:{en:'The password confirmation does not match.',es:'La confirmación de contraseña no coincide.'},
  password_update_failed:{en:'We could not update your password right now. Nothing was changed. Please try again.',es:'No pudimos actualizar tu contraseña en este momento. No se cambió nada. Inténtalo otra vez.'},
  signout_failed:{en:'We could not sign out every device right now. Your account is still available here. Please try again.',es:'No pudimos cerrar la sesión en todos los dispositivos en este momento. Tu cuenta sigue disponible aquí. Inténtalo otra vez.'},
  generic:{en:'We could not complete that security change. Nothing was changed. Please try again.',es:'No pudimos completar ese cambio de seguridad. No se cambió nada. Inténtalo otra vez.'},
} as const

type ErrorStatus=keyof typeof errorCopy
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function safeInviteId(value:string|undefined){return value&&value.length<=128&&INVITE_ID_PATTERN.test(value)?value:''}
function safeJoinNext(value:string|undefined){
  try{if(!value||value.length>500||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '';const base='https://kingdom.invalid',parsed=new URL(value,base);if(parsed.origin!==base||!parsed.pathname.startsWith('/join/'))return '';return `${parsed.pathname}${parsed.search}${parsed.hash}`}catch{return ''}
}

export default async function AccountSecurityPage({searchParams}:{searchParams:Promise<{email?:string;password?:string;status?:string;error?:string;lang?:string;next?:string;invite?:string}>}){
  const query=await searchParams,es=query.lang==='es',t=(en:string,sp:string)=>es?sp:en,joinNext=safeJoinNext(query.next),inviteId=safeInviteId(query.invite)
  const contextPart=`${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const securityHref=(lang:'en'|'es')=>`/account/security?lang=${lang}${contextPart}`
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  const recovery=(code:string)=>{console.error('Account security unavailable',{code});return <main className="shell"><section className="card" style={{marginTop:24,maxWidth:720}}><div className="pill">{t('ACCOUNT SECURITY','SEGURIDAD DE LA CUENTA')}</div><h1>{t('We could not safely load Account Security.','No pudimos cargar Seguridad de la Cuenta de forma segura.')}</h1><p className="muted">{t('Nothing was changed. This is usually temporary. Try again; if it continues, return Home and use Help & Feedback.','No se cambió nada. Normalmente esto es temporal. Inténtalo otra vez; si continúa, vuelve a Inicio y usa Ayuda y Comentarios.')}</p><div className="row"><Link className="btn" href={securityHref(es?'es':'en')}>{t('Try again','Intentar otra vez')}</Link><Link className="ghost" href={l('/')}>{t('Home','Inicio')}</Link><Link className="ghost" href={l('/feedback')}>{t('Help & Feedback','Ayuda y Comentarios')}</Link></div></section></main>}
  if(claimsError)return recovery(`claims:${boundedCode(claimsError.code)}`)
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${es?'es':'en'}&mode=signin${contextPart}`)
  const {data:userData,error:userError}=await supabase.auth.getUser()
  if(userError)return recovery(`user:${boundedCode(userError.code)}`)
  const loginEmail=userData.user?.email||String(claims?.claims?.email??'')
  const status=(query.status&&Object.prototype.hasOwnProperty.call(errorCopy,query.status)?query.status:query.error?'generic':null) as ErrorStatus|null
  const statusMessage=status?errorCopy[status][es?'es':'en']:null

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{t('My Account • Security','Mi Cuenta • Seguridad')}</div></div><div className="row"><Link className="ghost" href={securityHref('en')}>English</Link><Link className="ghost" href={securityHref('es')}>Español</Link><Link className="ghost" href={l('/account/privacy')}>{t('Privacy','Privacidad')}</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/profile')}>{t('Profile','Perfil')}</Link><Link className="ghost" href={l('/')}>← {t('Home','Inicio')}</Link></div></header>

    <section className="security-hero card"><div><div className="pill">{t('LOGIN & SECURITY','ACCESO Y SEGURIDAD')}</div><h1>{t('Manage how you sign in.','Administra cómo inicias sesión.')}</h1><p className="muted">{t('Change your login email or password, or sign out of every device if you need to.','Cambia tu correo de acceso o contraseña, o cierra sesión en todos tus dispositivos si lo necesitas.')}</p></div><div className="hero-stat"><ShieldCheck size={24}/><span>{t('Your account','Tu cuenta')}</span></div></section>
    {(joinNext||inviteId)&&<div className="notice" role="status"><strong>{t('Finish your church connection','Termina tu conexión con la iglesia')}</strong><div className="small" style={{marginTop:4}}>{inviteId?t('Your private church invitation is being kept safe. After you sign out everywhere, sign in with this same account and Kingdom Network will finish applying the invitation. Do not create another account.','Tu invitación privada de la iglesia se mantiene segura. Después de cerrar sesión en todos los dispositivos, inicia sesión con esta misma cuenta y Kingdom Network terminará de aplicar la invitación. No crees otra cuenta.'):t('After you sign out everywhere, we will return you to Sign in and then back to the church you were joining.','Después de cerrar sesión en todos los dispositivos, te regresaremos a Iniciar sesión y luego a la iglesia a la que estabas tratando de unirte.')}</div></div>}
    {query.email&&<div className="notice success" role="status" aria-live="polite">{t('Login email change requested. Check your email and follow the confirmation instructions.','Cambio de correo solicitado. Revisa tu correo y sigue las instrucciones de confirmación.')}</div>}{query.password&&<div className="notice success" role="status" aria-live="polite">{t('Password updated.','Contraseña actualizada.')}</div>}{statusMessage&&<div className="notice error" role="alert">{statusMessage}</div>}

    <section className="security-grid"><article className="card security-card"><div className="pill">{t('LOGIN EMAIL','CORREO DE ACCESO')}</div><h2><Mail size={15}/> {t('Change sign-in email','Cambiar correo de acceso')}</h2><div className="security-current"><strong>{t('Current login email','Correo actual')}</strong><span>{loginEmail||t('Not available','No disponible')}</span></div><form action={changeLoginEmail} className="security-form"><input type="hidden" name="lang" value={es?'es':'en'}/>{inviteId&&<input type="hidden" name="invite_id" value={inviteId}/>} {joinNext&&<input type="hidden" name="next" value={joinNext}/>}<label><span>{t('New login email','Nuevo correo de acceso')}</span><input name="email" type="email" maxLength={254} required autoComplete="email"/></label><SecuritySubmitButton label={t('Request email change','Solicitar cambio')} pendingLabel={t('Requesting change…','Solicitando cambio…')}/></form></article>

      <article className="card security-card"><div className="pill">{t('PASSWORD','CONTRASEÑA')}</div><h2><KeyRound size={15}/> {t('Change password','Cambiar contraseña')}</h2><p className="small muted">{t('Use a password you do not reuse on another account.','Usa una contraseña que no reutilices en otra cuenta.')}</p><form action={changePassword} className="security-form"><input type="hidden" name="lang" value={es?'es':'en'}/>{inviteId&&<input type="hidden" name="invite_id" value={inviteId}/>} {joinNext&&<input type="hidden" name="next" value={joinNext}/>}<PasswordField name="password" label={t('New password','Nueva contraseña')} minLength={12} maxLength={128} required autoComplete="new-password" showLabel={t('Show password','Mostrar contraseña')} hideLabel={t('Hide password','Ocultar contraseña')}/><PasswordField name="confirm_password" label={t('Confirm new password','Confirmar contraseña')} minLength={12} maxLength={128} required autoComplete="new-password" showLabel={t('Show password','Mostrar contraseña')} hideLabel={t('Hide password','Ocultar contraseña')}/><SecuritySubmitButton label={t('Update password','Actualizar contraseña')} pendingLabel={t('Updating password…','Actualizando contraseña…')}/></form><div className="security-current"><strong>{t('Minimum','Mínimo')}</strong><span>{t('12 characters','12 caracteres')}</span></div></article>

      <article className="card security-card security-danger"><div className="pill">{t('DEVICES','DISPOSITIVOS')}</div><h2><LogOut size={15}/> {t('Sign out everywhere','Cerrar sesión en todos lados')}</h2><p className="small muted">{t('Use this if you signed in on a device you no longer control or think someone else may have access.','Úsalo si iniciaste sesión en un dispositivo que ya no controlas o crees que otra persona puede tener acceso.')}</p><form action={signOutEverywhere}><input type="hidden" name="lang" value={es?'es':'en'}/>{inviteId&&<input type="hidden" name="invite_id" value={inviteId}/>} {joinNext&&<input type="hidden" name="next" value={joinNext}/>}<SecuritySubmitButton label={t('Sign out all devices','Cerrar sesión en todos los dispositivos')} pendingLabel={t('Signing out…','Cerrando sesiones…')}/></form></article>

      <article className="card security-card"><div className="pill">{t('CONTACT EMAIL','CORREO DE CONTACTO')}</div><h2>{t('What church members may see','Lo que los miembros pueden ver')}</h2><p className="small muted">{t('Your optional Contact Email lives on your profile and has its own Show/Hide privacy setting. It is separate from the email you use to sign in.','Tu Correo de Contacto opcional está en tu perfil y tiene su propio control Mostrar/Ocultar. Es diferente al correo que usas para iniciar sesión.')}</p><div className="row"><Link className="ghost" href={l('/profile')}>{t('Edit contact email','Editar correo de contacto')}</Link><Link className="ghost" href={l('/account/privacy')}>{t('Privacy settings','Privacidad')}</Link></div></article></section>
  </main>
}