'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim(),langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en',prayerUrl=(lang:string,extra='')=>`/prayer?lang=${lang}${extra}`
async function auth(lang='en'){const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub;if(!userId)redirect(`/login?lang=${lang}`);const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single();if(!membership?.church_id)redirect('/');return{supabase,userId,churchId:membership.church_id}}

export async function createPrayerOrTestimony(formData:FormData){
 const lang=langOf(formData),{supabase,userId,churchId}=await auth(lang),postType=text(formData,'post_type'),body=text(formData,'body')
 if(!['prayer_request','testimony'].includes(postType))redirect(prayerUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Elige Petición de Oración o Testimonio.':'Choose Prayer Request or Testimony.')))
 if(body.length<3||body.length>5000)redirect(prayerUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Escribe entre 3 y 5,000 caracteres.':'Please write between 3 and 5,000 characters.')))
 if(postType==='testimony'){
  const {error}=await supabase.from('community_posts').insert({church_id:churchId,author_id:userId,body,post_type:'testimony',visibility:'church'})
  if(error){console.error('create testimony failed',{message:error.message});redirect(prayerUrl(lang,'&error='+encodeURIComponent(lang==='es'?'No pudimos compartir el testimonio.':'We could not share the testimony.')))}
 }else{
  const visibility=text(formData,'visibility')==='public'?'public':'private',shareWithGroup=formData.get('share_with_group')==='on'
  const {error}=await supabase.rpc('submit_prayer_request',{p_church_id:churchId,p_body:body,p_visibility:visibility,p_share_with_group:shareWithGroup})
  if(error){console.error('create prayer request failed',{message:error.message});redirect(prayerUrl(lang,'&error='+encodeURIComponent(lang==='es'?'No pudimos enviar la petición de oración. Inténtalo otra vez.':'We could not submit the prayer request. Please try again.')))}
 }
 revalidatePath('/prayer');revalidatePath('/journey');revalidatePath('/');revalidatePath('/groups');redirect(prayerUrl(lang,`&created=${postType}`))
}

export async function setPrayerAnswered(formData:FormData){
 const lang=langOf(formData),{supabase}=await auth(lang),requestId=text(formData,'request_id')
 if(!requestId)redirect(prayerUrl(lang))
 const {error}=await supabase.rpc('mark_my_prayer_answered',{p_request_id:requestId})
 if(error){console.error('setPrayerAnswered failed',{message:error.message});redirect(prayerUrl(lang,'&error='+encodeURIComponent(lang==='es'?'No pudimos actualizar esa petición.':'We could not update that prayer request.')))}
 revalidatePath('/prayer');revalidatePath('/journey');revalidatePath('/');redirect(prayerUrl(lang,'&answered=1'))
}
