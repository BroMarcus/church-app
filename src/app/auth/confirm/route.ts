import { NextRequest,NextResponse } from 'next/server'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

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
  const {searchParams}=new URL(request.url)
  const tokenHash=searchParams.get('token_hash')
  const type=searchParams.get('type')
  const lang=searchParams.get('lang')==='es'?'es':'en'
  const fallback=type==='recovery'?`/auth/update-password?lang=${lang}`:`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const next=safeNext(searchParams.get('next'),fallback)
  const joinNext=next.startsWith('/join/')?next:''

  if(!tokenHash||!type){
    const nextPart=joinNext?`&next=${encodeURIComponent(joinNext)}`:''
    return NextResponse.redirect(new URL(`/login?lang=${lang}&mode=signin${nextPart}&error_code=callback_incomplete`,siteUrl))
  }

  const verifyUrl=new URL('/auth/verify',siteUrl)
  verifyUrl.searchParams.set('token_hash',tokenHash)
  verifyUrl.searchParams.set('type',type)
  verifyUrl.searchParams.set('next',next)
  verifyUrl.searchParams.set('lang',lang)
  return NextResponse.redirect(verifyUrl)
}
