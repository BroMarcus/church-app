import Link from 'next/link'
import { PendingSubmit } from '../../login/pending-submit'
import { verifyAuthLink } from './actions'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const MAX_AUTH_VALUE_LENGTH=1000
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const allowedTypes=new Set(['email','recovery','invite','magiclink','email_change'])

function safeInviteId(raw:string|undefined){
  return raw&&raw.length<=128&&INVITE_ID_PATTERN.test(raw)?raw:''
}

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
  en:{reset:'Reset your password',confirm:'Confirm your account',resetBody:'Tap continue to securely open the password reset form.',confirmBody:'Tap continue to securely confirm your email address.',invalid:'This account link is incomplete or invalid.',continueReset:'Continue password reset',confirmEmail:'Confirm email',openingReset:'Opening secure reset…',confirmingEmail:'Confirming email…',fresh:'Please return to Sign in and request one fresh email.',malformedInvite:'This church invitation link is incomplete or damaged. Do not request another account email or create another account because of this link. Sign in with your same account, or ask your church leader for the newest invitation.',security:'For your security, Kingdom Network does not complete one-time account links until you tap the button above. Tap it once and keep this page open while it finishes.',back:'Back to sign in',temporary:'We could not verify this newest email link right now. The link was not confirmed as expired. Keep this page open and try the button again in a moment. Do not request several new emails unless this continues.',invite:'After your email is confirmed, Kingdom Network will safely connect this church invitation to this same account. Do not create another account.'},
  es:{reset:'Cambiar tu contraseña',confirm:'Confirmar tu cuenta',resetBody:'Toca Continuar para abrir de forma segura el formulario para cambiar tu contraseña.',confirmBody:'Toca Continuar para confirmar de forma segura tu correo electrónico.',invalid:'Este enlace está incompleto o no es válido.',continueReset:'Continuar para cambiar contraseña',confirmEmail:'Confirmar correo',openingReset:'Abriendo cambio seguro…',confirmingEmail:'Confirmando correo…',fresh:'Vuelve a Iniciar sesión y solicita un correo nuevo.',malformedInvite:'Este enlace de invitación de la iglesia está incompleto o dañado. No solicites otro correo de cuenta ni crees otra cuenta por este enlace. Inicia sesión con tu misma cuenta o pide a tu líder de la iglesia la invitación más reciente.',security:'Por tu seguridad, Kingdom Network no completa enlaces de un solo uso hasta que toques el botón de arriba. Tócalo una sola vez y mantén esta página abierta mientras termina.',back:'Volver a Iniciar sesión',temporary:'No pudimos verificar este enlace de correo más reciente en este momento. No se confirmó que haya vencido. Mantén esta página abierta e intenta el botón otra vez en un momento. No solicites varios correos nuevos a menos que esto continúe.',invite:'Después de confirmar tu correo, Kingdom Network conectará de forma segura esta invitación de la iglesia con esta misma cuenta. No crees otra cuenta.'}
} as const

export default async function VerifyPage({searchParams}:{searchParams:Promise<{token_hash?:string;type?:string;next?:string;invite?:string;lang?:string;error_code?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const validType=Boolean(params.type&&allowedTypes.has(params.type))
  const validToken=Boolean(params.token_hash&&params.token_hash.length<=MAX_AUTH_VALUE_LENGTH)
  const inviteId=safeInviteId(params.invite)
  const inviteMalformed=Boolean(params.invite&&!inviteId)
  const hasLink=validType&&validToken&&!inviteMalformed
  const isRecovery=params.type==='recovery'
  const joinNext=safeJoinNext(params.next)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const backHref=`/login?lang=${lang}&mode=signin${invitePart}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`
  const temporaryUnavailable=params.error_code==='verify_unavailable'&&hasLink

  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK</div><h1>{isRecovery?t.reset:t.confirm}</h1><p className="muted">{hasLink?(isRecovery?t.resetBody:t.confirmBody):t.invalid}</p>{inviteId&&!isRecovery&&<div className="notice success">{t.invite}</div>}{temporaryUnavailable&&<div className="notice error" role="alert">{t.temporary}</div>}{hasLink?<form action={verifyAuthLink}><input type="hidden" name="token_hash" value={params.token_hash}/><input type="hidden" name="type" value={params.type}/><input type="hidden" name="next" value={joinNext}/><input type="hidden" name="invite" value={inviteId}/><input type="hidden" name="lang" value={lang}/><PendingSubmit label={isRecovery?t.continueReset:t.confirmEmail} pendingLabel={isRecovery?t.openingReset:t.confirmingEmail}/></form>:<div className="notice error" role="alert">{inviteMalformed?t.malformedInvite:t.fresh}</div>}<p className="small muted" style={{marginTop:16}}>{t.security}</p><p className="small muted" style={{marginTop:16}}><Link href={backHref}>{t.back}</Link></p></div></main>
}