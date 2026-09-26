'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
  if(typeof error==='object'&&error&&'code' in error)return boundedCode((error as {code?:unknown}).code)
  if(error instanceof Error)return boundedCode(error.name)
  return boundedCode(fallback)
}
const startFailure=(lang:'en'|'es',code:'connection_unavailable'|'onboarding_save_failed')=>`/start?lang=${lang}&error_code=${code}`

export async function completeOnboarding(formData:FormData){
  const lang=String(formData.get('lang')??'')
  const selectedLang:'en'|'es'=lang==='es'?'es':'en'
  let supabase
  try{supabase=await createClient()}
  catch(error){
    console.error('start onboarding client unavailable',{code:diagnosticCode(error,'client_unavailable')})
    redirect(startFailure(selectedLang,'connection_unavailable'))
  }

  let authResult
  try{authResult=await supabase.auth.getUser()}
  catch(error){
    console.error('start onboarding auth transport unavailable',{code:diagnosticCode(error,'auth_unavailable')})
    redirect(startFailure(selectedLang,'connection_unavailable'))
  }
  const {data:{user},error:authError}=authResult
  if(authError){
    console.error('start onboarding auth unavailable',{code:boundedCode(authError.code)})
    redirect(startFailure(selectedLang,'connection_unavailable'))
  }
  if(!user)redirect(`/login?lang=${selectedLang}&mode=signin`)

  let updateResult
  try{updateResult=await supabase.auth.updateUser({data:{...user.user_metadata,onboarding_completed:true,preferred_language:selectedLang}})}
  catch(error){
    console.error('start onboarding save transport unavailable',{code:diagnosticCode(error,'onboarding_save_unavailable')})
    redirect(startFailure(selectedLang,'onboarding_save_failed'))
  }
  if(updateResult.error){
    console.error('start onboarding save failed',{code:boundedCode(updateResult.error.code)})
    redirect(startFailure(selectedLang,'onboarding_save_failed'))
  }
  const updatedUser=updateResult.data?.user
  if(!updatedUser||updatedUser.id!==user.id||updatedUser.user_metadata?.onboarding_completed!==true||updatedUser.user_metadata?.preferred_language!==selectedLang){
    console.error('start onboarding save returned incomplete state',{code:'onboarding_state_unconfirmed'})
    redirect(startFailure(selectedLang,'onboarding_save_failed'))
  }
  redirect(`/${selectedLang==='es'?'?lang=es':''}`)
}
