'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const stages=['new_contact','invited','guest','bible_study','regular_attendee','baptized','holy_ghost','first_steps','connected','serving','inactive'] as const
const interactionTypes=['call','text','visit','invitation','bible_study','service_attendance','prayer','follow_up','note'] as const
const stageRank=new Map(stages.map((stage,index)=>[stage,index]))
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const nullable=(f:FormData,k:string)=>text(f,k)||null
const int=(f:FormData,k:string)=>Math.max(0,Number.parseInt(text(f,k)||'0',10)||0)
const afterHours=(hours:number)=>new Date(Date.now()+hours*60*60*1000).toISOString()
const laterStage=(current:string|undefined|null,next:string)=>((stageRank.get(current as any)??0)<(stageRank.get(next as any)??0)?next:(current||next))

async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}
async function localToUtc(supabase:any,churchId:string,value:string){if(!value)return null;const {data,error}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:value});if(error)throw new Error(error.message);return data as string|null}

export async function createOutreachContact(formData:FormData){
  const {supabase,userId}=await auth()
  const churchId=text(formData,'church_id'),firstName=text(formData,'first_name')
  if(!churchId||!firstName)redirect('/outreach?error='+encodeURIComponent('First name is required.'))
  let followUp:string|null=null
  try{followUp=await localToUtc(supabase,churchId,text(formData,'follow_up_due_at'))}catch(e:any){redirect('/outreach?error='+encodeURIComponent(e.message||'Invalid follow-up time.'))}
  // Every new person gets a follow-up owner and a near-term next touch unless leadership intentionally supplied another time.
  followUp=followUp||afterHours(24)
  const requestedStage=text(formData,'stage')
  const initialStage=stages.includes(requestedStage as any)?requestedStage:'new_contact'
  const payload={church_id:churchId,created_by:userId,assigned_to:nullable(formData,'assigned_to')||userId,first_name:firstName,last_name:nullable(formData,'last_name'),phone:nullable(formData,'phone'),email:nullable(formData,'email'),stage:initialStage,bible_study_interest:text(formData,'bible_study_interest')==='on',messaging_consent:text(formData,'messaging_consent')==='on',prayer_request:nullable(formData,'prayer_request'),follow_up_due_at:followUp,notes:nullable(formData,'notes')}
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
  const {data:contact,error:contactError}=await supabase.from('outreach_contacts').select('church_id').eq('id',id).single()
  if(contactError||!contact?.church_id)redirect('/outreach?error='+encodeURIComponent('Outreach contact not found or not available to you.'))
  let followUp:string|null=null,lastContacted:string|null=null
  try{followUp=await localToUtc(supabase,contact.church_id,text(formData,'follow_up_due_at'));lastContacted=await localToUtc(supabase,contact.church_id,text(formData,'last_contacted_at'))}catch(e:any){redirect('/outreach?error='+encodeURIComponent(e.message||'Invalid follow-up time.'))}
  const payload={stage,assigned_to:nullable(formData,'assigned_to'),service_count:int(formData,'service_count'),bible_study_interest:text(formData,'bible_study_interest')==='on',messaging_consent:text(formData,'messaging_consent')==='on',bible_study_lesson:text(formData,'bible_study_lesson')?int(formData,'bible_study_lesson'):null,prayer_request:nullable(formData,'prayer_request'),follow_up_due_at:followUp,last_contacted_at:lastContacted,notes:nullable(formData,'notes'),updated_at:new Date().toISOString()}
  const {error}=await supabase.from('outreach_contacts').update(payload).eq('id',id)
  if(error)redirect('/outreach?error='+encodeURIComponent(error.message))
  revalidatePath('/outreach');redirect('/outreach?saved=1')
}

export async function logOutreachInteraction(formData:FormData){
  const {supabase,userId}=await auth()
  const contactId=text(formData,'contact_id'),type=text(formData,'interaction_type'),summary=text(formData,'summary')
  if(!contactId||!interactionTypes.includes(type as any)||!summary)redirect('/outreach?error='+encodeURIComponent('Interaction type and note are required.'))
  const {data:contact,error:contactError}=await supabase.from('outreach_contacts').select('church_id,stage,service_count,bible_study_lesson').eq('id',contactId).single()
  if(contactError||!contact?.church_id)redirect('/outreach?error='+encodeURIComponent('Outreach contact not found or not available to you.'))
  const lesson=type==='bible_study'&&text(formData,'bible_study_lesson')?int(formData,'bible_study_lesson'):null
  const now=new Date().toISOString()
  const {error}=await supabase.from('outreach_interactions').insert({contact_id:contactId,church_id:contact.church_id,recorded_by:userId,interaction_type:type,summary,bible_study_lesson:lesson})
  if(error)redirect('/outreach?error='+encodeURIComponent(error.message))

  // One interaction should update the person's pipeline automatically instead of asking leaders to re-enter the same facts.
  const updates:any={last_contacted_at:now,updated_at:now}
  if(type==='invitation')updates.stage=laterStage(contact.stage,'invited')
  if(type==='service_attendance'){
    updates.stage=laterStage(contact.stage,'guest')
    updates.service_count=Number(contact.service_count??0)+1
    updates.follow_up_due_at=afterHours(24)
  }
  if(type==='bible_study'){
    updates.stage=laterStage(contact.stage,'bible_study')
    updates.bible_study_interest=true
    if(lesson!=null)updates.bible_study_lesson=lesson
    updates.follow_up_due_at=afterHours(72)
  }
  if(['call','text','visit','follow_up'].includes(type))updates.follow_up_due_at=afterHours(72)
  const {error:updateError}=await supabase.from('outreach_contacts').update(updates).eq('id',contactId)
  if(updateError)redirect('/outreach?error='+encodeURIComponent(updateError.message))

  revalidatePath('/outreach');redirect('/outreach?interaction=1')
}
