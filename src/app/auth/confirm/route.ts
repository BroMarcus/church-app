import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest,NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

function safeNext(raw:string|null){
  if(!raw)return '/'
  if(raw.startsWith('/')&&!raw.startsWith('//'))return raw
  try{
    const requested=new URL(raw)
    const canonical=new URL(siteUrl)
    if(requested.origin===canonical.origin)return `${requested.pathname}${requested.search}${requested.hash}`
  }catch{}
  return '/'
}

export async function GET(request:NextRequest){
  const {searchParams}=new URL(request.url)
  const tokenHash=searchParams.get('token_hash')
  const type=searchParams.get('type') as EmailOtpType|null
  const next=safeNext(searchParams.get('next'))

  if(tokenHash&&type){
    const supabase=await createClient()
    const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type})
    if(!error)return NextResponse.redirect(new URL(next,siteUrl))
  }

  return NextResponse.redirect(new URL('/login?error=Unable%20to%20confirm%20account',siteUrl))
}
