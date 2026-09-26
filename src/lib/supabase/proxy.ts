import { createServerClient } from '@supabase/ssr'
import { NextResponse,type NextRequest } from 'next/server'
import { SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL } from './config'

const publicAuthPrefixes=['/login','/auth']
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
  if(error&&typeof error==='object'&&'code' in error)return boundedCode((error as {code?:unknown}).code)
  if(error instanceof Error)return boundedCode(error.name)
  return boundedCode(fallback)
}

export async function updateSession(request:NextRequest){
  if(publicAuthPrefixes.some(prefix=>request.nextUrl.pathname===prefix||request.nextUrl.pathname.startsWith(prefix+'/'))){
    return NextResponse.next({request})
  }
  let response=NextResponse.next({request})
  try{
    const supabase=createServerClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{cookies:{
      getAll(){return request.cookies.getAll()},
      setAll(cookiesToSet){
        cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value))
        response=NextResponse.next({request})
        cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))
      }
    }})
    await supabase.auth.getClaims()
  }catch(error){
    // Session refresh is best-effort here. Route/page authorization and RLS remain
    // authoritative, so a temporary Auth/network failure must not crash the app shell.
    console.error('session refresh unavailable',{code:diagnosticCode(error,'session_refresh_unavailable')})
  }
  return response
}
