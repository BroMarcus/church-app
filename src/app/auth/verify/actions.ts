'use server'

import { redirect } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const MAX_AUTH_VALUE_LENGTH=1000
const allowedTypes:EmailOtpType[]=['email','recovery','invite','magiclink','email_change']

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

function isCertainInvalidLink(error:{status?:unknown}|null|undefined){
  const status=numericStatus(error?.status)
  return status>=400&&status<500&&status!==429
}

function verifyRetryUrl(tokenHash:string,rawType:string,lang:'en'|'es',joinNext:string){
  const query=new URLSearchParams({token_hash:tokenHash,type:rawType,lang,error_code:'verify_unavailable'})
  if(joinNext)query.set('next',joinNext)
  return `/auth/verify?${query.toString()}`
}

export async function verifyAuthLink(formData:FormData){
  const tokenHash=String(formData.get('token_hash')??'')
  const rawType=String(formData.get('type')??'')
  const lang=String(formData.get('lang')??'')==='es'?'es':'en'
  const rawNext=String(formData.get('next')??'')
  const joinNext=safeJoinDestination(rawNext)
  const signupFallback=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const next=rawType==='recovery'?joinNext:safeSignupDestination(rawNext,signupFallback)
  const loginBase=`/login?lang=${lang}&mode=signin${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`

  if(!tokenHash||tokenHash.length>MAX_AUTH_VALUE_LENGTH||!allowedTypes.includes(rawType as EmailOtpType)){
    redirect(`${loginBase}&error_code=callback_incomplete`)
  }

  const supabase=await createClient()
  try{
    const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type:rawType as EmailOtpType})
    if(error){
      const status=numericStatus((error as {status?:unknown}).status)
      console.error('auth token verification failed',{type:rawType,code:boundedCode(error.code),status:status||'unknown'})
      if(isCertainInvalidLink(error as {status?:unknown}))redirect(`${loginBase}&error_code=callback_expired`)
      redirect(verifyRetryUrl(tokenHash,rawType,lang,joinNext))
    }
  }catch(error){
    const candidate=error as {code?:unknown;status?:unknown}
    const status=numericStatus(candidate?.status)
    console.error('auth token verification unavailable',{type:rawType,code:boundedCode(candidate?.code),status:status||'unknown'})
    if(isCertainInvalidLink(candidate))redirect(`${loginBase}&error_code=callback_expired`)
    redirect(verifyRetryUrl(tokenHash,rawType,lang,joinNext))
  }

  if(rawType==='recovery'){
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    redirect(`/auth/update-password?lang=${lang}${nextPart}`)
  }
  redirect(next)
}
