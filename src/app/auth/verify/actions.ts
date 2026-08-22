'use server'

import { redirect } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').slice(0,80)

function allowedAuthDestination(path:string){
  return path==='/start'||path.startsWith('/start?')||path.startsWith('/join/')||path==='/auth/update-password'||path.startsWith('/auth/update-password?')
}

function safeNext(raw:string,fallback:string){
  if(!raw)return fallback
  try{
    const canonical=new URL(siteUrl)
    const requested=new URL(raw,canonical)
    if(requested.origin!==canonical.origin)return fallback
    const local=`${requested.pathname}${requested.search}${requested.hash}`
    return allowedAuthDestination(local)?local:fallback
  }catch{
    return fallback
  }
}

export async function verifyAuthLink(formData:FormData){
  const tokenHash=String(formData.get('token_hash')??'')
  const rawType=String(formData.get('type')??'')
  const lang=String(formData.get('lang')??'')==='es'?'es':'en'
  const fallback=rawType==='recovery'?`/auth/update-password?lang=${lang}`:`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const next=safeNext(String(formData.get('next')??''),fallback)
  const joinNext=next.startsWith('/join/')?next:''
  const loginBase=`/login?lang=${lang}&mode=signin${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`
  const allowedTypes:EmailOtpType[]=['email','recovery','invite','magiclink','email_change']

  if(!tokenHash||!allowedTypes.includes(rawType as EmailOtpType)){
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
  if(next&&next!=='/')redirect(next)
  redirect(`${loginBase}&message_code=email_confirmed`)
}
