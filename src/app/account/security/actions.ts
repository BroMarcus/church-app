'use server'

import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const securityUrl=(lang:string,extra='')=>`/account/security?lang=${lang}${extra}`
const failureUrl=(lang:string,status:string)=>securityUrl(lang,`&status=${encodeURIComponent(status)}`)

const safeAuthDiagnostic=(error:unknown)=>{
  if(!error||typeof error!=='object')return {kind:typeof error}
  const candidate=error as {code?:unknown;status?:unknown;name?:unknown}
  return {
    name:typeof candidate.name==='string'?candidate.name:undefined,
    code:typeof candidate.code==='string'?candidate.code:undefined,
    status:typeof candidate.status==='number'?candidate.status:undefined,
  }
}

export async function changeLoginEmail(formData:FormData){
  const lang=langOf(formData),supabase=await createClient(),{data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub)redirect(`/login?lang=${lang}`)
  const email=text(formData,'email').toLowerCase()
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))redirect(failureUrl(lang,'email_invalid'))

  try{
    const {error}=await supabase.auth.updateUser({email})
    if(error){
      console.error('Account security email update failed',safeAuthDiagnostic(error))
      redirect(failureUrl(lang,'email_update_failed'))
    }
  }catch(error){
    console.error('Account security email update request failed',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'email_update_failed'))
  }
  redirect(securityUrl(lang,'&email=1'))
}

export async function changePassword(formData:FormData){
  const lang=langOf(formData),supabase=await createClient(),{data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub)redirect(`/login?lang=${lang}`)
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  if(password.length<12)redirect(failureUrl(lang,'password_short'))
  if(password!==confirm)redirect(failureUrl(lang,'password_mismatch'))

  try{
    const {error}=await supabase.auth.updateUser({password})
    if(error){
      console.error('Account security password update failed',safeAuthDiagnostic(error))
      redirect(failureUrl(lang,'password_update_failed'))
    }
  }catch(error){
    console.error('Account security password update request failed',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'password_update_failed'))
  }
  redirect(securityUrl(lang,'&password=1'))
}

export async function signOutEverywhere(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  try{
    const {error}=await supabase.auth.signOut({scope:'global'})
    if(error){
      console.error('Account security global sign-out failed',safeAuthDiagnostic(error))
      redirect(failureUrl(lang,'signout_failed'))
    }
  }catch(error){
    console.error('Account security global sign-out request failed',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'signout_failed'))
  }
  redirect(`/login?lang=${lang}&mode=signin`)
}
