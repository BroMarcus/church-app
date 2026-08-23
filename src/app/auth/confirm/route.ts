import { NextRequest,NextResponse } from 'next/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const MAX_AUTH_VALUE_LENGTH=1000
const allowedTypes=new Set(['email','recovery','invite','magiclink','email_change'])

function safeLocalPath(raw:string|null){
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
  const {searchParams}=new URL(request.url)
  const tokenHash=searchParams.get('token_hash')
  const type=searchParams.get('type')
  const lang=searchParams.get('lang')==='es'?'es':'en'
  const joinNext=safeJoinDestination(searchParams.get('next'))
  const signupFallback=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const next=type==='recovery'?joinNext:safeSignupDestination(searchParams.get('next'),signupFallback)

  if(!tokenHash||tokenHash.length>MAX_AUTH_VALUE_LENGTH||!type||!allowedTypes.has(type)){
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    return NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin${nextPart}&error_code=callback_incomplete`,siteUrl))
  }

  const verifyUrl=new URL('/auth/verify',siteUrl)
  verifyUrl.searchParams.set('token_hash',tokenHash)
  verifyUrl.searchParams.set('type',type)
  if(next)verifyUrl.searchParams.set('next',next)
  verifyUrl.searchParams.set('lang',lang)
  return NextResponse.redirect(verifyUrl)
}
