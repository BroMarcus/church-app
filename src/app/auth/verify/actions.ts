'use server'

import { redirect } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').slice(0,80)
const MAX_AUTH_VALUE_LENGTH=1000
const allowedTypes:EmailOtpType[]=['email','recovery','invite','magiclink','email_change']

function safeLocalPath(raw:string){
  if(!raw||raw.length>MAX_AUTH_VALUE_LENGTH||raw.includes('\\'))return ''
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
  const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type:rawType as EmailOtpType})
  if(error){
    console.error('auth token verification failed',{type:rawType,code:boundedCode(error.code)})
    redirect(`${loginBase}&error_code=callback_expired`)
  }

  if(rawType==='recovery'){
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    redirect(`/auth/update-password?lang=${lang}${nextPart}`)
  }
  redirect(next)
}
