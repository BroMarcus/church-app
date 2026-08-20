import { createServerClient } from '@supabase/ssr'
import { NextResponse,type NextRequest } from 'next/server'
import { SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL } from './config'

const publicAuthPrefixes=['/login','/auth/callback','/auth/confirm','/auth/verify','/auth/update-password']

export async function updateSession(request:NextRequest){
  if(publicAuthPrefixes.some(prefix=>request.nextUrl.pathname===prefix||request.nextUrl.pathname.startsWith(prefix+'/'))){
    return NextResponse.next({request})
  }
  let response=NextResponse.next({request})
  const supabase=createServerClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{cookies:{
    getAll(){return request.cookies.getAll()},
    setAll(cookiesToSet){
      cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value))
      response=NextResponse.next({request})
      cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))
    }
  }})
  await supabase.auth.getClaims()
  return response
}
