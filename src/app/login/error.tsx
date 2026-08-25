'use client'

import {useSearchParams} from 'next/navigation'

const copy={
  en:{title:'Sign in is temporarily unavailable.',body:'Your account was not changed. Check your connection and try again. If you already have a Kingdom Network account, keep using that same account—do not create another one.',retry:'Try sign in again',home:'Go to Home'},
  es:{title:'El inicio de sesión no está disponible temporalmente.',body:'Tu cuenta no fue modificada. Revisa tu conexión e inténtalo otra vez. Si ya tienes una cuenta de Kingdom Network, sigue usando esa misma cuenta—no crees otra.',retry:'Intentar iniciar sesión otra vez',home:'Ir a Inicio'}
} as const

export default function LoginError({reset}:{reset:()=>void}){
  const params=useSearchParams()
  const lang=params.get('lang')==='es'?'es':'en'
  const t=copy[lang]
  return <main className="login-wrap">
    <div className="login card" role="alert" style={{maxWidth:620}}>
      <div className="pill">KINGDOM NETWORK</div>
      <h1>{t.title}</h1>
      <p className="muted" style={{lineHeight:1.6}}>{t.body}</p>
      <div style={{display:'grid',gap:10,marginTop:18}}>
        <button className="btn" type="button" onClick={()=>reset()}>{t.retry}</button>
        <a className="ghost" href={`/?lang=${lang}`} style={{textAlign:'center'}}>{t.home}</a>
      </div>
    </div>
  </main>
}
