'use client'

import { useEffect,useState } from 'react'
import { PasswordField } from '@/components/password-field'
import { createClient } from '@/lib/supabase/client'

const copy={
  en:{opening:'Opening your secure reset link…',invalid:'This reset link is invalid or expired. Please request one fresh reset email.',choose:'Choose a new password below.',invalidBack:'This reset link is invalid or expired. Go back to Sign in and request one fresh reset email.',short:'Password must be at least 8 characters.',mismatch:'The two passwords do not match.',failed:'We could not update the password. Please request a fresh reset email and try again.',updated:'Password updated. Your old password will no longer work.',success:'Password updated. Continue to sign in with your new password.',title:'Reset your password',newPassword:'New password',again:'Type it again',showPassword:'Show password',hidePassword:'Hide password',updating:'Updating…',update:'Update password',continue:'Continue to sign in',back:'Back to sign in'},
  es:{opening:'Abriendo tu enlace seguro…',invalid:'Este enlace no es válido o ya venció. Solicita un correo nuevo para cambiar tu contraseña.',choose:'Escribe una contraseña nueva abajo.',invalidBack:'Este enlace no es válido o ya venció. Vuelve a Iniciar sesión y solicita un correo nuevo.',short:'La contraseña debe tener al menos 8 caracteres.',mismatch:'Las dos contraseñas no coinciden.',failed:'No pudimos cambiar la contraseña. Solicita un correo nuevo e inténtalo otra vez.',updated:'Contraseña actualizada. Tu contraseña anterior ya no funcionará.',success:'Contraseña actualizada. Continúa para iniciar sesión con tu nueva contraseña.',title:'Cambiar tu contraseña',newPassword:'Nueva contraseña',again:'Escríbela otra vez',showPassword:'Mostrar contraseña',hidePassword:'Ocultar contraseña',updating:'Actualizando…',update:'Actualizar contraseña',continue:'Continuar a Iniciar sesión',back:'Volver a Iniciar sesión'}
} as const

function diagnosticCode(error:unknown){
  if(error&&typeof error==='object'&&'code' in error)return String((error as {code?:unknown}).code||'unknown').slice(0,80)
  return error instanceof Error?error.name.slice(0,80):'unknown'
}

function safeJoinNext(value:string|null){
  if(!value||value.length>500||value.includes('\\'))return ''
  try{
    const base='https://kingdom.invalid'
    const parsed=new URL(value,base)
    if(parsed.origin!==base||!parsed.pathname.startsWith('/join/'))return ''
    return `${parsed.pathname}${parsed.search}`
  }catch{return ''}
}

export default function UpdatePasswordPage(){
  const [lang,setLang]=useState<'en'|'es'>('en')
  const [joinNext,setJoinNext]=useState('')
  const [ready,setReady]=useState(false)
  const [completed,setCompleted]=useState(false)
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [message,setMessage]=useState<string>(copy.en.opening)
  const [busy,setBusy]=useState(false)
  const t=copy[lang]

  useEffect(()=>{
    const supabase=createClient()
    let mounted=true
    const check=async()=>{
      const url=new URL(window.location.href)
      const nextLang=url.searchParams.get('lang')==='es'?'es':'en'
      const next=safeJoinNext(url.searchParams.get('next'))
      setLang(nextLang)
      setJoinNext(next)
      const c=copy[nextLang]
      setMessage(c.opening)
      try{
        const code=url.searchParams.get('code')
        if(code){
          const {error}=await supabase.auth.exchangeCodeForSession(code)
          if(error){
            console.error('password reset session exchange failed',{code:diagnosticCode(error)})
            if(mounted){setReady(false);setMessage(c.invalid)}
            return
          }
          url.searchParams.delete('code')
          window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`)
        }
        const {data,error}=await supabase.auth.getSession()
        if(error)console.error('password reset session lookup failed',{code:diagnosticCode(error)})
        if(!mounted)return
        if(data.session){setReady(true);setMessage(c.choose)}
        else{setReady(false);setMessage(c.invalidBack)}
      }catch(error){
        console.error('password reset initialization failed',{code:diagnosticCode(error)})
        if(mounted){setReady(false);setMessage(c.invalidBack)}
      }
    }
    void check()
    const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!mounted||completed)return
      if((event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')&&session){
        const url=new URL(window.location.href)
        const nextLang=url.searchParams.get('lang')==='es'?'es':'en'
        setLang(nextLang);setJoinNext(safeJoinNext(url.searchParams.get('next')));setReady(true);setMessage(copy[nextLang].choose)
      }
    })
    return()=>{mounted=false;listener.subscription.unsubscribe()}
  },[completed])

  async function save(e:React.FormEvent){
    e.preventDefault()
    if(password.length<8){setMessage(t.short);return}
    if(password!==confirm){setMessage(t.mismatch);return}
    setBusy(true)
    const supabase=createClient()
    try{
      const {error}=await supabase.auth.updateUser({password})
      if(error){
        console.error('password update failed',{code:diagnosticCode(error)})
        setMessage(t.failed)
        return
      }
      const {error:signOutError}=await supabase.auth.signOut()
      if(signOutError)console.error('post-reset sign out failed',{code:diagnosticCode(signOutError)})
      setPassword('')
      setConfirm('')
      setReady(false)
      setCompleted(true)
      setMessage(t.success)
    }catch(error){
      console.error('password update request failed',{code:diagnosticCode(error)})
      setMessage(t.failed)
    }finally{
      setBusy(false)
    }
  }

  const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
  const signInHref=`/login?lang=${lang}&mode=signin${nextPart}`
  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK</div><h1>{t.title}</h1><div className={`notice ${ready||completed?'success':'error'}`} role={completed?'status':'alert'} aria-live="polite">{message}</div>{ready&&!completed&&<form onSubmit={save}><PasswordField name="password" label={t.newPassword} minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required showLabel={t.showPassword} hideLabel={t.hidePassword}/><PasswordField name="confirm_password" label={t.again} minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required showLabel={t.showPassword} hideLabel={t.hidePassword}/><button className="btn" type="submit" disabled={busy}>{busy?t.updating:t.update}</button></form>}{completed?<p style={{marginTop:16}}><a className="btn" href={signInHref}>{t.continue}</a></p>:<p className="small muted" style={{marginTop:16}}><a href={signInHref}>{t.back}</a></p>}</div></main>
}