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
  en:{title:'We could not open this account link right now.',body:'This does not prove that your newest confirmation or password-reset link expired. Keep this page open and try it once more. If you already have a Kingdom Network account, keep using that same account.',retry:'Try this newest link again',signIn:'Return to Sign In',newEmail:'Do not request several new emails or create another account unless Kingdom Network specifically tells you the newest link expired.'},
  es:{title:'No pudimos abrir este enlace de cuenta en este momento.',body:'Esto no prueba que tu enlace de confirmación o cambio de contraseña más reciente haya vencido. Mantén esta página abierta e inténtalo una vez más. Si ya tienes una cuenta de Kingdom Network, sigue usando esa misma cuenta.',retry:'Intentar este enlace más reciente otra vez',signIn:'Volver a Iniciar sesión',newEmail:'No solicites varios correos nuevos ni crees otra cuenta a menos que Kingdom Network te diga específicamente que el enlace más reciente venció.'}
} as const

export default function VerifyError({reset}:{reset:()=>void}){
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
      <div className="notice" style={{marginTop:14}}><strong>{t.newEmail}</strong></div>
      <div style={{display:'grid',gap:10,marginTop:18}}>
        <button className="btn" type="button" onClick={()=>reset()}>{t.retry}</button>
        <a className="ghost" href={signInHref} style={{textAlign:'center'}}>{t.signIn}</a>
      </div>
    </div>
  </main>
}
