import Link from 'next/link'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL } from '@/lib/supabase/config'
import { login,signup,requestPasswordReset,resendConfirmation } from './actions'

const copy={
  en:{home:'Welcome to Kingdom Network.',homeBody:'One place to grow, connect, serve and walk with God.',first:'First name',last:'Last name',email:'Email',createPassword:'Create password',password:'Password',again:'Type password again',signIn:'Sign in',accept:'Create my account',publicHelp:(name?:string)=>name?`Public signup is open for ${name}. Your new account will be connected to this church.`:'Anyone interested in the pilot can create an account. No invitation is needed.',closed:'Public signup is temporarily unavailable. Existing users can still sign in.',trouble:'Can’t get in?',resetHelp:'Use one option below, then open only the newest email we send.',accountEmail:'Your account email',forgot:'I forgot my password',resend:'I never confirmed my email',invalid:'That old invitation is no longer available, but public signup is open below.',english:'English',spanish:'Español',resetTip:'Use this if you already confirmed your account but forgot your password.',confirmTip:'Use this if you created an account but never confirmed your email.',emailTip:'Check Inbox and Spam/Junk. Wait at least one minute before requesting another email.',step1:'Create your account',step2:'Confirm the email we send',step3:'Come back and sign in',create:'Create account',signinTitle:'Sign in',newHere:'New here?',returning:'Already have an account?'},
  es:{home:'Bienvenido a Kingdom Network.',homeBody:'Un lugar para crecer, conectarte, servir y caminar con Dios.',first:'Nombre',last:'Apellido',email:'Correo electrónico',createPassword:'Crear contraseña',password:'Contraseña',again:'Escribe la contraseña otra vez',signIn:'Iniciar sesión',accept:'Crear mi cuenta',publicHelp:(name?:string)=>name?`El registro público está abierto para ${name}. Tu nueva cuenta quedará conectada con esta iglesia.`:'Cualquier persona interesada en el piloto puede crear una cuenta. No necesitas invitación.',closed:'El registro público no está disponible temporalmente. Los usuarios existentes todavía pueden iniciar sesión.',trouble:'¿No puedes entrar?',resetHelp:'Usa una opción abajo y abre solamente el correo más reciente que enviemos.',accountEmail:'Correo de tu cuenta',forgot:'Olvidé mi contraseña',resend:'Nunca confirmé mi correo',invalid:'Esa invitación anterior ya no está disponible, pero el registro público está abierto abajo.',english:'English',spanish:'Español',resetTip:'Usa esto si ya confirmaste tu cuenta pero olvidaste tu contraseña.',confirmTip:'Usa esto si creaste una cuenta pero nunca confirmaste tu correo.',emailTip:'Revisa Recibidos y Spam/Correo no deseado. Espera por lo menos un minuto antes de pedir otro correo.',step1:'Crea tu cuenta',step2:'Confirma el correo que enviamos',step3:'Regresa e inicia sesión',create:'Crear cuenta',signinTitle:'Iniciar sesión',newHere:'¿Eres nuevo?',returning:'¿Ya tienes una cuenta?'}
} as const

export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;message?:string;invite?:string;church?:string;lang?:string;mode?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en',t=copy[lang]
  const supabase=createPublicClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  let invite:any=null
  if(params.invite){const {data}=await supabase.rpc('get_invite_preview',{p_invite_id:params.invite});invite=Array.isArray(data)?data[0]:data}
  let publicStatus:any=null
  if(params.church){
    const {data}=await supabase.rpc('get_public_signup_status_for_church',{p_church_slug:params.church})
    publicStatus=Array.isArray(data)?data[0]:data
  }else{
    const {data}=await supabase.rpc('get_public_signup_status')
    publicStatus=Array.isArray(data)?data[0]:data
  }
  const publicOpen=Boolean(publicStatus?.open),validInvite=Boolean(invite?.valid),canCreate=validInvite||publicOpen
  const mode=params.mode==='signin'||!canCreate?'signin':'signup'
  const query=(nextMode:string,nextLang=lang)=>`/login?lang=${nextLang}&mode=${nextMode}${params.invite?`&invite=${encodeURIComponent(params.invite)}`:''}${params.church?`&church=${encodeURIComponent(params.church)}`:''}`
  const signupChurch=validInvite?invite?.church_name:publicStatus?.church_name

  return <main className="login-wrap"><div className="login card">
    <div className="row" style={{justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div className="pill">KINGDOM NETWORK • PILOT</div><div className="row" style={{gap:6}}><Link className="ghost" href={query(mode,'en')}>{t.english}</Link><Link className="ghost" href={query(mode,'es')}>{t.spanish}</Link></div></div>
    <h1>{signupChurch&&mode==='signup'?(lang==='es'?`Únete a ${signupChurch}`:`Join ${signupChurch}`):t.home}</h1><p className="muted">{t.homeBody}</p>
    {params.error&&<div className="notice error">{params.error}</div>}{params.message&&<div className="notice success">{params.message}</div>}
    {params.invite&&!validInvite&&<div className="notice">{t.invalid}</div>}

    <div className="row" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,margin:'18px 0'}}><Link className={mode==='signup'?'btn':'ghost'} href={query('signup')}>{t.create}</Link><Link className={mode==='signin'?'btn':'ghost'} href={query('signin')}>{t.signinTitle}</Link></div>

    {mode==='signup'&&canCreate&&<>
      <div className="notice success"><strong>{validInvite?(lang==='es'?`Invitación a ${invite.church_name}`:`Invitation to ${invite.church_name}`):(signupChurch?(lang==='es'?`REGISTRO ABIERTO • ${signupChurch}`:`OPEN SIGNUP • ${signupChurch}`):(lang==='es'?'REGISTRO ABIERTO':'OPEN SIGNUP'))}</strong><div className="small" style={{marginTop:4}}>{validInvite?(lang==='es'?'Esta invitación te conectará con tu iglesia.':'This invitation will connect you with your church.'):t.publicHelp(signupChurch)}</div></div>
      <div className="card" style={{padding:14,margin:'12px 0',background:'rgba(255,255,255,.025)'}}><strong>{t.step1}</strong><div className="small muted" style={{marginTop:5}}>{t.step2} → {t.step3}</div></div>
      <form action={signup}><input type="hidden" name="lang" value={lang}/>{validInvite&&<input type="hidden" name="invite_id" value={params.invite??''}/>} {!validInvite&&params.church&&<input type="hidden" name="church_slug" value={params.church}/>}<div className="row"><label className="field" style={{flex:1}}><span>{t.first}</span><input name="first_name" autoComplete="given-name" required/></label><label className="field" style={{flex:1}}><span>{t.last}</span><input name="last_name" autoComplete="family-name" required/></label></div><label className="field"><span>{t.email}</span><input name="email" type="email" inputMode="email" autoComplete="email" required/></label><label className="field"><span>{t.createPassword}</span><input name="password" type="password" minLength={8} autoComplete="new-password" required/></label><label className="field"><span>{t.again}</span><input name="confirm_password" type="password" minLength={8} autoComplete="new-password" required/></label><button className="btn" type="submit" style={{width:'100%'}}>{t.accept}</button></form>
      <p className="small muted" style={{textAlign:'center',marginTop:14}}>{t.returning} <Link href={query('signin')} style={{textDecoration:'underline'}}>{t.signIn}</Link></p>
    </>}

    {mode==='signin'&&<>
      <form action={login}><input type="hidden" name="lang" value={lang}/><label className="field"><span>{t.email}</span><input name="email" type="email" inputMode="email" autoComplete="email" required/></label><label className="field"><span>{t.password}</span><input name="password" type="password" autoComplete="current-password" required/></label><button className="btn" type="submit" style={{width:'100%'}}>{t.signIn}</button></form>
      {canCreate&&<p className="small muted" style={{textAlign:'center',marginTop:14}}>{t.newHere} <Link href={query('signup')} style={{textDecoration:'underline'}}>{t.create}</Link></p>}
      <details style={{marginTop:22,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.12)'}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t.trouble}</summary><p className="small muted">{t.resetHelp}</p><form><input type="hidden" name="lang" value={lang}/><label className="field"><span>{t.accountEmail}</span><input name="reset_email" type="email" inputMode="email" autoComplete="email" required/></label><div style={{display:'grid',gap:8}}><button className="btn secondary" formAction={requestPasswordReset}>{t.forgot}</button><div className="small muted">{t.resetTip}</div><button className="btn secondary" formAction={resendConfirmation}>{t.resend}</button><div className="small muted">{t.confirmTip}</div></div><div className="notice" style={{marginTop:12}}>{t.emailTip}</div></form></details>
    </>}
  </div></main>
}
