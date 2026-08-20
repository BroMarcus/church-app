'use client'

import { useEffect,useState } from 'react'
import { useRouter } from 'next/navigation'
import { PasswordField } from '@/components/password-field'
import { createClient } from '@/lib/supabase/client'

const copy={
  en:{opening:'Opening your secure reset link…',invalid:'This reset link is invalid or expired. Please request one fresh reset email.',choose:'Choose a new password below.',invalidBack:'This reset link is invalid or expired. Go back to Sign in and request one fresh reset email.',short:'Password must be at least 8 characters.',mismatch:'The two passwords do not match.',failed:'We could not update the password. Please request a fresh reset email and try again.',updated:'Password updated. Taking you back to sign in…',success:'Password updated. Sign in with your new password.',title:'Reset your password',newPassword:'New password',again:'Type it again',showPassword:'Show password',hidePassword:'Hide password',updating:'Updating…',update:'Update password',back:'Back to sign in'},
  es:{opening:'Abriendo tu enlace seguro…',invalid:'Este enlace no es válido o ya venció. Solicita un correo nuevo para cambiar tu contraseña.',choose:'Escribe una contraseña nueva abajo.',invalidBack:'Este enlace no es válido o ya venció. Vuelve a Iniciar sesión y solicita un correo nuevo.',short:'La contraseña debe tener al menos 8 caracteres.',mismatch:'Las dos contraseñas no coinciden.',failed:'No pudimos cambiar la contraseña. Solicita un correo nuevo e inténtalo otra vez.',updated:'Contraseña actualizada. Volviendo a Iniciar sesión…',success:'Contraseña actualizada. Inicia sesión con tu nueva contraseña.',title:'Cambiar tu contraseña',newPassword:'Nueva contraseña',again:'Escríbela otra vez',showPassword:'Mostrar contraseña',hidePassword:'Ocultar contraseña',updating:'Actualizando…',update:'Actualizar contraseña',back:'Volver a Iniciar sesión'}
} as const

export default function UpdatePasswordPage(){
  const router=useRouter()
  const [lang,setLang]=useState<'en'|'es'>('en')
  const [ready,setReady]=useState(false)
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
      setLang(nextLang)
      const c=copy[nextLang]
      setMessage(c.opening)
      try{
        const code=url.searchParams.get('code')
        if(code){
          const {error}=await supabase.auth.exchangeCodeForSession(code)
          if(error){
            console.error('password reset session exchange failed',{message:error.message})
            if(mounted){setReady(false);setMessage(c.invalid)}
            return
          }
          url.searchParams.delete('code')
          window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`)
        }
        const {data,error}=await supabase.auth.getSession()
        if(error)console.error('password reset session lookup failed',{message:error.message})
        if(!mounted)return
        if(data.session){setReady(true);setMessage(c.choose)}
        else{setReady(false);setMessage(c.invalidBack)}
      }catch(error){
        console.error('password reset initialization failed',{message:error instanceof Error?error.message:String(error)})
        if(mounted){setReady(false);setMessage(c.invalidBack)}
      }
    }
    void check()
    const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!mounted)return
      if((event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')&&session){
        const nextLang=new URL(window.location.href).searchParams.get('lang')==='es'?'es':'en'
        setLang(nextLang);setReady(true);setMessage(copy[nextLang].choose)
      }
    })
    return()=>{mounted=false;listener.subscription.unsubscribe()}
  },[])

  async function save(e:React.FormEvent){
    e.preventDefault()
    if(password.length<8){setMessage(t.short);return}
    if(password!==confirm){setMessage(t.mismatch);return}
    setBusy(true)
    const supabase=createClient()
    try{
      const {error}=await supabase.auth.updateUser({password})
      if(error){
        console.error('password update failed',{message:error.message})
        setMessage(t.failed)
        return
      }
      setMessage(t.updated)
      const {error:signOutError}=await supabase.auth.signOut()
      if(signOutError)console.error('post-reset sign out failed',{message:signOutError.message})
      router.replace(`/login?lang=${lang}&message=${encodeURIComponent(t.success)}`)
    }catch(error){
      console.error('password update request failed',{message:error instanceof Error?error.message:String(error)})
      setMessage(t.failed)
    }finally{
      setBusy(false)
    }
  }

  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK</div><h1>{t.title}</h1><div className={`notice ${ready?'success':'error'}`} role="status" aria-live="polite">{message}</div>{ready&&<form onSubmit={save}><PasswordField name="password" label={t.newPassword} minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required showLabel={t.showPassword} hideLabel={t.hidePassword}/><PasswordField name="confirm_password" label={t.again} minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required showLabel={t.showPassword} hideLabel={t.hidePassword}/><button className="btn" type="submit" disabled={busy}>{busy?t.updating:t.update}</button></form>}<p className="small muted" style={{marginTop:16}}><a href={`/login?lang=${lang}&mode=signin`}>{t.back}</a></p></div></main>
}