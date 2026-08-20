import { NextRequest,NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

function safeNext(raw:string|null,fallback:string){
  if(!raw)return fallback
  if(raw.startsWith('/')&&!raw.startsWith('//'))return raw
  try{
    const requested=new URL(raw)
    const canonical=new URL(siteUrl)
    if(requested.origin===canonical.origin)return `${requested.pathname}${requested.search}${requested.hash}`
  }catch{}
  return fallback
}

export async function GET(request:NextRequest){
  const url=new URL(request.url)
  const code=url.searchParams.get('code')
  const lang=url.searchParams.get('lang')==='es'?'es':'en'
  const mode=url.searchParams.get('mode')==='recovery'?'recovery':'signup'
  const fallback=mode==='recovery'?`/auth/update-password?lang=${lang}`:`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const next=safeNext(url.searchParams.get('next'),fallback)
  const loginError=(message:string)=>NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin&error=${encodeURIComponent(message)}`,siteUrl))

  if(!code){
    return loginError(lang==='es'?'Ese enlace de correo está incompleto. Solicita un correo nuevo y abre el enlace más reciente.':'That email link is incomplete. Request one fresh email and open the newest link.')
  }

  const supabase=await createClient()
  const {error}=await supabase.auth.exchangeCodeForSession(code)
  if(error){
    return loginError(lang==='es'?'Ese enlace venció o ya fue usado. Solicita un correo nuevo y abre solamente el más reciente.':'That link expired or was already used. Request one fresh email and open only the newest link.')
  }

  return NextResponse.redirect(new URL(next,siteUrl))
}
