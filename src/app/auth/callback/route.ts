import { NextRequest,NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').slice(0,80)

function allowedAuthDestination(path:string){
  return path==='/start'||path.startsWith('/start?')||path.startsWith('/join/')||path==='/auth/update-password'||path.startsWith('/auth/update-password?')
}

function safeNext(raw:string|null,fallback:string){
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

export async function GET(request:NextRequest){
  const url=new URL(request.url)
  const code=url.searchParams.get('code')
  const lang=url.searchParams.get('lang')==='es'?'es':'en'
  const mode=url.searchParams.get('mode')==='recovery'?'recovery':'signup'
  const fallback=mode==='recovery'?`/auth/update-password?lang=${lang}`:`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const next=safeNext(url.searchParams.get('next'),fallback)
  const joinNext=next.startsWith('/join/')?next:''
  const loginError=(errorCode:string)=>{
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    return NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin${nextPart}&error_code=${encodeURIComponent(errorCode)}`,siteUrl))
  }

  if(!code)return loginError('callback_incomplete')

  const supabase=await createClient()
  const {error}=await supabase.auth.exchangeCodeForSession(code)
  if(error){
    console.error('auth callback session exchange failed',{mode,code:boundedCode(error.code)})
    return loginError('callback_expired')
  }

  return NextResponse.redirect(new URL(next,siteUrl))
}
