'use client'

import { useEffect,useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage(){
  const router=useRouter()
  const [ready,setReady]=useState(false)
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [message,setMessage]=useState('Opening your secure reset link…')
  const [busy,setBusy]=useState(false)

  useEffect(()=>{
    const supabase=createClient()
    let mounted=true
    const check=async()=>{
      const {data}=await supabase.auth.getSession()
      if(!mounted)return
      if(data.session){setReady(true);setMessage('Choose a new password below.')}
      else setMessage('This reset link is invalid or expired. Go back to Sign in and request a new one.')
    }
    check()
    const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!mounted)return
      if((event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')&&session){setReady(true);setMessage('Choose a new password below.')}
    })
    return()=>{mounted=false;listener.subscription.unsubscribe()}
  },[])

  async function save(e:React.FormEvent){
    e.preventDefault()
    if(password.length<8){setMessage('Password must be at least 8 characters.');return}
    if(password!==confirm){setMessage('The two passwords do not match.');return}
    setBusy(true)
    const supabase=createClient()
    const {error}=await supabase.auth.updateUser({password})
    if(error){setMessage(error.message);setBusy(false);return}
    setMessage('Password updated. Taking you back to sign in…')
    await supabase.auth.signOut()
    router.replace('/login?message='+encodeURIComponent('Password updated. Sign in with your new password.'))
  }

  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK</div><h1>Reset your password</h1><div className={`notice ${ready?'success':'error'}`}>{message}</div>{ready&&<form onSubmit={save}><label className="field"><span>New password</span><input type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><label className="field"><span>Type it again</span><input type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label><button className="btn" disabled={busy}>{busy?'Updating…':'Update password'}</button></form>}<p className="small muted" style={{marginTop:16}}><a href="/login">Back to sign in</a></p></div></main>
}
