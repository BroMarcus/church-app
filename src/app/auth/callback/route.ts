import { NextRequest,NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').slice(0,80)
const MAX_AUTH_VALUE_LENGTH=1000

function safeLocalPath(raw:string|null){
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

function safeJoinDestination(raw:string|null){
  const local=safeLocalPath(raw)
  if(!local)return ''
  try{
    const parsed=new URL(local,'https://kingdom.invalid')
    return parsed.pathname.startsWith('/join/')?local:''
  }catch{
    return ''
  }
}

function safeSignupDestination(raw:string|null,fallback:string){
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

export async function GET(request:NextRequest){
  const url=new URL(request.url)
  const code=url.searchParams.get('code')
  const lang=url.searchParams.get('lang')==='es'?'es':'en'
  const mode=url.searchParams.get('mode')==='recovery'?'recovery':'signup'
  const signupFallback=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const rawNext=url.searchParams.get('next')
  const joinNext=safeJoinDestination(rawNext)
  const next=mode==='recovery'
    ?`/auth/update-password?lang=${lang}${joinNext?`&next=${encodeURIComponent(joinNext)}`:''}`
    :safeSignupDestination(rawNext,signupFallback)
  const loginError=(errorCode:string)=>{
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    return NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin${nextPart}&error_code=${encodeURIComponent(errorCode)}`,siteUrl))
  }

  if(!code||code.length>MAX_AUTH_VALUE_LENGTH)return loginError('callback_incomplete')

  const supabase=await createClient()
  const {error}=await supabase.auth.exchangeCodeForSession(code)
  if(error){
    console.error('auth callback session exchange failed',{mode,code:boundedCode(error.code)})
    return loginError('callback_expired')
  }

  return NextResponse.redirect(new URL(next,siteUrl))
}
