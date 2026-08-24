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

function legacyCallbackContext(raw:string|null,fallback:string){
  if(!raw||raw.length>MAX_AUTH_VALUE_LENGTH)return {inviteId:'',next:''}
  try{
    const canonical=new URL(siteUrl)
    const callback=new URL(raw,canonical)
    if(callback.origin!==canonical.origin||callback.pathname!=='/auth/callback'||callback.searchParams.get('mode')==='recovery')return {inviteId:'',next:''}
    return {
      inviteId:safeInviteId(callback.searchParams.get('invite')),
      next:safeSignupDestination(callback.searchParams.get('next'),fallback)
    }
  }catch{
    return {inviteId:'',next:''}
  }
}

export async function GET(request:NextRequest){
  const {searchParams}=new URL(request.url)
  const tokenHash=searchParams.get('token_hash')
  const type=searchParams.get('type')
  const lang=searchParams.get('lang')==='es'?'es':'en'
  const rawNext=searchParams.get('next')
  const joinNext=safeJoinDestination(rawNext)
  const signupFallback=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const callbackContext=legacyCallbackContext(rawNext,signupFallback)
  const inviteId=safeInviteId(searchParams.get('invite'))||callbackContext.inviteId
  const next=type==='recovery'?joinNext:(callbackContext.next||safeSignupDestination(rawNext,signupFallback))

  if(searchParams.get('invite')&&!inviteId){
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