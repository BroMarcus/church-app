'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
  if(typeof error==='object'&&error&&'code' in error)return boundedCode((error as {code?:unknown}).code)
  if(error instanceof Error)return boundedCode(error.name)
  return boundedCode(fallback)
}
const failureMessage=(lang:'en'|'es')=>lang==='es'
  ? 'No pudimos guardar ese paso de forma segura. No se borró nada. Inténtalo otra vez.'
  : 'We could not safely save that step. Nothing was removed. Please try again.'

export async function completeOnboarding(formData:FormData){
  const lang:String=String(formData.get('lang')??'')
  const selectedLang:'en'|'es'=lang==='es'?'es':'en'
  let supabase
  try{supabase=await createClient()}
  catch(error){
    console.error('start onboarding client unavailable',{code:diagnosticCode(error,'client_unavailable')})
    redirect(`/start?lang=${selectedLang}&error=${encodeURIComponent(failureMessage(selectedLang))}`)
  }

  let authResult
  try{authResult=await supabase.auth.getUser()}
  catch(error){
    console.error('start onboarding auth transport unavailable',{code:diagnosticCode(error,'auth_unavailable')})
    redirect(`/start?lang=${selectedLang}&error=${encodeURIComponent(failureMessage(selectedLang))}`)
  }
  const {data:{user},error:authError}=authResult
  if(authError){
    console.error('start onboarding auth unavailable',{code:boundedCode(authError.code)})
    redirect(`/start?lang=${selectedLang}&error=${encodeURIComponent(failureMessage(selectedLang))}`)
  }
  if(!user)redirect(`/login?lang=${selectedLang}&mode=signin`)

  let updateResult
  try{updateResult=await supabase.auth.updateUser({data:{...user.user_metadata,onboarding_completed:true,preferred_language:selectedLang}})}
  catch(error){
    console.error('start onboarding save transport unavailable',{code:diagnosticCode(error,'onboarding_save_unavailable')})
    redirect(`/start?lang=${selectedLang}&error=${encodeURIComponent(failureMessage(selectedLang))}`)
  }
  if(updateResult.error){
    console.error('start onboarding save failed',{code:boundedCode(updateResult.error.code)})
    redirect(`/start?lang=${selectedLang}&error=${encodeURIComponent(failureMessage(selectedLang))}`)
  }
  const updatedUser=updateResult.data?.user
  if(!updatedUser||updatedUser.id!==user.id||updatedUser.user_metadata?.onboarding_completed!==true||updatedUser.user_metadata?.preferred_language!==selectedLang){
    console.error('start onboarding save returned incomplete state',{code:'onboarding_state_unconfirmed'})
    redirect(`/start?lang=${selectedLang}&error=${encodeURIComponent(failureMessage(selectedLang))}`)
  }
  redirect(`/${selectedLang==='es'?'?lang=es':''}`)
}
