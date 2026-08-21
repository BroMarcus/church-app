'use client'

import {useEffect} from 'react'

export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{
    console.error('Kingdom Network root failed',{digest:error.digest??'unknown'})
  },[error])

  const goToSignIn=()=>{window.location.assign('/login?mode=signin')}

  return <html lang="en"><body style={{margin:0,fontFamily:'system-ui, sans-serif',background:'#f8fafc',color:'#111827'}}><main style={{maxWidth:760,margin:'0 auto',padding:'40px 18px 80px'}}><div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}><div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Kingdom Network</div><h1 style={{margin:'10px 0 8px'}}>Kingdom Network needs to reload / Kingdom Network necesita recargarse</h1><p style={{margin:'0 0 8px',color:'#4b5563',lineHeight:1.6}}>Your account and saved church information were not changed. Try reloading this screen. If it still does not open, return to Sign in.</p><p style={{margin:'0 0 18px',color:'#6b7280',lineHeight:1.6}}>Tu cuenta y la información guardada de tu iglesia no fueron modificadas. Intenta recargar esta pantalla. Si todavía no abre, vuelve a Iniciar sesión.</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>Reload / Recargar</button><button type="button" onClick={goToSignIn} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>Sign in / Iniciar sesión</button></div></div></main></body></html>
}
