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

function browserLanguage(){
  if(typeof navigator==='undefined')return 'en' as const
  const languages=navigator.languages?.length?navigator.languages:[navigator.language]
  for(const raw of languages){
    const tag=(raw||'').toLowerCase()
    if(tag==='es'||tag.startsWith('es-'))return 'es' as const
    if(tag==='en'||tag.startsWith('en-'))return 'en' as const
  }
  return 'en' as const
}

const copy={
  en:{title:'Account recovery is temporarily unavailable.',body:'Your account was not changed. Keep using the same Kingdom Network account and try this recovery page again once.',retry:'Try recovery again',signIn:'Return to Sign In',join:'Return to church join page',same:'Do not create another account or request several new emails because of this temporary screen.'},
  es:{title:'La recuperación de cuenta no está disponible temporalmente.',body:'Tu cuenta no fue modificada. Sigue usando la misma cuenta de Kingdom Network e intenta esta página de recuperación una vez más.',retry:'Intentar recuperación otra vez',signIn:'Volver a Iniciar sesión',join:'Regresar a la página para unirte a la iglesia',same:'No crees otra cuenta ni solicites varios correos nuevos por esta pantalla temporal.'}
} as const

export default function LinkUnavailableError({reset}:{reset:()=>void}){
  const params=useSearchParams()
  const explicitLang=params.get('lang')
  const lang=explicitLang==='es'||explicitLang==='en'?explicitLang:browserLanguage()
  const inviteId=safeInviteId(params.get('invite'))
  const joinNext=safeJoinNext(params.get('next'))
  const t=copy[lang]
  const signInHref=`/login?lang=${lang}&mode=signin${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`

  return <main className="login-wrap">
    <div className="login card" role="alert" style={{maxWidth:620}}>
      <div className="pill">KINGDOM NETWORK</div>
      <h1>{t.title}</h1>
      <p className="muted" style={{lineHeight:1.6}}>{t.body}</p>
      <div className="notice" style={{marginTop:14}}><strong>{t.same}</strong></div>
      <div style={{display:'grid',gap:10,marginTop:18}}>
        <button className="btn" type="button" onClick={()=>reset()}>{t.retry}</button>
        <a className="ghost" href={signInHref} style={{textAlign:'center'}}>{t.signIn}</a>
        {joinNext&&<a className="ghost" href={joinNext} style={{textAlign:'center'}}>{t.join}</a>}
      </div>
    </div>
  </main>
}
