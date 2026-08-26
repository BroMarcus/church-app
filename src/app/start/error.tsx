'use client'

import {useEffect} from 'react'
import {useSearchParams} from 'next/navigation'

const copy={
  en:{title:'Your first steps could not load.',body:'Your account and progress were not changed. Check your connection and try again.',retry:'Try again',signin:'Go to sign in'},
  es:{title:'No pudimos cargar tus primeros pasos.',body:'No se cambió tu cuenta ni tu progreso. Revisa tu conexión e inténtalo otra vez.',retry:'Intentar otra vez',signin:'Ir a Iniciar sesión'}
} as const

export default function StartError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const params=useSearchParams()
  const lang=params.get('lang')==='es'?'es':'en'
  const t=copy[lang]
  useEffect(()=>{console.error('Start Here page failed',{message:error.message,digest:error.digest})},[error])
  return <main className="login-wrap"><div className="login card" role="alert" style={{maxWidth:620}}><div className="pill">START HERE • EMPIEZA AQUÍ</div><h1>{t.title}</h1><p className="muted">{t.body}</p><div style={{display:'grid',gap:10,marginTop:18}}><button className="btn" type="button" onClick={reset}>{t.retry}</button><a className="ghost" href={`/login?lang=${lang}&mode=signin`} style={{textAlign:'center'}}>{t.signin}</a></div></div></main>
}