'use client'

import {useEffect} from 'react'
import {useSearchParams} from 'next/navigation'

const copy={
  en:{title:'We could not open this church page.',body:'Your account and church record were not changed. Check your connection, then try again. If it still does not open, ask your church leader for the newest join link.',retry:'Try again',signin:'Go to sign in'},
  es:{title:'No pudimos abrir esta página de la iglesia.',body:'No se cambió tu cuenta ni el registro de la iglesia. Revisa tu conexión e inténtalo otra vez. Si todavía no abre, pide a tu líder el enlace más reciente para unirte.',retry:'Intentar otra vez',signin:'Ir a Iniciar sesión'}
} as const

export default function ChurchJoinError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const params=useSearchParams()
  const lang=params.get('lang')==='es'?'es':'en'
  const t=copy[lang]
  useEffect(()=>{console.error('church join page failed',{message:error.message,digest:error.digest})},[error])
  return <main className="login-wrap"><div className="login card" role="alert" style={{maxWidth:620}}><div className="pill">KINGDOM NETWORK</div><h1>{t.title}</h1><p className="muted">{t.body}</p><div style={{display:'grid',gap:10,marginTop:18}}><button className="btn" type="button" onClick={reset}>{t.retry}</button><a className="ghost" href={`/login?lang=${lang}&mode=signin`} style={{textAlign:'center'}}>{t.signin}</a></div></div></main>
}