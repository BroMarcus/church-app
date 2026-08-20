'use server'

import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

export async function submitChurchFormAction(formData:FormData){
 const formId=String(formData.get('form_id')??'').trim();if(!formId)redirect('/forms?error=Form+not+found')
 const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)redirect('/login')
 const {data:form}=await supabase.from('church_forms').select('id,form_schema').eq('id',formId).eq('published',true).is('archived_at',null).single();if(!form)redirect('/forms?error=Form+not+available')
 const schema=Array.isArray(form.form_schema)?form.form_schema:[],answers:Record<string,unknown>={}
 for(const field of schema){
  const key=String(field?.key??'');if(!key)continue
  const value=field?.type==='checkbox'?formData.get(key)==='on':String(formData.get(key)??'').trim()
  if(field?.required&&(value===''||value===false))redirect(`/forms/${formId}?error=${encodeURIComponent(`${field?.label||'A required field'} is required.`)}`)
  answers[key]=value
 }
 const {error}=await supabase.rpc('submit_church_form',{p_form_id:formId,p_answers:answers})
 if(error){console.error('church form submission failed',{formId,message:error.message});redirect(`/forms/${formId}?error=${encodeURIComponent('We could not send this form. Nothing was submitted. Try again.')}`)}
 redirect(`/forms/${formId}?sent=1`)
}
