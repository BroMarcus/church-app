'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const number=(f:FormData,k:string)=>Math.max(0,Number.parseInt(text(f,k)||'0',10)||0)
const frequencies=['weekly','biweekly','monthly','seasonal','other']
const languages=['en','es','bilingual']
const withLang=(path:string,lang:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
const names=(value:string)=>value.split(/\r?\n|,/).map(v=>v.trim()).filter(Boolean).slice(0,20)

async function currentUser(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return {supabase,userId}}

export async function createGroup(formData:FormData){
  const {supabase}=await currentUser()
  const lang=text(formData,'lang')
  const churchId=text(formData,'church_id'),name=text(formData,'name'),groupType=text(formData,'group_type')||'friendship',leaderId=text(formData,'leader_id')||null
  const frequency=text(formData,'meeting_frequency')||'weekly',language=text(formData,'language_code')||'en'
  if(!name||!frequencies.includes(frequency)||!languages.includes(language))redirect(withLang('/groups?error='+encodeURIComponent(lang==='es'?'Se requiere un nombre, frecuencia e idioma válidos.':'Valid group name, frequency and language are required.'),lang))
  const capacity=text(formData,'capacity')?number(formData,'capacity'):null
  const {data:group,error}=await supabase.from('groups').insert({church_id:churchId,name,group_type:groupType,leader_id:leaderId,description:text(formData,'description')||null,meeting_day:text(formData,'meeting_day')||null,meeting_time:text(formData,'meeting_time')||null,meeting_frequency:frequency,language_code:language,capacity,location_label:text(formData,'location_label')||null,accepting_members:text(formData,'accepting_members')==='on'}).select('id').single()
  if(error||!group)redirect(withLang('/groups?error='+encodeURIComponent(error?.message??(lang==='es'?'No se pudo crear el grupo.':'Unable to create group.')),lang))
  if(leaderId)await supabase.from('group_memberships').upsert({group_id:group.id,user_id:leaderId,role:'leader'})
  revalidatePath('/groups');redirect(withLang(`/groups/${group.id}`,lang))
}

export async function updateGroupDetails(formData:FormData){
  const {supabase}=await currentUser();const groupId=text(formData,'group_id'),name=text(formData,'name'),frequency=text(formData,'meeting_frequency'),language=text(formData,'language_code')
  if(!groupId||!name||!frequencies.includes(frequency)||!languages.includes(language))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Invalid group details.'))
  const capacity=text(formData,'capacity')?number(formData,'capacity'):null
  const {error}=await supabase.from('groups').update({name,description:text(formData,'description')||null,meeting_day:text(formData,'meeting_day')||null,meeting_time:text(formData,'meeting_time')||null,meeting_frequency:frequency,language_code:language,capacity,location_label:text(formData,'location_label')||null,accepting_members:text(formData,'accepting_members')==='on'}).eq('id',groupId)
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?details=1`)
}

export async function updateGroupPrivateDetails(formData:FormData){
  const {supabase,userId}=await currentUser();const groupId=text(formData,'group_id')
  if(!groupId)redirect('/groups')
  const {error}=await supabase.from('group_private_details').upsert({group_id:groupId,meeting_address:text(formData,'meeting_address')||null,access_notes:text(formData,'access_notes')||null,updated_by:userId,updated_at:new Date().toISOString()},{onConflict:'group_id'})
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);redirect(`/groups/${groupId}?private=1`)
}

export async function requestGroupMembership(formData:FormData){
  const {supabase,userId}=await currentUser();const groupId=text(formData,'group_id'),churchId=text(formData,'church_id')
  if(!groupId||!churchId)redirect('/groups?error='+encodeURIComponent('Group request is missing required information.'))
  const {error}=await supabase.from('group_join_requests').insert({group_id:groupId,church_id:churchId,user_id:userId,message:text(formData,'message')||null})
  if(error){const msg=error.code==='23505'?'You already have a pending request for this group.':error.message;redirect(`/groups/${groupId}?error=`+encodeURIComponent(msg))}
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?requested=1`)
}

export async function cancelGroupJoinRequest(formData:FormData){
  const {supabase}=await currentUser();const requestId=text(formData,'request_id'),groupId=text(formData,'group_id')
  if(!requestId||!groupId)redirect('/groups')
  const {error}=await supabase.from('group_join_requests').update({status:'cancelled'}).eq('id',requestId)
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?cancelled=1`)
}

export async function reviewGroupJoinRequest(formData:FormData){
  const {supabase}=await currentUser();const requestId=text(formData,'request_id'),groupId=text(formData,'group_id'),decision=text(formData,'decision')
  if(!requestId||!groupId||!['approved','declined'].includes(decision))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Invalid join-request review.'))
  const {error}=await supabase.from('group_join_requests').update({status:decision}).eq('id',requestId)
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?reviewed=1`)
}

export async function addGroupMember(formData:FormData){
  const {supabase}=await currentUser()
  const groupId=text(formData,'group_id'),userId=text(formData,'user_id'),role=text(formData,'role')||'member'
  if(!groupId||!userId||!['member','assistant','leader'].includes(role))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Choose a valid member and role.'))
  const {error}=await supabase.from('group_memberships').upsert({group_id:groupId,user_id:userId,role},{onConflict:'group_id,user_id'})
  if(error)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error.message))
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?member=1`)
}

export async function submitGroupReport(formData:FormData){
  const {supabase,userId}=await currentUser()
  const groupId=text(formData,'group_id')
  if(!groupId)redirect('/groups?error='+encodeURIComponent('Group report is missing a group.'))
  const {data:group,error:groupError}=await supabase.from('groups').select('church_id,leader_id,name').eq('id',groupId).single()
  if(groupError||!group?.church_id)redirect(`/groups/${groupId}?error=`+encodeURIComponent('Group not found or unavailable.'))

  const namedGuests=Array.from({length:5},(_,i)=>{
    const n=i+1
    return {first_name:text(formData,`guest_${n}_first_name`),last_name:text(formData,`guest_${n}_last_name`)||null,phone:text(formData,`guest_${n}_phone`)||null,email:text(formData,`guest_${n}_email`)||null}
  }).filter(g=>g.first_name)
  const baptismNames=names(text(formData,'baptism_names'))
  const holyGhostNames=names(text(formData,'holy_ghost_names'))
  const meetingDate=text(formData,'meeting_date')
  const meetingType=['regular','outreach','fellowship','special'].includes(text(formData,'meeting_type'))?text(formData,'meeting_type'):'regular'
  const selectedAttendees=Array.from(new Set(formData.getAll('attendee_user_id').map(v=>String(v).trim()).filter(Boolean)))
  const firstTimeGuests=Math.max(number(formData,'first_time_guests'),namedGuests.length)
  const baptisms=Math.max(number(formData,'baptisms'),baptismNames.length)
  const holyGhostReceived=Math.max(number(formData,'holy_ghost_received'),holyGhostNames.length)
  const attendanceCount=Math.max(number(formData,'attendance_count'),selectedAttendees.length+firstTimeGuests)

  const {data:report,error}=await supabase.from('group_reports').insert({
    group_id:groupId,
    submitted_by:userId,
    meeting_date:meetingDate,
    attendance_count:attendanceCount,
    first_time_guests:firstTimeGuests,
    active_bible_studies:number(formData,'active_bible_studies'),
    baptisms,
    holy_ghost_received:holyGhostReceived,
    lesson_title:text(formData,'lesson_title')||null,
    follow_up_notes:text(formData,'follow_up_notes')||null,
    meeting_type:meetingType,
    location_label:text(formData,'location_label')||null,
    prayer_needs:text(formData,'prayer_needs')||null,
    issues_notes:text(formData,'issues_notes')||null,
    general_notes:text(formData,'general_notes')||null
  }).select('id').single()
  if(error||!report)redirect(`/groups/${groupId}?error=`+encodeURIComponent(error?.message||'Unable to save report.'))

  let attendanceRecorded=0
  if(selectedAttendees.length){
    const {data:validMembers}=await supabase.from('group_memberships').select('user_id').eq('group_id',groupId).in('user_id',selectedAttendees)
    const validIds=(validMembers??[]).map((r:any)=>r.user_id)
    if(validIds.length){
      const {error:attendanceError}=await supabase.from('group_report_attendance').insert(validIds.map(attendeeId=>({church_id:group.church_id,group_id:groupId,group_report_id:report.id,user_id:attendeeId,present:true})))
      if(!attendanceError)attendanceRecorded=validIds.length
    }
  }

  let guestsAdded=0
  let duplicateGuests=0
  const followUpDue=new Date(Date.now()+24*60*60*1000).toISOString()
  const owner=group.leader_id||userId
  for(const guest of namedGuests){
    const {error:guestError}=await supabase.from('outreach_contacts').insert({church_id:group.church_id,created_by:userId,assigned_to:owner,first_name:guest.first_name,last_name:guest.last_name,phone:guest.phone,email:guest.email,stage:'guest',bible_study_interest:false,messaging_consent:false,follow_up_due_at:followUpDue,notes:`Added from Friendship Group: ${group.name}${meetingDate?` • ${meetingDate}`:''}`})
    if(!guestError)guestsAdded++
    else if(guestError.code==='23505')duplicateGuests++
  }

  const milestoneRows=[...baptismNames.map(person_name=>({person_name,milestone_type:'baptism'})),...holyGhostNames.map(person_name=>({person_name,milestone_type:'holy_ghost'}))]
  if(milestoneRows.length){
    await supabase.from('reported_milestones').insert(milestoneRows.map(m=>({church_id:group.church_id,group_id:groupId,group_report_id:report.id,reported_by:userId,person_name:m.person_name,milestone_type:m.milestone_type,occurred_on:meetingDate||null,status:'pending'})))
  }

  revalidatePath(`/groups/${groupId}`);revalidatePath('/outreach');revalidatePath('/church/analytics')
  const params=new URLSearchParams({reported:'1'})
  if(attendanceRecorded)params.set('attendance_recorded',String(attendanceRecorded))
  if(guestsAdded)params.set('guests_added',String(guestsAdded))
  if(duplicateGuests)params.set('guest_duplicates',String(duplicateGuests))
  if(milestoneRows.length)params.set('milestones_queued',String(milestoneRows.length))
  redirect(`/groups/${groupId}?${params.toString()}`)
}
