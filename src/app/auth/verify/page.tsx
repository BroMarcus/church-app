import Link from 'next/link'
import { headers } from 'next/headers'
import { PendingSubmit } from '../../login/pending-submit'
import { verifyAuthLink } from './actions'
import { resolveLanguagePreference } from '@/lib/request-language'

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
  en:{
    reset:'Reset your password',confirm:'Confirm your account',magic:'Sign in securely',authInvite:'Accept your account invitation',emailChange:'Confirm your new login email',invalidTitle:'Account link needs attention',
    resetBody:'Tap continue to securely open the password reset form.',confirmBody:'Tap continue to securely confirm your email address.',magicBody:'Tap continue to securely sign in with this one-time link.',authInviteBody:'Tap continue to securely accept this account invitation.',emailChangeBody:'Tap continue to securely confirm your new login email.',invalid:'This account link is incomplete, unsupported, or invalid.',
    continueReset:'Continue password reset',confirmEmail:'Confirm email',continueMagic:'Continue secure sign in',continueInvite:'Accept invitation',continueEmailChange:'Confirm new login email',openingReset:'Opening secure reset…',confirmingEmail:'Confirming email…',openingMagic:'Signing in…',openingInvite:'Accepting invitation…',openingEmailChange:'Confirming new login email…',
    fresh:'Please return to Sign in and request one fresh email.',malformedInvite:'This church invitation link is incomplete or damaged. Do not request another account email or create another account because of this link. Sign in with your same account, or ask your church leader for the newest invitation.',unsupportedInviteContext:'This church invitation cannot be safely combined with this kind of account link. Do not create another account. Return to Sign in with the same account and use the newest church invitation separately.',
    security:'For your security, Kingdom Network does not complete one-time account links until you tap the button above. Tap it once and keep this page open while it finishes.',invalidSecurity:'For your security, Kingdom Network did not process this incomplete or unsupported account link.',back:'Back to sign in',temporary:'We could not verify this newest email link right now. The link was not confirmed as expired. Keep this page open and try the button again in a moment. Do not request several new emails unless this continues.',invite:'After your email is confirmed, Kingdom Network will safely connect this church invitation to this same account. Do not create another account.'
  },
  es:{
    reset:'Cambiar tu contraseña',confirm:'Confirmar tu cuenta',magic:'Iniciar sesión de forma segura',authInvite:'Aceptar tu invitación de cuenta',emailChange:'Confirmar tu nuevo correo de acceso',invalidTitle:'Este enlace de cuenta necesita atención',
    resetBody:'Toca Continuar para abrir de forma segura el formulario para cambiar tu contraseña.',confirmBody:'Toca Continuar para confirmar de forma segura tu correo electrónico.',magicBody:'Toca Continuar para iniciar sesión de forma segura con este enlace de un solo uso.',authInviteBody:'Toca Continuar para aceptar de forma segura esta invitación de cuenta.',emailChangeBody:'Toca Continuar para confirmar de forma segura tu nuevo correo de acceso.',invalid:'Este enlace de cuenta está incompleto, no es compatible o no es válido.',
    continueReset:'Continuar para cambiar contraseña',confirmEmail:'Confirmar correo',continueMagic:'Continuar inicio seguro',continueInvite:'Aceptar invitación',continueEmailChange:'Confirmar nuevo correo',openingReset:'Abriendo cambio seguro…',confirmingEmail:'Confirmando correo…',openingMagic:'Iniciando sesión…',openingInvite:'Aceptando invitación…',openingEmailChange:'Confirmando nuevo correo…',
    fresh:'Vuelve a Iniciar sesión y solicita un correo nuevo.',malformedInvite:'Este enlace de invitación de la iglesia está incompleto o dañado. No solicites otro correo de cuenta ni crees otra cuenta por este enlace. Inicia sesión con tu misma cuenta o pide a tu líder de la iglesia la invitación más reciente.',unsupportedInviteContext:'Esta invitación de la iglesia no se puede combinar de forma segura con este tipo de enlace de cuenta. No crees otra cuenta. Vuelve a Iniciar sesión con la misma cuenta y usa por separado la invitación más reciente de la iglesia.',
    security:'Por tu seguridad, Kingdom Network no completa enlaces de un solo uso hasta que toques el botón de arriba. Tócalo una sola vez y mantén esta página abierta mientras termina.',invalidSecurity:'Por tu seguridad, Kingdom Network no procesó este enlace de cuenta incompleto o no compatible.',back:'Volver a Iniciar sesión',temporary:'No pudimos verificar este enlace de correo más reciente en este momento. No se confirmó que haya vencido. Mantén esta página abierta e intenta el botón otra vez en un momento. No solicites varios correos nuevos a menos que esto continúe.',invite:'Después de confirmar tu correo, Kingdom Network conectará de forma segura esta invitación de la iglesia con esta misma cuenta. No crees otra cuenta.'
  }
} as const

export default async function VerifyPage({searchParams}:{searchParams:Promise<{token_hash?:string;type?:string;next?:string;invite?:string;lang?:string;error_code?:string}>}){
  const [params,requestHeaders]=await Promise.all([searchParams,headers()])
  const lang=resolveLanguagePreference(params.lang,requestHeaders.get('accept-language'))
  const t=copy[lang]
  const validType=Boolean(params.type&&allowedTypes.has(params.type))
  const validToken=Boolean(params.token_hash&&params.token_hash.length<=MAX_AUTH_VALUE_LENGTH)
  const inviteId=safeInviteId(params.invite)
  const inviteMalformed=Boolean(params.invite&&!inviteId)
  const inviteContextSupported=!inviteId||params.type==='email'||params.type==='recovery'
  const hasLink=validType&&validToken&&!inviteMalformed&&inviteContextSupported
  const isRecovery=params.type==='recovery'
  const isEmail=params.type==='email'
  const isMagic=params.type==='magiclink'
  const isAuthInvite=params.type==='invite'
  const isEmailChange=params.type==='email_change'
  const joinNext=safeJoinNext(params.next)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const backHref=`/login?lang=${lang}&mode=signin${invitePart}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`
  const temporaryUnavailable=params.error_code==='verify_unavailable'&&hasLink
  const title=!hasLink?t.invalidTitle:isRecovery?t.reset:isEmail?t.confirm:isMagic?t.magic:isAuthInvite?t.authInvite:isEmailChange?t.emailChange:t.invalidTitle
  const body=!hasLink?t.invalid:isRecovery?t.resetBody:isEmail?t.confirmBody:isMagic?t.magicBody:isAuthInvite?t.authInviteBody:isEmailChange?t.emailChangeBody:t.invalid
  const label=isRecovery?t.continueReset:isEmail?t.confirmEmail:isMagic?t.continueMagic:isAuthInvite?t.continueInvite:isEmailChange?t.continueEmailChange:t.confirmEmail
  const pending=isRecovery?t.openingReset:isEmail?t.confirmingEmail:isMagic?t.openingMagic:isAuthInvite?t.openingInvite:isEmailChange?t.openingEmailChange:t.confirmingEmail
  const invalidHelp=inviteMalformed?t.malformedInvite:inviteId&&!inviteContextSupported?t.unsupportedInviteContext:t.fresh

  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK</div><h1>{title}</h1><p className="muted">{body}</p>{inviteId&&isEmail&&<div className="notice success">{t.invite}</div>}{temporaryUnavailable&&<div className="notice error" role="alert">{t.temporary}</div>}{hasLink?<form action={verifyAuthLink}><input type="hidden" name="token_hash" value={params.token_hash}/><input type="hidden" name="type" value={params.type}/><input type="hidden" name="next" value={joinNext}/><input type="hidden" name="invite" value={inviteId}/><input type="hidden" name="lang" value={lang}/><PendingSubmit label={label} pendingLabel={pending}/></form>:<div className="notice error" role="alert">{invalidHelp}</div>}<p className="small muted" style={{marginTop:16}}>{hasLink?t.security:t.invalidSecurity}</p><p className="small muted" style={{marginTop:16}}><Link href={backHref}>{t.back}</Link></p></div></main>
}