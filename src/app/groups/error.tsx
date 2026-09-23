'use client'

import Link from 'next/link'
import {useEffect} from 'react'
import {useSearchParams} from 'next/navigation'

export default function GroupsError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const params=useSearchParams(),es=params.get('lang')==='es'
  useEffect(()=>{console.error('Friendship Groups route failed',{digest:error?.digest})},[error])
  return <main style={{maxWidth:1100,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{es?'Grupos de Amistad':'Friendship Groups'}</div>
      <h1 style={{margin:'10px 0 8px'}}>{es?'No pudimos cargar tus grupos.':'We could not load your groups.'}</h1>
      <p style={{margin:'0 0 16px',color:'#6b7280'}}>{es?'Tus membresías y tu información de asistencia no fueron modificadas. Intenta otra vez; si el problema continúa, vuelve al inicio.':'Your memberships and attendance information were not changed. Try again; if the problem continues, return Home.'}</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{es?'Intentar de nuevo':'Try again'}</button><Link href={es?'/?lang=es':'/'} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,display:'inline-flex',alignItems:'center',textDecoration:'none'}}>{es?'Inicio':'Home'}</Link></div>
    </div>
  </main>
}
