import Link from 'next/link'
import { verifyAuthLink } from './actions'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const MAX_AUTH_VALUE_LENGTH=1000
const allowedTypes=new Set(['email','recovery','invite','magiclink','email_change'])

function safeJoinNext(raw:string|undefined){
  if(!raw||raw.length>500||!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\\'))return ''
  try{
    const canonical=new URL(siteUrl)
    const requested=new URL(raw,canonical)
    if(requested.origin!==canonical.origin||!requested.pathname.startsWith('/join/'))return ''
    return `${requested.pathname}${requested.search}${requested.hash}`
  }catch{
    return ''
  }
}

const copy={
  en:{reset:'Reset your password',confirm:'Confirm your account',resetBody:'Tap continue to securely open the password reset form.',confirmBody:'Tap continue to securely confirm your email address.',invalid:'This account link is incomplete or invalid.',continueReset:'Continue password reset',confirmEmail:'Confirm email',fresh:'Please return to Sign in and request one fresh email.',security:'For your security, Kingdom Network does not complete one-time account links until you tap the button above.',back:'Back to sign in'},
  es:{reset:'Cambiar tu contraseña',confirm:'Confirmar tu cuenta',resetBody:'Toca Continuar para abrir de forma segura el formulario para cambiar tu contraseña.',confirmBody:'Toca Continuar para confirmar de forma segura tu correo electrónico.',invalid:'Este enlace está incompleto o no es válido.',continueReset:'Continuar para cambiar contraseña',confirmEmail:'Confirmar correo',fresh:'Vuelve a Iniciar sesión y solicita un correo nuevo.',security:'Por tu seguridad, Kingdom Network no completa enlaces de un solo uso hasta que toques el botón de arriba.',back:'Volver a Iniciar sesión'}
} as const

export default async function VerifyPage({searchParams}:{searchParams:Promise<{token_hash?:string;type?:string;next?:string;lang?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const validType=Boolean(params.type&&allowedTypes.has(params.type))
  const validToken=Boolean(params.token_hash&&params.token_hash.length<=MAX_AUTH_VALUE_LENGTH)
  const hasLink=validType&&validToken
  const isRecovery=params.type==='recovery'
  const joinNext=safeJoinNext(params.next)
  const backHref=`/login?lang=${lang}&mode=signin${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`

  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK</div><h1>{isRecovery?t.reset:t.confirm}</h1><p className="muted">{hasLink?(isRecovery?t.resetBody:t.confirmBody):t.invalid}</p>{hasLink?<form action={verifyAuthLink}><input type="hidden" name="token_hash" value={params.token_hash}/><input type="hidden" name="type" value={params.type}/><input type="hidden" name="next" value={joinNext}/><input type="hidden" name="lang" value={lang}/><button className="btn" type="submit">{isRecovery?t.continueReset:t.confirmEmail}</button></form>:<div className="notice error" role="alert">{t.fresh}</div>}<p className="small muted" style={{marginTop:16}}>{t.security}</p><p className="small muted" style={{marginTop:16}}><Link href={backHref}>{t.back}</Link></p></div></main>
}
