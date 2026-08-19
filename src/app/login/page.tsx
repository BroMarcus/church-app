import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { login,signup,requestPasswordReset,resendConfirmation } from './actions'

const copy={
  en:{invited:'You’re invited.',home:'Church life, connected.',inviteCreate:(name:string)=>`Create your ${name} account below.`,homeBody:'Community, discipleship, outreach, learning, ministry and schedules in one place.',first:'First name',last:'Last name',email:'Email',createPassword:'Create password',password:'Password',again:'Type password again',signIn:'Sign in',accept:'Accept invite & create account',inviteHelp:'Use the exact email address your invitation was sent to. After creating the account, confirm the email we send you, then return here and sign in.',memberHelp:'New member accounts are created through a church invitation. Ask your church leadership for an invite link.',trouble:'Trouble signing in?',resetHelp:'Enter the email used for your account. You can reset your password or resend the account-confirmation email.',accountEmail:'Account email',forgot:'Forgot password',resend:'Resend confirmation email',invalid:'This invitation is expired, already used, revoked, or unavailable. If you already created your account, sign in below.',for:'For',as:'invited as',expires:'expires',english:'English',spanish:'Español'},
  es:{invited:'Estás invitado.',home:'La vida de la iglesia, conectada.',inviteCreate:(name:string)=>`Crea tu cuenta de ${name} abajo.`,homeBody:'Comunidad, discipulado, alcance, aprendizaje, ministerio y horarios en un solo lugar.',first:'Nombre',last:'Apellido',email:'Correo electrónico',createPassword:'Crear contraseña',password:'Contraseña',again:'Escribe la contraseña otra vez',signIn:'Iniciar sesión',accept:'Aceptar invitación y crear cuenta',inviteHelp:'Usa exactamente el correo al que llegó tu invitación. Después de crear la cuenta, confirma el correo que te enviamos y luego vuelve aquí para iniciar sesión.',memberHelp:'Las cuentas nuevas se crean mediante una invitación de la iglesia. Pide un enlace de invitación a un líder.',trouble:'¿Problemas para entrar?',resetHelp:'Escribe el correo de tu cuenta. Puedes cambiar tu contraseña o volver a enviar el correo de confirmación.',accountEmail:'Correo de la cuenta',forgot:'Olvidé mi contraseña',resend:'Reenviar correo de confirmación',invalid:'Esta invitación venció, ya fue usada, fue cancelada o no está disponible. Si ya creaste tu cuenta, inicia sesión abajo.',for:'Para',as:'invitado como',expires:'vence',english:'English',spanish:'Español'}
} as const

export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;message?:string;invite?:string;lang?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const supabase=await createClient()
  let invite:any=null
  if(params.invite){
    const {data}=await supabase.rpc('get_invite_preview',{p_invite_id:params.invite})
    invite=Array.isArray(data)?data[0]:data
  }
  const validInvite=Boolean(invite?.valid)
  const langHref=(nextLang:'en'|'es')=>`/login?lang=${nextLang}${params.invite?`&invite=${encodeURIComponent(params.invite)}`:''}`

  return <main className="login-wrap"><div className="login card"><div className="row" style={{justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div className="pill">KINGDOM NETWORK • ALPHA</div><div className="row" style={{gap:6}}><Link className="ghost" href={langHref('en')}>{t.english}</Link><Link className="ghost" href={langHref('es')}>{t.spanish}</Link></div></div><h1>{validInvite?t.invited:t.home}</h1><p className="muted">{validInvite?t.inviteCreate(invite.church_name):t.homeBody}</p>
    {params.error&&<div className="notice error">{params.error}</div>}{params.message&&<div className="notice success">{params.message}</div>}
    {validInvite&&<div className="notice success"><strong>{lang==='es'?'Invitación a':'Invitation to'} {invite.church_name}</strong><div className="small" style={{marginTop:4}}>{t.for} {invite.masked_email} • {t.as} {String(invite.role).replaceAll('_',' ')} • {t.expires} {new Date(invite.expires_at).toLocaleDateString(lang==='es'?'es-US':'en-US')}</div></div>}
    {params.invite&&!validInvite&&<div className="notice error">{t.invalid}</div>}
    <form><input type="hidden" name="lang" value={lang}/><input type="hidden" name="invite_id" value={validInvite?params.invite??'':''}/>{validInvite&&<><div className="row"><label className="field" style={{flex:1}}><span>{t.first}</span><input name="first_name" autoComplete="given-name" required/></label><label className="field" style={{flex:1}}><span>{t.last}</span><input name="last_name" autoComplete="family-name" required/></label></div></>}<label className="field"><span>{t.email}</span><input name="email" type="email" autoComplete="email" required/></label><label className="field"><span>{validInvite?t.createPassword:t.password}</span><input name="password" type="password" minLength={8} autoComplete={validInvite?'new-password':'current-password'} required/></label>{validInvite&&<label className="field"><span>{t.again}</span><input name="confirm_password" type="password" minLength={8} autoComplete="new-password" required/></label>}<div className="row"><button className="btn" formAction={login}>{t.signIn}</button>{validInvite&&<button className="btn secondary" formAction={signup}>{t.accept}</button>}</div></form>
    <p className="small muted" style={{marginTop:16}}>{validInvite?t.inviteHelp:t.memberHelp}</p>
    <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.12)'}}><strong>{t.trouble}</strong><p className="small muted">{t.resetHelp}</p><form><input type="hidden" name="lang" value={lang}/><label className="field"><span>{t.accountEmail}</span><input name="reset_email" type="email" autoComplete="email" required/></label><div className="row"><button className="btn secondary" formAction={requestPasswordReset}>{t.forgot}</button><button className="btn secondary" formAction={resendConfirmation}>{t.resend}</button></div></form></div>
  </div></main>
}
