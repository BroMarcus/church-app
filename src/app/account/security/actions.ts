'use server'

import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const JOIN_NEXT_MAX=500
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function safeInviteId(value:string){return value.length<=128&&INVITE_ID_PATTERN.test(value)?value:''}
function safeJoinNext(value:string){
  try{if(!value||value.length>JOIN_NEXT_MAX||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '';const base='https://kingdom.invalid',parsed=new URL(value,base);if(parsed.origin!==base||!parsed.pathname.startsWith('/join/'))return '';return `${parsed.pathname}${parsed.search}${parsed.hash}`}catch{return ''}
}
const contextPart=(next:string,invite:string)=>`${safeInviteId(invite)?`&invite=${encodeURIComponent(safeInviteId(invite))}`:''}${safeJoinNext(next)?`&next=${encodeURIComponent(safeJoinNext(next))}`:''}`
const securityUrl=(lang:string,extra='',next='',invite='')=>`/account/security?lang=${lang}${contextPart(next,invite)}${extra}`
const failureUrl=(lang:string,status:string,next='',invite='')=>securityUrl(lang,`&status=${encodeURIComponent(status)}`,next,invite)
const EMAIL_MAX=254
const PASSWORD_MAX=128
const safeAuthDiagnostic=(error:unknown)=>{if(!error||typeof error!=='object')return {kind:String(typeof error).slice(0,80)};const candidate=error as {code?:unknown;status?:unknown;name?:unknown};return {name:typeof candidate.name==='string'?candidate.name.slice(0,80):undefined,code:typeof candidate.code==='string'?candidate.code.slice(0,80):undefined,status:typeof candidate.status==='number'?candidate.status:undefined}}
type SupabaseServerClient=Awaited<ReturnType<typeof createClient>>

async function getSupabaseOrRedirect(lang:string,next='',invite=''){
  try{return await createClient()}
  catch(error){
    console.error('Account security client unavailable',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'auth_unavailable',next,invite))
  }
}

async function requireSignedIn(supabase:SupabaseServerClient,lang:string,next='',invite=''){
  let claimsResult
  try{claimsResult=await supabase.auth.getClaims()}
  catch(error){
    console.error('Account security auth state request unavailable',safeAuthDiagnostic(error))
    redirect(failureUrl(lang,'auth_unavailable',next,invite))
  }
  const {data:claims,error}=claimsResult
  if(error){console.error('Account security auth state unavailable',safeAuthDiagnostic(error));redirect(failureUrl(lang,'auth_unavailable',next,invite))}
  if(!claims?.claims?.sub)redirect(`/login?lang=${lang}&mode=signin${contextPart(next,invite)}`)
}

export async function changeLoginEmail(formData:FormData){
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next')),invite=safeInviteId(text(formData,'invite_id'))
  const supabase=await getSupabaseOrRedirect(lang,next,invite)
  await requireSignedIn(supabase,lang,next,invite)
  const email=text(formData,'email').toLowerCase()
  if(!email||email.length>EMAIL_MAX||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))redirect(failureUrl(lang,'email_invalid',next,invite))
  try{const result=await supabase.auth.updateUser({email});if(result.error){console.error('Account security email update failed',safeAuthDiagnostic(result.error));redirect(failureUrl(lang,'email_update_failed',next,invite))}}catch(error){console.error('Account security email update request failed',safeAuthDiagnostic(error));redirect(failureUrl(lang,'email_update_failed',next,invite))}
  redirect(securityUrl(lang,'&email=1',next,invite))
}

export async function changePassword(formData:FormData){
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next')),invite=safeInviteId(text(formData,'invite_id'))
  const supabase=await getSupabaseOrRedirect(lang,next,invite)
  await requireSignedIn(supabase,lang,next,invite)
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  if(password.length<12)redirect(failureUrl(lang,'password_short',next,invite))
  if(password.length>PASSWORD_MAX||confirm.length>PASSWORD_MAX)redirect(failureUrl(lang,'password_too_long',next,invite))
  if(password!==confirm)redirect(failureUrl(lang,'password_mismatch',next,invite))
  try{const result=await supabase.auth.updateUser({password});if(result.error){console.error('Account security password update failed',safeAuthDiagnostic(result.error));redirect(failureUrl(lang,'password_update_failed',next,invite))}}catch(error){console.error('Account security password update request failed',safeAuthDiagnostic(error));redirect(failureUrl(lang,'password_update_failed',next,invite))}
  redirect(securityUrl(lang,'&password=1',next,invite))
}

export async function signOutEverywhere(formData:FormData){
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next')),invite=safeInviteId(text(formData,'invite_id'))
  const supabase=await getSupabaseOrRedirect(lang,next,invite)
  try{const result=await supabase.auth.signOut({scope:'global'});if(result.error){console.error('Account security global sign-out failed',safeAuthDiagnostic(result.error));redirect(failureUrl(lang,'signout_failed',next,invite))}}catch(error){console.error('Account security global sign-out request failed',safeAuthDiagnostic(error));redirect(failureUrl(lang,'signout_failed',next,invite))}
  redirect(`/login?lang=${lang}&mode=signin${contextPart(next,invite)}`)
}