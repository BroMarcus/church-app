'use server'

import { redirect } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const MAX_AUTH_VALUE_LENGTH=1000
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const allowedTypes:EmailOtpType[]=['email','recovery','invite','magiclink','email_change']
const TERMINAL_AUTH_LINK_CODES=new Set(['otp_expired','flow_state_expired','flow_state_not_found','invite_not_found'])

function safeInviteId(raw:string){return raw&&raw.length<=128&&INVITE_ID_PATTERN.test(raw)?raw:''}

function safeLocalPath(raw:string){
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

function safeJoinDestination(raw:string){
  const local=safeLocalPath(raw)
  if(!local)return ''
  try{
    const parsed=new URL(local,'https://kingdom.invalid')
    return parsed.pathname.startsWith('/join/')?local:''
  }catch{
    return ''
  }
}

function safeSignupDestination(raw:string,fallback:string){
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

function numericStatus(value:unknown){
  const status=Number(value)
  return Number.isInteger(status)&&status>=100&&status<=599?status:0
}

function isCertainInvalidLink(error:{code?:unknown}|null|undefined){
  return TERMINAL_AUTH_LINK_CODES.has(boundedCode(error?.code))
}

function verifyRetryUrl(tokenHash:string,rawType:string,lang:'en'|'es',joinNext:string,inviteId:string){
  const query=new URLSearchParams({token_hash:tokenHash,type:rawType,lang,error_code:'verify_unavailable'})
  if(joinNext)query.set('next',joinNext)
  if(inviteId)query.set('invite',inviteId)
  return `/auth/verify?${query.toString()}`
}

export async function verifyAuthLink(formData:FormData){
  const tokenHash=String(formData.get('token_hash')??'')
  const rawType=String(formData.get('type')??'')
  const lang=String(formData.get('lang')??'')==='es'?'es':'en'
  const rawNext=String(formData.get('next')??'')
  const rawInviteId=String(formData.get('invite')??'')
  const inviteId=safeInviteId(rawInviteId)
  const joinNext=safeJoinDestination(rawNext)
  const signupFallback=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const next=rawType==='recovery'?joinNext:safeSignupDestination(rawNext,signupFallback)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const loginBase=`/login?lang=${lang}&mode=signin${invitePart}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`

  if(rawInviteId&&!inviteId)redirect(`${loginBase}&error_code=invite_invalid`)
  if(!tokenHash||tokenHash.length>MAX_AUTH_VALUE_LENGTH||!allowedTypes.includes(rawType as EmailOtpType)){
    redirect(`${loginBase}&error_code=callback_incomplete`)
  }

  let supabase:Awaited<ReturnType<typeof createClient>>
  try{
    supabase=await createClient()
  }catch(error){
    console.error('auth token verification client unavailable',{code:boundedCode(error instanceof Error?error.name:'client_unavailable')})
    redirect(verifyRetryUrl(tokenHash,rawType,lang,joinNext,inviteId))
  }

  let verificationFailure:{code?:unknown;status?:unknown}|null=null
  let failureWasThrown=false
  let verifiedAuthState:{session?:unknown;user?:unknown}|null=null
  try{
    const {data,error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type:rawType as EmailOtpType})
    if(error)verificationFailure=error as {code?:unknown;status?:unknown}
    else verifiedAuthState=data
  }catch(error){
    verificationFailure=error as {code?:unknown;status?:unknown}
    failureWasThrown=true
  }

  if(verificationFailure){
    const status=numericStatus(verificationFailure.status)
    console.error(failureWasThrown?'auth token verification unavailable':'auth token verification failed',{type:rawType,code:boundedCode(verificationFailure.code),status:status||'unknown'})
    if(isCertainInvalidLink(verificationFailure))redirect(`${loginBase}&error_code=callback_expired`)
    redirect(verifyRetryUrl(tokenHash,rawType,lang,joinNext,inviteId))
  }

  if(!verifiedAuthState?.session||!verifiedAuthState.user){
    console.error('auth token verification returned incomplete auth state',{type:rawType,code:'auth_state_missing'})
    redirect(verifyRetryUrl(tokenHash,rawType,lang,joinNext,inviteId))
  }

  if(rawType==='recovery'){
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    redirect(`/auth/update-password?lang=${lang}${nextPart}${invitePart}`)
  }

  if(rawType==='email'&&inviteId){
    let redeemFailed=false
    try{
      const {data:redeemed,error:redeemError}=await supabase.rpc('redeem_invite_for_current_user',{p_invite_id:inviteId})
      const row=Array.isArray(redeemed)?redeemed[0]:redeemed
      if(redeemError||!row?.church_id){
        redeemFailed=true
        console.error('verified token-hash private invitation redemption failed',{code:redeemError?boundedCode(redeemError.code):'empty_redeem_result'})
      }
    }catch(error){
      redeemFailed=true
      console.error('verified token-hash private invitation redemption unavailable',{code:boundedCode(error instanceof Error?error.name:'invite_redeem_unavailable')})
    }

    if(redeemFailed){
      let cleanupSucceeded=false
      for(let attempt=1;attempt<=2&&!cleanupSucceeded;attempt+=1){
        try{
          const {error:signOutError}=await supabase.auth.signOut({scope:'local'})
          if(signOutError){
            console.error('post-token-hash invite local sign out failed',{attempt,code:boundedCode(signOutError.code)})
            continue
          }
          let verification
          try{verification=await supabase.auth.getSession()}
          catch(error){
            console.error('post-token-hash invite local sign out verification unavailable',{attempt,code:boundedCode(error instanceof Error?error.name:'session_check_unavailable')})
            continue
          }
          if(verification.error){
            console.error('post-token-hash invite local sign out verification failed',{attempt,code:boundedCode(verification.error.code)})
            continue
          }
          if(!verification.data.session)cleanupSucceeded=true
          else console.error('post-token-hash invite local session still present after sign out',{attempt,code:'session_still_present'})
        }catch(error){
          console.error('post-token-hash invite local sign out unavailable',{attempt,code:boundedCode(error instanceof Error?error.name:'signout_unavailable')})
        }
      }
      if(!cleanupSucceeded)redirect(`/account/security?lang=${lang}&invite=${encodeURIComponent(inviteId)}&status=signout_failed`)
      redirect(`${loginBase}&error_code=invite_redeem_failed`)
    }

    redirect(`/start?lang=${lang}&message_code=joined_invite`)
  }

  redirect(next)
}