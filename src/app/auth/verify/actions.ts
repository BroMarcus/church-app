'use server'

import { redirect } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

function safeNext(raw:string){
  if(!raw)return '/'
  if(raw.startsWith('/')&&!raw.startsWith('//'))return raw
  try{
    const requested=new URL(raw)
    const canonical=new URL(siteUrl)
    if(requested.origin===canonical.origin)return `${requested.pathname}${requested.search}${requested.hash}`
  }catch{}
  return '/'
}

export async function verifyAuthLink(formData:FormData){
  const tokenHash=String(formData.get('token_hash')??'')
  const rawType=String(formData.get('type')??'')
  const next=safeNext(String(formData.get('next')??'/'))
  const allowedTypes:EmailOtpType[]=['email','recovery','invite','magiclink','email_change']
  if(!tokenHash||!allowedTypes.includes(rawType as EmailOtpType)){
    redirect('/login?error='+encodeURIComponent('This account link is incomplete or invalid. Please request a fresh email.'))
  }

  const supabase=await createClient()
  const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type:rawType as EmailOtpType})
  if(error){
    redirect('/login?error='+encodeURIComponent('This email link is expired or was already used. Please request one fresh email and use the newest link.'))
  }

  if(rawType==='recovery')redirect('/auth/update-password')
  if(next&&next!=='/')redirect(next)
  redirect('/login?message='+encodeURIComponent('Email confirmed. You can sign in now.'))
}
