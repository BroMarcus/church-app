import { NextRequest,NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'
const MAX_AUTH_VALUE_LENGTH=1000
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TERMINAL_AUTH_LINK_CODES=new Set(['otp_expired','flow_state_expired','flow_state_not_found','invite_not_found'])
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
function exchangeFailureCode(error:unknown){
  const code=typeof error==='object'&&error&&'code' in error?boundedCode((error as {code?:unknown}).code):'unknown'
  // Supabase may use the same HTTP status (notably 403) for both expired OTPs and
  // unrelated Auth conditions. Only explicit terminal link codes are safe to call
  // expired/used; rate limits, service/config failures, and unknown errors stay retryable.
  return TERMINAL_AUTH_LINK_CODES.has(code)?'callback_expired':'callback_unavailable'
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
  const signupNext=safeSignupDestination(rawNext,signupFallback)
  const recoveryNext=`/auth/update-password?lang=${lang}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}`
  const loginError=(errorCode:string)=>NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}&error_code=${encodeURIComponent(errorCode)}`,siteUrl))
  const linkUnavailable=()=>NextResponse.redirect(new URL(`/auth/link-unavailable?lang=${lang}${inviteId?`&invite=${encodeURIComponent(inviteId)}`:''}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`,siteUrl))

  if(url.searchParams.get('invite')&&!inviteId)return loginError('invite_invalid')
  if(!code||code.length>MAX_AUTH_VALUE_LENGTH)return loginError('callback_incomplete')

  try{
    const supabase=await createClient()
    const {error}=await supabase.auth.exchangeCodeForSession(code)
    if(error){
      const failureCode=exchangeFailureCode(error)
      console.error('auth callback session exchange failed',{mode,code:boundedCode(error.code),status:typeof error.status==='number'?error.status:'unknown',classification:failureCode})
      return failureCode==='callback_expired'?loginError(failureCode):linkUnavailable()
    }

    if(mode==='signup'&&inviteId){
      const {data:redeemed,error:redeemError}=await supabase.rpc('redeem_invite_for_current_user',{p_invite_id:inviteId})
      const row=Array.isArray(redeemed)?redeemed[0]:redeemed
      if(redeemError||!row?.church_id){
        console.error('confirmed private invitation redemption failed',{code:redeemError?boundedCode(redeemError.code):'empty_redeem_result'})
        const {error:signOutError}=await supabase.auth.signOut({scope:'local'})
        if(signOutError){
          console.error('post-confirmation invite local sign out failed',{code:boundedCode(signOutError.code)})
          const {error:retrySignOutError}=await supabase.auth.signOut({scope:'local'})
          if(retrySignOutError){
            console.error('post-confirmation invite local sign out retry failed',{code:boundedCode(retrySignOutError.code)})
            return NextResponse.redirect(new URL(`/account/security?lang=${lang}&invite=${encodeURIComponent(inviteId)}&status=signout_failed`,siteUrl))
          }
        }
        return loginError('invite_redeem_failed')
      }
      return NextResponse.redirect(new URL(`/start?lang=${lang}&message_code=joined_invite`,siteUrl))
    }

    return NextResponse.redirect(new URL(mode==='recovery'?recoveryNext:signupNext,siteUrl))
  }catch(error){
    console.error('auth callback session exchange unavailable',{mode,code:boundedCode(error instanceof Error?error.name:'exchange_unavailable')})
    return linkUnavailable()
  }
}