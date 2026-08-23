'use server'

import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const securityUrl=(lang:string,extra='')=>`/account/security?lang=${lang}${extra}`
const failureUrl=(lang:string,status:string)=>securityUrl(lang,`&status=${encodeURIComponent(status)}`)
const EMAIL_MAX=254
const PASSWORD_MAX=128

const safeAuthDiagnostic=(error:unknown)=>{
  if(!error||typeof error!=='object')return {kind:String(typeof error).slice(0,80)}
  const candidate=error as {code?:unknown;status?:unknown;name?:unknown}
  return {
    name:typeof candidate.name==='string'?candidate.name.slice(0,80):undefined,
    code:typeof candidate.code==='string'?candidate.code.slice(0,80):undefined,
    status:typeof candidate.status==='number'?candidate.status:undefined,
  }
}

async function requireSignedIn(supabase:Awaited<ReturnType<typeof createClient>>,lang:string){
  const {data:claims,error}=await supabase.auth.getClaims()
  if(error){
    console.error('Account security auth state unavailable',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'auth_unavailable'))
  }
  if(!claims?.claims?.sub)redirect(`/login?lang=${lang}`)
}

export async function changeLoginEmail(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  await requireSignedIn(supabase,lang)
  const email=text(formData,'email').toLowerCase()
  if(!email||email.length>EMAIL_MAX||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))redirect(failureUrl(lang,'email_invalid'))

  let updateError:unknown=null
  try{
    const result=await supabase.auth.updateUser({email})
    updateError=result.error
  }catch(error){
    console.error('Account security email update request failed',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'email_update_failed'))
  }
  if(updateError){
    console.error('Account security email update failed',safeAuthDiagnostic(updateError))
    redirect(failureUrl(lang,'email_update_failed'))
  }
  redirect(securityUrl(lang,'&email=1'))
}

export async function changePassword(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  await requireSignedIn(supabase,lang)
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  if(password.length<12)redirect(failureUrl(lang,'password_short'))
  if(password.length>PASSWORD_MAX||confirm.length>PASSWORD_MAX)redirect(failureUrl(lang,'password_too_long'))
  if(password!==confirm)redirect(failureUrl(lang,'password_mismatch'))

  let updateError:unknown=null
  try{
    const result=await supabase.auth.updateUser({password})
    updateError=result.error
  }catch(error){
    console.error('Account security password update request failed',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'password_update_failed'))
  }
  if(updateError){
    console.error('Account security password update failed',safeAuthDiagnostic(updateError))
    redirect(failureUrl(lang,'password_update_failed'))
  }
  redirect(securityUrl(lang,'&password=1'))
}

export async function signOutEverywhere(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  let signOutError:unknown=null
  try{
    const result=await supabase.auth.signOut({scope:'global'})
    signOutError=result.error
  }catch(error){
    console.error('Account security global sign-out request failed',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'signout_failed'))
  }
  if(signOutError){
    console.error('Account security global sign-out failed',safeAuthDiagnostic(signOutError))
    redirect(failureUrl(lang,'signout_failed'))
  }
  redirect(`/login?lang=${lang}&mode=signin`)
}
