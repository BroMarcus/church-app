import { NextRequest,NextResponse } from 'next/server'

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
  const type=searchParams.get('type')
  const next=safeNext(searchParams.get('next'))
  const lang=searchParams.get('lang')==='es'?'es':'en'

  if(!tokenHash||!type){
    return NextResponse.redirect(new URL(`/login?lang=${lang}&error=${encodeURIComponent(lang==='es'?'No pudimos abrir ese enlace de cuenta. Solicita un correo nuevo.':'Unable to open that account link. Please request a fresh email.')}`,siteUrl))
  }

  const verifyUrl=new URL('/auth/verify',siteUrl)
  verifyUrl.searchParams.set('token_hash',tokenHash)
  verifyUrl.searchParams.set('type',type)
  verifyUrl.searchParams.set('next',next)
  verifyUrl.searchParams.set('lang',lang)
  return NextResponse.redirect(verifyUrl)
}
