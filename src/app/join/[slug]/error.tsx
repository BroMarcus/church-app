'use client'

import {useEffect} from 'react'
import {usePathname,useSearchParams} from 'next/navigation'

const copy={
  en:{title:'We could not open this church page.',body:'Your account and church record were not changed. Check your connection, then try again. If you already have a Kingdom Network account, keep using that same account—do not create another one.',retry:'Try this church link again',signin:'Sign in with my existing account'},
  es:{title:'No pudimos abrir esta página de la iglesia.',body:'No se cambió tu cuenta ni el registro de la iglesia. Revisa tu conexión e inténtalo otra vez. Si ya tienes una cuenta de Kingdom Network, sigue usando esa misma cuenta—no crees otra.',retry:'Intentar este enlace otra vez',signin:'Iniciar sesión con mi cuenta existente'}
} as const

const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'

export default function ChurchJoinError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const params=useSearchParams()
  const pathname=usePathname()
  const lang=params.get('lang')==='es'?'es':'en'
  const t=copy[lang]
  const next=pathname.startsWith('/join/')?`${pathname}?lang=${lang}`:''
  useEffect(()=>{console.error('church join page failed',{code:boundedCode(error.name),digest:boundedCode(error.digest)})},[error])
  return <main className="login-wrap"><div className="login card" role="alert" style={{maxWidth:620}}><div className="pill">KINGDOM NETWORK</div><h1>{t.title}</h1><p className="muted" style={{lineHeight:1.6}}>{t.body}</p><div style={{display:'grid',gap:10,marginTop:18}}><button className="btn" type="button" onClick={reset}>{t.retry}</button><a className="ghost" href={`/login?lang=${lang}&mode=signin${next?`&next=${encodeURIComponent(next)}`:''}`} style={{textAlign:'center'}}>{t.signin}</a></div></div></main>
}
