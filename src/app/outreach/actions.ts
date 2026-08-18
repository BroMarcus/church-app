'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const stages=['new_contact','invited','guest','bible_study','regular_attendee','baptized','holy_ghost','first_steps','connected','serving','inactive'] as const
const interactionTypes=['call','text','visit','invitation','bible_study','service_attendance','prayer','follow_up','note'] as const
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const nullable=(f:FormData,k:string)=>text(f,k)||null
const int=(f:FormData,k:string)=>Math.max(0,Number.parseInt(text(f,k)||'0',10)||0)

async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}

export async function createOutreachContact(formData:FormData){
  const {supabase,userId}=await auth()
  const churchId=text(formData,'church_id'),firstName=text(formData,'first_name')
  if(!churchId||!firstName)redirect('/outreach?error='+encodeURIComponent('First name is required.'))
  const payload={church_id:churchId,created_by:userId,assigned_to:nullable(formData,'assigned_to')||userId,first_name:firstName,last_name:nullable(formData,'last_name'),phone:nullable(formData,'phone'),email:nullable(formData,'email'),stage:'new_contact',bible_study_interest:text(formData,'bible_study_interest')==='on',messaging_consent:text(formData,'messaging_consent')==='on',prayer_request:nullable(formData,'prayer_request'),follow_up_due_at:nullable(formData,'follow_up_due_at'),notes:nullable(formData,'notes')}
  const {error}=await supabase.from('outreach_contacts').insert(payload)
  if(error){
    const message=error.code==='23505'?'This person may already be in Outreach. Check the existing pipeline before adding another record.':error.message
    redirect('/outreach?error='+encodeURIComponent(message))
  }
  revalidatePath('/outreach');redirect('/outreach?created=1')
}

export async function updateOutreachContact(formData:FormData){
  const {supabase}=await auth()
  const id=text(formData,'id'),stage=text(formData,'stage')
  if(!id||!stages.includes(stage as any))redirect('/outreach?error='+encodeURIComponent('Invalid outreach update.'))
  const payload={stage,assigned_to:nullable(formData,'assigned_to'),service_count:int(formData,'service_count'),bible_study_interest:text(formData,'bible_study_interest')==='on',messaging_consent:text(formData,'messaging_consent')==='on',bible_study_lesson:text(formData,'bible_study_lesson')?int(formData,'bible_study_lesson'):null,prayer_request:nullable(formData,'prayer_request'),follow_up_due_at:nullable(formData,'follow_up_due_at'),last_contacted_at:nullable(formData,'last_contacted_at'),notes:nullable(formData,'notes'),updated_at:new Date().toISOString()}
  const {error}=await supabase.from('outreach_contacts').update(payload).eq('id',id)
  if(error)redirect('/outreach?error='+encodeURIComponent(error.message))
  revalidatePath('/outreach');redirect('/outreach?saved=1')
}

export async function logOutreachInteraction(formData:FormData){
  const {supabase,userId}=await auth()
  const contactId=text(formData,'contact_id'),type=text(formData,'interaction_type'),summary=text(formData,'summary')
  if(!contactId||!interactionTypes.includes(type as any)||!summary)redirect('/outreach?error='+encodeURIComponent('Interaction type and note are required.'))
  const {data:contact,error:contactError}=await supabase.from('outreach_contacts').select('church_id').eq('id',contactId).single()
  if(contactError||!contact?.church_id)redirect('/outreach?error='+encodeURIComponent('Outreach contact not found or not available to you.'))
  const lesson=type==='bible_study'&&text(formData,'bible_study_lesson')?int(formData,'bible_study_lesson'):null
  const {error}=await supabase.from('outreach_interactions').insert({contact_id:contactId,church_id:contact.church_id,recorded_by:userId,interaction_type:type,summary,bible_study_lesson:lesson})
  if(error)redirect('/outreach?error='+encodeURIComponent(error.message))
  revalidatePath('/outreach');redirect('/outreach?interaction=1')
}
