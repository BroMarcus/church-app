'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function savePrivacySettings(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en',url=(extra='')=>`/account/privacy?lang=${lang}${extra}`
  const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const messaging=text(formData,'messaging_preference')
  if(!['church','leaders_only','none'].includes(messaging))redirect(url('&status=invalid_messaging'))

  let saveError:unknown=null
  try{
    const result=await supabase.from('profiles').update({directory_visible:formData.get('directory_visible')==='on',messaging_preference:messaging,show_contact_email:formData.get('show_contact_email')==='on',show_verified_credentials:formData.get('show_verified_credentials')==='on',show_learning_trophies:formData.get('show_learning_trophies')==='on'}).eq('id',userId)
    saveError=result.error
  }catch(error){
    console.error('Privacy settings save request failed',{kind:error instanceof Error?error.name:typeof error})
    redirect(url('&status=save_failed'))
  }
  if(saveError){
    const candidate=saveError as {code?:unknown}
    console.error('Privacy settings save failed',{code:typeof candidate?.code==='string'?candidate.code:undefined})
    redirect(url('&status=save_failed'))
  }
  revalidatePath('/account/privacy');revalidatePath('/directory');revalidatePath('/profile');revalidatePath('/messages');redirect(url('&saved=1'))
}
