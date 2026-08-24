'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'

export async function completeOnboarding(formData:FormData){
  const supabase=await createClient()
  const lang=String(formData.get('lang')??'')==='es'?'es':'en'
  const {data:{user},error:authError}=await supabase.auth.getUser()
  if(authError){
    console.error('start onboarding auth unavailable',{code:boundedCode(authError.code)})
    redirect(`/start?lang=${lang}&error_code=connection_unavailable`)
  }
  if(!user)redirect(`/login?lang=${lang}`)
  const {error}=await supabase.auth.updateUser({data:{...user.user_metadata,onboarding_completed:true,preferred_language:lang}})
  if(error){
    console.error('start onboarding save failed',{code:boundedCode(error.code)})
    redirect(`/start?lang=${lang}&error_code=onboarding_save_failed`)
  }
  redirect(`/${lang==='es'?'?lang=es':''}`)
}
