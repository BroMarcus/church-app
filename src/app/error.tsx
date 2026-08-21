'use client'

import {useEffect} from 'react'

export default function HomeError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{
    console.error('Kingdom Network page failed',{digest:error.digest??'unknown'})
  },[error])

  return <main style={{maxWidth:760,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Kingdom Network</div>
      <h1 style={{margin:'10px 0 8px'}}>Something did not load / Algo no cargó</h1>
      <p style={{margin:'0 0 8px',color:'#4b5563',lineHeight:1.6}}>Your account, church information, and progress were not changed. Try again first. If the problem continues, return Home and open the page again.</p>
      <p style={{margin:'0 0 18px',color:'#6b7280',lineHeight:1.6}}>Tu cuenta, la información de tu iglesia y tu progreso no fueron modificados. Primero inténtalo otra vez. Si el problema continúa, vuelve a Inicio y abre la página de nuevo.</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>Try again / Intentar de nuevo</button>
        <a href="/" style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',display:'inline-flex',alignItems:'center',fontWeight:700,textDecoration:'none'}}>Home / Inicio</a>
        <a href="/login?mode=signin" style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',display:'inline-flex',alignItems:'center',fontWeight:700,textDecoration:'none'}}>Sign in / Iniciar sesión</a>
      </div>
    </div>
  </main>
}
