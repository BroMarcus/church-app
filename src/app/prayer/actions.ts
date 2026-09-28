'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const prayerUrl=(lang:string,params:Record<string,string>={})=>{
 const q=new URLSearchParams({lang,...params})
 return `/prayer?${q.toString()}`
}

async function auth(lang='en'){
 const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
 if(!userId)redirect(`/login?lang=${lang}`)
 const {data:membership,error}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
 if(error)console.error('prayer membership lookup failed',{message:error.message})
 if(!membership?.church_id)redirect('/')
 return{supabase,userId,churchId:membership.church_id}
}

export async function createPrayerOrTestimony(formData:FormData){
 const lang=langOf(formData),{supabase,userId,churchId}=await auth(lang),postType=text(formData,'post_type'),body=text(formData,'body')
 if(!['prayer_request','testimony'].includes(postType))redirect(prayerUrl(lang,{error_code:'choice_missing'}))
 if(body.length<3||body.length>5000)redirect(prayerUrl(lang,{error_code:'body_invalid',share:postType==='testimony'?'testimony':'prayer'}))
 if(postType==='testimony'){
  const {error}=await supabase.from('community_posts').insert({church_id:churchId,author_id:userId,body,post_type:'testimony',visibility:'church'})
  if(error){console.error('create testimony failed',{message:error.message});redirect(prayerUrl(lang,{error_code:'testimony_failed',share:'testimony'}))}
 }else{
  const visibility=text(formData,'visibility')==='public'?'public':'private',shareWithGroup=formData.get('share_with_group')==='on'
  const {error}=await supabase.rpc('submit_prayer_request',{p_church_id:churchId,p_body:body,p_visibility:visibility,p_share_with_group:shareWithGroup})
  if(error){console.error('create prayer request failed',{message:error.message});redirect(prayerUrl(lang,{error_code:'prayer_failed',share:'prayer'}))}
 }
 revalidatePath('/prayer');revalidatePath('/journey');revalidatePath('/');revalidatePath('/groups')
 redirect(prayerUrl(lang,{message_code:postType==='testimony'?'testimony_shared':'prayer_submitted'}))
}

export async function setPrayerAnswered(formData:FormData){
 const lang=langOf(formData),{supabase}=await auth(lang),requestId=text(formData,'request_id')
 if(!requestId||requestId.length>100)redirect(prayerUrl(lang,{error_code:'answer_failed'}))
 const {error}=await supabase.rpc('mark_my_prayer_answered',{p_request_id:requestId})
 if(error){console.error('setPrayerAnswered failed',{message:error.message});redirect(prayerUrl(lang,{error_code:'answer_failed'}))}
 revalidatePath('/prayer');revalidatePath('/journey');revalidatePath('/')
 redirect(prayerUrl(lang,{message_code:'answered'}))
}
