import { NextRequest,NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'
const MAX_AUTH_VALUE_LENGTH=1000
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function safeInviteId(raw:string|null){return raw&&raw.length<=128&&INVITE_ID_PATTERN.test(raw)?raw:''}

function safeLocalPath(raw:string|null){
  if(!raw||raw.length>MAX_AUTH_VALUE_LENGTH||!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\\'))return ''
  try{
    const canonical=new URL(siteUrl)
    const requested=new URL(raw,canonical)
    if(requested.origin!==canonical.origin)return ''
    return `${requested.pathname}${requested.search}${requested.hash}`
  }catch{return ''}
}
function safeJoinDestination(raw:string|null){
  const local=safeLocalPath(raw)
  if(!local)return ''
  try{return new URL(local,'https://kingdom.invalid').pathname.startsWith('/join/')?local:''}catch{return ''}
}
function safeSignupDestination(raw:string|null,fallback:string){
  const local=safeLocalPath(raw)
  if(!local)return fallback
  try{
    const parsed=new URL(local,'https://kingdom.invalid')
    return parsed.pathname==='/start'||parsed.pathname.startsWith('/join/')?local:fallback
  }catch{return fallback}
}

export async function GET(request:NextRequest){
  const url=new URL(request.url)
  const code=url.searchParams.get('code')
  const lang=url.searchParams.get('lang')==='es'?'es':'en'
  const mode=url.searchParams.get('mode')==='recovery'?'recovery':'signup'
  const inviteId=safeInviteId(url.searchParams.get('invite'))
  const signupFallback=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const rawNext=url.searchParams.get('next')
  const joinNext=safeJoinDestination(rawNext)
  const next=mode==='recovery'
    ?`/auth/update-password?lang=${lang}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}`
    :inviteId
      ?`/login?lang=${lang}&mode=signin&invite=${encodeURIComponent(inviteId)}&message_code=confirmation_ready_for_invite`
      :safeSignupDestination(rawNext,signupFallback)
  const loginError=(errorCode:string)=>NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}&error_code=${encodeURIComponent(errorCode)}`,siteUrl))

  if(url.searchParams.get('invite')&&!inviteId)return loginError('invite_invalid')
  if(!code||code.length>MAX_AUTH_VALUE_LENGTH)return loginError('callback_incomplete')
  const supabase=await createClient()
  const {error}=await supabase.auth.exchangeCodeForSession(code)
  if(error){console.error('auth callback session exchange failed',{mode,code:boundedCode(error.code)});return loginError('callback_expired')}
  return NextResponse.redirect(new URL(next,siteUrl))
}