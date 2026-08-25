'use client'

import {useSearchParams} from 'next/navigation'

const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeInviteId(value:string|null){
  return value&&value.length<=128&&INVITE_ID_PATTERN.test(value)?value:''
}

function safeJoinNext(value:string|null){
  if(!value||value.length>500||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return ''
  try{
    const base='https://kingdom.invalid'
    const parsed=new URL(value,base)
    if(parsed.origin!==base||!parsed.pathname.startsWith('/join/'))return ''
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }catch{return ''}
}

const copy={
  en:{title:'Password reset is temporarily unavailable.',body:'Your password was not changed by this screen. Keep using this same Kingdom Network account. Try this page again once. If the newest reset email still does not work, return to Sign In and use “Can’t get in?”',retry:'Try this reset again',signIn:'Return to Sign In',account:'Do not create another account.'},
  es:{title:'El cambio de contraseña no está disponible temporalmente.',body:'Esta pantalla no cambió tu contraseña. Sigue usando esta misma cuenta de Kingdom Network. Intenta esta página una vez más. Si el correo de cambio más reciente todavía no funciona, vuelve a Iniciar sesión y usa “¿No puedes entrar?”',retry:'Intentar este cambio otra vez',signIn:'Volver a Iniciar sesión',account:'No crees otra cuenta.'}
} as const

export default function UpdatePasswordError({reset}:{reset:()=>void}){
  const params=useSearchParams()
  const lang=params.get('lang')==='es'?'es':'en'
  const inviteId=safeInviteId(params.get('invite'))
  const joinNext=safeJoinNext(params.get('next'))
  const t=copy[lang]
  const signInHref=`/login?lang=${lang}&mode=signin${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`

  return <main className="login-wrap">
    <div className="login card" role="alert" style={{maxWidth:620}}>
      <div className="pill">KINGDOM NETWORK</div>
      <h1>{t.title}</h1>
      <p className="muted" style={{lineHeight:1.6}}>{t.body}</p>
      <div className="notice" style={{marginTop:14}}><strong>{t.account}</strong></div>
      <div style={{display:'grid',gap:10,marginTop:18}}>
        <button className="btn" type="button" onClick={()=>reset()}>{t.retry}</button>
        <a className="ghost" href={signInHref} style={{textAlign:'center'}}>{t.signIn}</a>
      </div>
    </div>
  </main>
}
