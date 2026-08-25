import { NextRequest,NextResponse } from 'next/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const MAX_AUTH_VALUE_LENGTH=1000
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const allowedTypes=new Set(['email','recovery','invite','magiclink','email_change'])

function safeInviteId(raw:string|null){
  return raw&&raw.length<=128&&INVITE_ID_PATTERN.test(raw)?raw:''
}

function safeLocalPath(raw:string|null){
  if(!raw||raw.length>MAX_AUTH_VALUE_LENGTH||!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\\'))return ''
  try{
    const canonical=new URL(siteUrl)
    const requested=new URL(raw,canonical)
    if(requested.origin!==canonical.origin)return ''
    return `${requested.pathname}${requested.search}${requested.hash}`
  }catch{
    return ''
  }
}

function safeJoinDestination(raw:string|null){
  const local=safeLocalPath(raw)
  if(!local)return ''
  try{
    const parsed=new URL(local,'https://kingdom.invalid')
    return parsed.pathname.startsWith('/join/')?local:''
  }catch{
    return ''
  }
}

function safeSignupDestination(raw:string|null,fallback:string){
  const local=safeLocalPath(raw)
  if(!local)return fallback
  try{
    const parsed=new URL(local,'https://kingdom.invalid')
    if(parsed.pathname==='/start'||parsed.pathname.startsWith('/join/'))return local
    return fallback
  }catch{
    return fallback
  }
}

function legacyRedirectContext(raw:string|null,fallback:string){
  const empty={inviteId:'',signupNext:'',recoveryNext:''}
  if(!raw||raw.length>MAX_AUTH_VALUE_LENGTH)return empty
  try{
    const canonical=new URL(siteUrl)
    const redirectTarget=new URL(raw,canonical)
    if(redirectTarget.origin!==canonical.origin)return empty

    if(redirectTarget.pathname==='/auth/callback'){
      const mode=redirectTarget.searchParams.get('mode')
      const inviteId=safeInviteId(redirectTarget.searchParams.get('invite'))
      if(mode==='recovery'){
        return {inviteId,signupNext:'',recoveryNext:safeJoinDestination(redirectTarget.searchParams.get('next'))}
      }
      if(mode==='signup'){
        return {inviteId,signupNext:safeSignupDestination(redirectTarget.searchParams.get('next'),fallback),recoveryNext:''}
      }
      return empty
    }

    if(redirectTarget.pathname==='/auth/update-password'){
      return {
        inviteId:safeInviteId(redirectTarget.searchParams.get('invite')),
        signupNext:'',
        recoveryNext:safeJoinDestination(redirectTarget.searchParams.get('next'))
      }
    }

    return empty
  }catch{
    return empty
  }
}

export async function GET(request:NextRequest){
  const {searchParams}=new URL(request.url)
  const tokenHash=searchParams.get('token_hash')
  const type=searchParams.get('type')
  const lang=searchParams.get('lang')==='es'?'es':'en'
  const rawNext=searchParams.get('next')
  const signupFallback=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const redirectContext=legacyRedirectContext(rawNext,signupFallback)
  const directJoinNext=safeJoinDestination(rawNext)
  const joinNext=directJoinNext||redirectContext.recoveryNext
  const explicitInviteRaw=searchParams.get('invite')
  const explicitInviteId=safeInviteId(explicitInviteRaw)
  const inviteId=explicitInviteId||redirectContext.inviteId
  const next=type==='recovery'?joinNext:(redirectContext.signupNext||safeSignupDestination(rawNext,signupFallback))

  if(explicitInviteRaw&&!explicitInviteId){
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    return NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin${nextPart}&error_code=invite_invalid`,siteUrl))
  }

  if(!tokenHash||tokenHash.length>MAX_AUTH_VALUE_LENGTH||!type||!allowedTypes.has(type)){
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
    return NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin${invitePart}${nextPart}&error_code=callback_incomplete`,siteUrl))
  }

  const verifyUrl=new URL('/auth/verify',siteUrl)
  verifyUrl.searchParams.set('token_hash',tokenHash)
  verifyUrl.searchParams.set('type',type)
  if(next)verifyUrl.searchParams.set('next',next)
  if(inviteId)verifyUrl.searchParams.set('invite',inviteId)
  verifyUrl.searchParams.set('lang',lang)
  return NextResponse.redirect(verifyUrl)
}