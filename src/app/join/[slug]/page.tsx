import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2,Church,Languages,ShieldCheck } from 'lucide-react'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL } from '@/lib/supabase/config'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { PasswordField } from '@/components/password-field'
import { joinChurch,joinExistingChurch } from './actions'
import { JoinSubmitButton } from './join-submit-button'

const NAME_MAX=80
const PHONE_MAX=40
const EMAIL_MAX=254
const PASSWORD_MAX=128
const SLUG_MAX=120
const safeChurchSlug=(value:string)=>{const slug=value.trim().toLowerCase();return slug.length<=SLUG_MAX&&/^[a-z0-9][a-z0-9_-]*$/.test(slug)?slug:''}

type Lang='en'|'es'
const copy={
  en:{join:'JOIN YOUR CHURCH',title:'Welcome to',body:'Create your account in about a minute. You do not need to fill out your whole profile today — Kingdom Network will help you one step at a time.',first:'First name',last:'Last name',phone:'Mobile phone (optional)',email:'Email',password:'Create password',confirm:'Type password again',showPassword:'Show password',hidePassword:'Hide password',updates:'Stay connected (optional)',emailOk:'I’m okay receiving church follow-up by email.',smsOk:'I’m okay receiving church follow-up by text message.',consent:'Only choose channels you actually want. You can change this later.',create:'Join & create my account',creating:'Creating your account…',existing:'Use my existing account',existingBody:'You’re already signed in. Keep this account and connect it to this church—no second account needed.',connecting:'Connecting your account…',signin:'Already have an account? Sign in',full:'Public signup is currently paused for this church.',remaining:'pilot spots remaining',next:'After signup',one:'Confirm your email',two:'Open Start Here',three:'Complete the rest when you are ready',private:'Your account connects to this church. Private Journey notes remain private unless you intentionally share something.',unavailable:'We could not safely check this church link right now. Nothing is wrong with your account. Try again in a moment. If you already have an account, do not create another one.',retry:'Try this church link again',signInAction:'Sign in with my existing account'},
  es:{join:'ÚNETE A TU IGLESIA',title:'Bienvenido a',body:'Crea tu cuenta en aproximadamente un minuto. No tienes que completar todo tu perfil hoy — Kingdom Network te ayudará paso a paso.',first:'Nombre',last:'Apellido',phone:'Teléfono móvil (opcional)',email:'Correo electrónico',password:'Crear contraseña',confirm:'Escribe la contraseña otra vez',showPassword:'Mostrar contraseña',hidePassword:'Ocultar contraseña',updates:'Mantente conectado (opcional)',emailOk:'Acepto recibir seguimiento de la iglesia por correo.',smsOk:'Acepto recibir seguimiento de la iglesia por mensaje de texto.',consent:'Marca solamente los canales que realmente quieres recibir. Puedes cambiar esto después.',create:'Unirme y crear mi cuenta',creating:'Creando tu cuenta…',existing:'Usar mi cuenta existente',existingBody:'Ya iniciaste sesión. Conserva esta cuenta y conéctala con esta iglesia—no necesitas otra cuenta.',connecting:'Conectando tu cuenta…',signin:'¿Ya tienes una cuenta? Inicia sesión',full:'El registro público está pausado para esta iglesia.',remaining:'lugares del piloto disponibles',next:'Después de registrarte',one:'Confirma tu correo',two:'Abre Empieza Aquí',three:'Completa lo demás cuando estés listo',private:'Tu cuenta se conecta con esta iglesia. Tus notas privadas de Mi Jornada permanecen privadas a menos que tú elijas compartir algo.',unavailable:'No pudimos verificar de forma segura este enlace de la iglesia en este momento. Tu cuenta no está dañada. Inténtalo otra vez en un momento. Si ya tienes una cuenta, no crees otra.',retry:'Intentar este enlace otra vez',signInAction:'Iniciar sesión con mi cuenta existente'}
} as const

type JoinCopy=(typeof copy)[Lang]
const joinErrors={
  en:{missing_church:'This church link is incomplete or no longer available. Ask your church leader for the newest link.',missing_name:'Enter your first and last name.',name_too_long:'Your first and last name must each be 80 characters or fewer.',missing_email:'Enter your email address.',invalid_email:'Enter a valid email address without extra spaces.',phone_too_long:'That phone number is too long. Enter only the phone number you use for church contact.',weak_password:'Your password must be at least 8 characters.',password_too_long:'That password is too long. Use 128 characters or fewer.',password_mismatch:'The passwords do not match. Type them again.',signup_status_unavailable:'We could not verify church signup right now. Do not create a second account. Try this link again in a moment.',signup_closed:'This church is not accepting public signups right now.',email_rate_limit:'Too many confirmation emails were requested. Wait about one minute, then try once more.',password_rejected:'We could not use that password. Use at least 8 characters and try again.',signup_failed:'We could not create your account right now. Check your email and password and try again.',capacity_full:'This church’s public pilot is currently full.',inactive_access:'Your previous access to this church is inactive. Ask a church administrator to restore it.',join_failed:'We could not connect your account to this church yet. Try again, or ask a church leader for help.'},
  es:{missing_church:'Este enlace de la iglesia está incompleto o ya no está disponible. Pide a tu líder el enlace más reciente.',missing_name:'Escribe tu nombre y apellido.',name_too_long:'Tu nombre y apellido deben tener 80 caracteres o menos cada uno.',missing_email:'Escribe tu correo electrónico.',invalid_email:'Escribe un correo electrónico válido y sin espacios adicionales.',phone_too_long:'Ese número de teléfono es demasiado largo. Escribe solamente el número que usas para contacto de la iglesia.',weak_password:'Tu contraseña debe tener por lo menos 8 caracteres.',password_too_long:'Esa contraseña es demasiado larga. Usa 128 caracteres o menos.',password_mismatch:'Las contraseñas no coinciden. Escríbelas otra vez.',signup_status_unavailable:'No pudimos verificar el registro de esta iglesia en este momento. No crees otra cuenta. Intenta este enlace otra vez en un momento.',signup_closed:'Esta iglesia no está aceptando registros públicos en este momento.',email_rate_limit:'Se solicitaron demasiados correos de confirmación. Espera aproximadamente un minuto e inténtalo una sola vez más.',password_rejected:'No pudimos usar esa contraseña. Usa por lo menos 8 caracteres e intenta nuevamente.',signup_failed:'No pudimos crear tu cuenta en este momento. Revisa tu correo y contraseña e inténtalo otra vez.',capacity_full:'El piloto público de esta iglesia está lleno en este momento.',inactive_access:'Tu acceso anterior a esta iglesia está inactivo. Pide a un administrador de la iglesia que lo restaure.',join_failed:'Todavía no pudimos conectar tu cuenta con esta iglesia. Inténtalo otra vez o pide ayuda a un líder.'}
} as const

const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'

function UnavailableState({t,slug,lang}:{t:JoinCopy;slug:string;lang:Lang}){
  return <main className="login-wrap"><div className="login card" style={{maxWidth:620}}><div className="row" style={{justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div className="pill">{t.join}</div><div className="row" style={{gap:6}}><Languages size={14}/><Link className="ghost" href={`/join/${encodeURIComponent(slug)}?lang=en`}>English</Link><Link className="ghost" href={`/join/${encodeURIComponent(slug)}?lang=es`}>Español</Link></div></div><div className="notice error" role="alert">{t.unavailable}</div><div style={{display:'grid',gap:10,marginTop:14}}><Link className="btn" href={`/join/${encodeURIComponent(slug)}?lang=${lang}`}>{t.retry}</Link><Link className="ghost" href={`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(`/join/${slug}?lang=${lang}`)}`}>{t.signInAction}</Link></div></div></main>
}

export default async function JoinChurchPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{lang?:string;error_code?:string}>}){
  const [{slug:rawSlug},query]=await Promise.all([params,searchParams])
  const slug=safeChurchSlug(rawSlug)
  if(!slug)notFound()
  const lang:Lang=query.lang==='es'?'es':'en',t=copy[lang]
  const statusError=(joinErrors[lang] as Record<string,string>)[query.error_code??'']||''
  const supabase=createPublicClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const {data,error:churchStatusError}=await supabase.rpc('get_public_signup_status_for_church',{p_church_slug:slug})
  if(churchStatusError){
    console.error('public church join status unavailable',{code:boundedCode(churchStatusError.code)})
    return <UnavailableState t={t} slug={slug} lang={lang}/>
  }
  const church:any=Array.isArray(data)?data[0]:data
  if(!church){
    console.error('public church join status returned no result',{churchSlug:slug,code:'empty_signup_status'})
    return <UnavailableState t={t} slug={slug} lang={lang}/>
  }
  if(!church.church_id)notFound()
  if(typeof church.open!=='boolean'){
    console.error('public church join status returned malformed result',{churchSlug:slug,code:'malformed_signup_status'})
    return <UnavailableState t={t} slug={slug} lang={lang}/>
  }
  const server=await createServerClient(),{data:claims,error:claimsError}=await server.auth.getClaims()
  if(claimsError){
    console.error('public church join auth state unavailable',{code:boundedCode(claimsError.code)})
    return <UnavailableState t={t} slug={slug} lang={lang}/>
  }
  const signedIn=Boolean(claims?.claims?.sub)
  const swap=(next:'en'|'es')=>`/join/${encodeURIComponent(slug)}?lang=${next}`
  return <main className="login-wrap"><div className="login card" style={{maxWidth:620}}>
    <div className="row" style={{justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div className="pill">{t.join}</div><div className="row" style={{gap:6}}><Languages size={14}/><Link className="ghost" href={swap('en')}>English</Link><Link className="ghost" href={swap('es')}>Español</Link></div></div>
    <div style={{textAlign:'center',margin:'16px 0 20px'}}><Church size={38}/><h1 style={{margin:'10px 0 5px'}}>{t.title} {church.church_name}</h1><p className="muted" style={{lineHeight:1.6}}>{t.body}</p>{church.remaining!=null&&<div className="pill" style={{display:'inline-flex',marginTop:8}}>{church.remaining} {t.remaining}</div>}</div>
    {statusError&&<div className="notice error" role="alert">{statusError}</div>}
    {signedIn?<div className="card" style={{padding:16,background:'rgba(255,255,255,.025)'}}><strong>{t.existing}</strong><p className="small muted" style={{lineHeight:1.55}}>{t.existingBody}</p><form action={joinExistingChurch}><input type="hidden" name="church_slug" value={slug}/><input type="hidden" name="lang" value={lang}/><JoinSubmitButton label={t.existing} workingLabel={t.connecting}/></form></div>:!church.open?<div className="notice"><strong>{t.full}</strong></div>:<form action={joinChurch} style={{display:'grid',gap:10}}><input type="hidden" name="church_slug" value={slug}/><input type="hidden" name="lang" value={lang}/><div className="row" style={{gap:10,flexWrap:'wrap'}}><label className="field" style={{flex:'1 1 180px'}}><span>{t.first}</span><input name="first_name" autoComplete="given-name" maxLength={NAME_MAX} required/></label><label className="field" style={{flex:'1 1 180px'}}><span>{t.last}</span><input name="last_name" autoComplete="family-name" maxLength={NAME_MAX} required/></label></div><label className="field"><span>{t.phone}</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={PHONE_MAX}/></label><label className="field"><span>{t.email}</span><input name="email" type="email" inputMode="email" autoComplete="email" maxLength={EMAIL_MAX} required/></label><div className="row" style={{gap:10,flexWrap:'wrap'}}><div style={{flex:'1 1 220px'}}><PasswordField name="password" label={t.password} showLabel={t.showPassword} hideLabel={t.hidePassword} minLength={8} maxLength={PASSWORD_MAX} autoComplete="new-password" required/></div><div style={{flex:'1 1 220px'}}><PasswordField name="confirm_password" label={t.confirm} showLabel={t.showPassword} hideLabel={t.hidePassword} minLength={8} maxLength={PASSWORD_MAX} autoComplete="new-password" required/></div></div><div className="card" style={{padding:14,background:'rgba(255,255,255,.025)'}}><strong>{t.updates}</strong><div style={{display:'grid',gap:8,marginTop:9}}><label className="row" style={{gap:8,alignItems:'flex-start'}}><input type="checkbox" name="email_consent"/><span className="small">{t.emailOk}</span></label><label className="row" style={{gap:8,alignItems:'flex-start'}}><input type="checkbox" name="sms_consent"/><span className="small">{t.smsOk}</span></label></div><div className="small muted" style={{marginTop:8}}>{t.consent}</div></div><JoinSubmitButton label={t.create} workingLabel={t.creating}/></form>}
    {!signedIn&&<Link className="ghost" href={`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(`/join/${slug}?lang=${lang}`)}`} style={{display:'block',textAlign:'center',marginTop:14}}>{t.signin}</Link>}
    <div className="card" style={{padding:14,marginTop:18,background:'rgba(255,255,255,.02)'}}><div className="pill">{t.next.toUpperCase()}</div><div style={{display:'grid',gap:7,marginTop:10}}><div className="row"><CheckCircle2 size={14}/><span className="small">1. {t.one}</span></div><div className="row"><CheckCircle2 size={14}/><span className="small">2. {t.two}</span></div><div className="row"><CheckCircle2 size={14}/><span className="small">3. {t.three}</span></div></div></div>
    <div className="small muted" style={{display:'flex',gap:7,alignItems:'flex-start',marginTop:14}}><ShieldCheck size={14}/><span>{t.private}</span></div>
  </div></main>
}