'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
  if(typeof error==='object'&&error&&'code' in error)return boundedCode((error as {code?:unknown}).code)
  if(error instanceof Error)return boundedCode(error.name)
  return boundedCode(fallback)
}

export async function completeOnboarding(formData:FormData){
  const lang=String(formData.get('lang')??'')==='es'?'es':'en'
  let supabase
  try{supabase=await createClient()}
  catch(error){
    console.error('start onboarding client unavailable',{code:diagnosticCode(error,'client_unavailable')})
    redirect(`/start?lang=${lang}&error_code=connection_unavailable`)
  }

  let authResult
  try{authResult=await supabase.auth.getUser()}
  catch(error){
    console.error('start onboarding auth transport unavailable',{code:diagnosticCode(error,'auth_unavailable')})
    redirect(`/start?lang=${lang}&error_code=connection_unavailable`)
  }
  const {data:{user},error:authError}=authResult
  if(authError){
    console.error('start onboarding auth unavailable',{code:boundedCode(authError.code)})
    redirect(`/start?lang=${lang}&error_code=connection_unavailable`)
  }
  if(!user)redirect(`/login?lang=${lang}&mode=signin`)

  let updateResult
  try{updateResult=await supabase.auth.updateUser({data:{...user.user_metadata,onboarding_completed:true,preferred_language:lang}})}
  catch(error){
    console.error('start onboarding save transport unavailable',{code:diagnosticCode(error,'onboarding_save_unavailable')})
    redirect(`/start?lang=${lang}&error_code=onboarding_save_failed`)
  }
  if(updateResult.error){
    console.error('start onboarding save failed',{code:boundedCode(updateResult.error.code)})
    redirect(`/start?lang=${lang}&error_code=onboarding_save_failed`)
  }
  redirect(`/${lang==='es'?'?lang=es':''}`)
}