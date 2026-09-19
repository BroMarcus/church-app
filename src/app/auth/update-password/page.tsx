'use client'

import { useEffect,useState } from 'react'
import { PasswordField } from '@/components/password-field'
import { createClient } from '@/lib/supabase/client'

const copy={
  en:{opening:'Opening your secure reset link…',invalid:'This reset link is invalid or expired. Please request one fresh reset email.',choose:'Choose a new password below.',invalidBack:'This reset link is invalid or expired. Go back to Sign in and request one fresh reset email.',sessionUnavailable:'We could not safely check your reset session right now. Keep this page open and try again once. If it still does not work, return to Sign in and request one fresh reset email.',short:'Password must be at least 8 characters.',tooLong:'Password must be 128 characters or fewer.',mismatch:'The two passwords do not match.',failed:'We could not update the password right now. Keep this page open and try once more. If the reset link later expires, request one fresh reset email.',updated:'Password updated. Your old password will no longer work.',success:'Password updated. Continue to sign in with your new password.',signOutIncomplete:'Your password was updated, but we could not safely finish signing this browser out. Open Account Security, choose “Sign out everywhere,” then sign in again with your new password.',title:'Reset your password',newPassword:'New password',again:'Type it again',showPassword:'Show password',hidePassword:'Hide password',updating:'Updating…',update:'Update password',retry:'Try again',continue:'Continue to sign in',accountSecurity:'Open Account Security',back:'Back to sign in'},
  es:{opening:'Abriendo tu enlace seguro…',invalid:'Este enlace no es válido o ya venció. Solicita un correo nuevo para cambiar tu contraseña.',choose:'Escribe una contraseña nueva abajo.',invalidBack:'Este enlace no es válido o ya venció. Vuelve a Iniciar sesión y solicita un correo nuevo.',sessionUnavailable:'No pudimos verificar de forma segura tu sesión para cambiar la contraseña. Mantén esta página abierta e inténtalo una vez más. Si todavía no funciona, vuelve a Iniciar sesión y solicita un correo nuevo.',short:'La contraseña debe tener al menos 8 caracteres.',tooLong:'La contraseña debe tener 128 caracteres o menos.',mismatch:'Las dos contraseñas no coinciden.',failed:'No pudimos cambiar la contraseña en este momento. Mantén esta página abierta e inténtalo una vez más. Si después vence el enlace, solicita un correo nuevo.',updated:'Contraseña actualizada. Tu contraseña anterior ya no funcionará.',success:'Contraseña actualizada. Continúa para iniciar sesión con tu nueva contraseña.',signOutIncomplete:'Tu contraseña fue actualizada, pero no pudimos cerrar esta sesión del navegador de forma segura. Abre Seguridad de la Cuenta, elige “Cerrar sesión en todas partes” y luego inicia sesión otra vez con tu contraseña nueva.',title:'Cambiar tu contraseña',newPassword:'Nueva contraseña',again:'Escríbela otra vez',showPassword:'Mostrar contraseña',hidePassword:'Ocultar contraseña',updating:'Actualizando…',update:'Actualizar contraseña',retry:'Intentar otra vez',continue:'Continuar a Iniciar sesión',accountSecurity:'Abrir Seguridad de la Cuenta',back:'Volver a Iniciar sesión'}
} as const
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TERMINAL_AUTH_LINK_CODES=new Set(['otp_expired','flow_state_expired','flow_state_not_found','invite_not_found'])
function safeInviteId(value:string|null){return value&&value.length<=128&&INVITE_ID_PATTERN.test(value)?value:''}
function diagnosticCode(error:unknown){
  if(error&&typeof error==='object'&&'code' in error)return String((error as {code?:unknown}).code||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'
  return error instanceof Error?error.name.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown':'unknown'
}
function numericStatus(error:unknown){
  if(!error||typeof error!=='object'||!('status' in error))return 0
  const status=Number((error as {status?:unknown}).status)
  return Number.isInteger(status)&&status>=100&&status<=599?status:0
}
function isCertainInvalidRecoveryLink(error:unknown){return TERMINAL_AUTH_LINK_CODES.has(diagnosticCode(error))}
function safeJoinNext(value:string|null){
  if(!value||value.length>500||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return ''
  try{const base='https://kingdom.invalid',parsed=new URL(value,base);if(parsed.origin!==base||!parsed.pathname.startsWith('/join/'))return '';return `${parsed.pathname}${parsed.search}`}catch{return ''}
}
function preferredLanguage(params:URLSearchParams):'en'|'es'{
  const explicit=params.get('lang')
  if(explicit==='es')return 'es'
  if(explicit==='en')return 'en'
  return typeof navigator!=='undefined'&&navigator.language.toLowerCase().startsWith('es')?'es':'en'
}
function getBrowserSupabase(context:string){
  try{return createClient()}
  catch(error){console.error(`${context} client unavailable`,{code:diagnosticCode(error)});return null}
}
async function finishPostResetSignOut(supabase:ReturnType<typeof createClient>){
  for(let attempt=1;attempt<=2;attempt+=1){
    try{
      const {error}=await supabase.auth.signOut({scope:'local'})
      if(error){console.error('post-reset local sign out failed',{attempt,code:diagnosticCode(error)});continue}
      const verification=await supabase.auth.getSession()
      if(verification.error){console.error('post-reset sign out verification failed',{attempt,code:diagnosticCode(verification.error)});continue}
      if(!verification.data.session)return true
      console.error('post-reset session still present',{attempt,code:'session_still_present'})
    }catch(error){console.error('post-reset local sign out unavailable',{attempt,code:diagnosticCode(error)})}
  }
  return false
}

export default function UpdatePasswordPage(){
  const [lang,setLang]=useState<'en'|'es'>('en')
  const [joinNext,setJoinNext]=useState('')
  const [inviteId,setInviteId]=useState('')
  const [ready,setReady]=useState(false)
  const [completed,setCompleted]=useState(false)
  const [signOutIncomplete,setSignOutIncomplete]=useState(false)
  const [retryAvailable,setRetryAvailable]=useState(false)
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [message,setMessage]=useState<string>(copy.en.opening)
  const [busy,setBusy]=useState(false)
  const t=copy[lang]

  useEffect(()=>{
    let mounted=true
    const url=new URL(window.location.href),nextLang=preferredLanguage(url.searchParams),next=safeJoinNext(url.searchParams.get('next')),invite=safeInviteId(url.searchParams.get('invite'))
    setLang(nextLang);setJoinNext(next);setInviteId(invite)
    const c=copy[nextLang];setMessage(c.opening);setRetryAvailable(false)
    const supabase=getBrowserSupabase('password reset initialization')
    if(!supabase){setReady(false);setRetryAvailable(true);setMessage(c.sessionUnavailable);return()=>{mounted=false}}
    const check=async()=>{
      try{
        const code=url.searchParams.get('code')
        if(code){
          const {error}=await supabase.auth.exchangeCodeForSession(code)
          if(error){
            console.error('password reset session exchange failed',{code:diagnosticCode(error),status:numericStatus(error)||'unknown'})
            if(mounted){
              setReady(false)
              if(isCertainInvalidRecoveryLink(error)){setRetryAvailable(false);setMessage(c.invalidBack)}
              else{setRetryAvailable(true);setMessage(c.sessionUnavailable)}
            }
            return
          }
          url.searchParams.delete('code');window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`)
        }
        const {data,error}=await supabase.auth.getSession()
        if(error){console.error('password reset session lookup failed',{code:diagnosticCode(error)});if(mounted){setReady(false);setRetryAvailable(true);setMessage(c.sessionUnavailable)}return}
        if(!mounted)return
        if(data.session){setRetryAvailable(false);setReady(true);setMessage(c.choose)}else{setRetryAvailable(false);setReady(false);setMessage(c.invalidBack)}
      }catch(error){
        console.error('password reset initialization failed',{code:diagnosticCode(error),status:numericStatus(error)||'unknown'})
        if(mounted){
          setReady(false)
          if(isCertainInvalidRecoveryLink(error)){setRetryAvailable(false);setMessage(c.invalidBack)}
          else{setRetryAvailable(true);setMessage(c.sessionUnavailable)}
        }
      }
    }
    void check()
    const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{if(!mounted)return;if((event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')&&session){const nextUrl=new URL(window.location.href),listenerLang=preferredLanguage(nextUrl.searchParams);setLang(listenerLang);setJoinNext(safeJoinNext(nextUrl.searchParams.get('next')));setInviteId(safeInviteId(nextUrl.searchParams.get('invite')));setRetryAvailable(false);setReady(true);setMessage(copy[listenerLang].choose)}})
    return()=>{mounted=false;listener.subscription.unsubscribe()}
  },[])

  async function save(e:React.FormEvent){
    e.preventDefault();if(password.length<8){setMessage(t.short);return}if(password.length>128||confirm.length>128){setMessage(t.tooLong);return}if(password!==confirm){setMessage(t.mismatch);return}
    setBusy(true)
    const supabase=getBrowserSupabase('password update')
    if(!supabase){setMessage(t.failed);setBusy(false);return}
    try{
      const {data,error}=await supabase.auth.updateUser({password})
      if(error){console.error('password update failed',{code:diagnosticCode(error)});setMessage(t.failed);return}
      if(!data?.user){console.error('password update returned incomplete auth state',{code:'auth_state_missing'});setMessage(t.failed);return}
      setPassword('');setConfirm('');setReady(false);setCompleted(true)
      const signedOut=await finishPostResetSignOut(supabase)
      if(!signedOut){setSignOutIncomplete(true);setMessage(t.signOutIncomplete);return}
      setMessage(t.success)
    }catch(error){console.error('password update request failed',{code:diagnosticCode(error)});setMessage(t.failed)}finally{setBusy(false)}
  }

  const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const signInHref=`/login?lang=${lang}&mode=signin${invitePart}${nextPart}`
  const securityHref=`/account/security?lang=${lang}${invitePart}${nextPart}`
  const noticeTone=ready||(completed&&!signOutIncomplete)?'success':'error'
  return <main className="login-wrap"><div className="login card"><div className="pill">ONE KINGDOM</div><h1>{t.title}</h1><div className={`notice ${noticeTone}`} role={ready||completed&&!signOutIncomplete?'status':'alert'} aria-live="polite">{message}</div>{retryAvailable&&!completed&&<p style={{marginTop:16}}><button className="btn" type="button" onClick={()=>window.location.reload()}>{t.retry}</button></p>}{ready&&!completed&&<form onSubmit={save}><PasswordField name="password" label={t.newPassword} minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required showLabel={t.showPassword} hideLabel={t.hidePassword}/><PasswordField name="confirm_password" label={t.again} minLength={8} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required showLabel={t.showPassword} hideLabel={t.hidePassword}/><button className="btn" type="submit" disabled={busy} aria-disabled={busy} aria-busy={busy}><span aria-live="polite">{busy?t.updating:t.update}</span></button></form>}{completed?<p style={{marginTop:16}}><a className="btn" href={signOutIncomplete?securityHref:signInHref}>{signOutIncomplete?t.accountSecurity:t.continue}</a></p>:<p className="small muted" style={{marginTop:16}}><a href={signInHref}>{t.back}</a></p>}</div></main>
}
