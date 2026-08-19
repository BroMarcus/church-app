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

  if(!tokenHash||!type){
    return NextResponse.redirect(new URL('/login?error=Unable%20to%20open%20that%20account%20link',siteUrl))
  }

  const verifyUrl=new URL('/auth/verify',siteUrl)
  verifyUrl.searchParams.set('token_hash',tokenHash)
  verifyUrl.searchParams.set('type',type)
  verifyUrl.searchParams.set('next',next)
  return NextResponse.redirect(verifyUrl)
}
