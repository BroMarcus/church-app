import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveLanguagePreference } from '@/lib/request-language'

const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeInviteId(value:string|undefined){
  return value&&value.length<=128&&INVITE_ID_PATTERN.test(value)?value:''
}

function safeJoinNext(value:string|undefined){
  if(!value||value.length>500||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return ''
  try{
    const base='https://kingdom.invalid'
    const parsed=new URL(value,base)
    if(parsed.origin!==base||!parsed.pathname.startsWith('/join/'))return ''
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }catch{return ''}
}

const copy={
  en:{
    eyebrow:'ACCOUNT RECOVERY',
    title:'We could not verify that email link right now.',
    body:'This does not mean your newest link is expired or used. A temporary connection or account-service problem may have interrupted verification.',
    step1:'Wait a moment.',
    step2:'Open the newest confirmation or password-reset email again and use that same link once more.',
    step3:'Do not request another email unless Kingdom Network specifically tells you the newest link expired.',
    existing:'If you already have a Kingdom Network account, keep using that same account. Do not create a second one.',
    signIn:'Go to Sign In',
    join:'Return to church join page',
    help:'Need more help? Open Sign In and use “Can’t get in?” only if retrying the newest email still does not work.'
  },
  es:{
    eyebrow:'RECUPERACIÓN DE CUENTA',
    title:'No pudimos verificar ese enlace de correo en este momento.',
    body:'Esto no significa que tu enlace más reciente haya vencido o ya se haya usado. Un problema temporal de conexión o del servicio de cuentas pudo interrumpir la verificación.',
    step1:'Espera un momento.',
    step2:'Abre otra vez el correo de confirmación o cambio de contraseña más reciente y usa ese mismo enlace una vez más.',
    step3:'No solicites otro correo a menos que Kingdom Network te diga específicamente que el enlace más reciente venció.',
    existing:'Si ya tienes una cuenta de Kingdom Network, sigue usando esa misma cuenta. No crees una segunda cuenta.',
    signIn:'Ir a Iniciar sesión',
    join:'Regresar a la página para unirte a la iglesia',
    help:'¿Necesitas más ayuda? Abre Iniciar sesión y usa “¿No puedes entrar?” solamente si volver a intentar el correo más reciente todavía no funciona.'
  }
} as const

export default async function AuthLinkUnavailablePage({searchParams}:{searchParams:Promise<{lang?:string;invite?:string;next?:string}>}){
  const [params,requestHeaders]=await Promise.all([searchParams,headers()])
  const lang=resolveLanguagePreference(params.lang,requestHeaders.get('accept-language'))
  const t=copy[lang]
  const inviteId=safeInviteId(params.invite)
  const joinNext=safeJoinNext(params.next)
  const signInHref=`/login?lang=${lang}&mode=signin${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`

  return <main className="login-wrap"><section className="login card" aria-labelledby="auth-link-title">
    <div className="pill">{t.eyebrow}</div>
    <h1 id="auth-link-title">{t.title}</h1>
    <p className="muted">{t.body}</p>
    <div className="notice" role="status" aria-live="polite">
      <strong>{t.step1}</strong>
      <ol style={{margin:'10px 0 0',paddingLeft:22}}>
        <li>{t.step2}</li>
        <li style={{marginTop:8}}>{t.step3}</li>
      </ol>
    </div>
    <div className="notice" style={{marginTop:12}}><strong>{t.existing}</strong></div>
    <div style={{display:'grid',gap:10,marginTop:18}}>
      <Link className="btn" href={signInHref}>{t.signIn}</Link>
      {joinNext&&<Link className="ghost" href={joinNext}>{t.join}</Link>}
    </div>
    <p className="small muted" style={{marginTop:16}}>{t.help}</p>
  </section></main>
}