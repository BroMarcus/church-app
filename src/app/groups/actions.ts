'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const number=(f:FormData,k:string)=>Math.max(0,Number.parseInt(text(f,k)||'0',10)||0)
const frequencies=['weekly','biweekly','monthly','seasonal','other']
const reportMeetingTypes=['regular','matthew_party','picnic','barbecue','special_event','other']
const withLang=(path:string,lang:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
const names=(value:string)=>value.split(/\r?\n|,/).map(v=>v.trim()).filter(Boolean).slice(0,20)
const safeGroupError=(lang:string)=>lang==='es'?'No pudimos guardar ese cambio del grupo. Revisa la información e inténtalo otra vez.':'We could not save that group change. Check the information and try again.'

async function currentUser(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return {supabase,userId}}

export async function createGroup(formData:FormData){
  const {supabase,userId}=await currentUser(),lang=text(formData,'lang')
  const churchId=text(formData,'church_id'),name=text(formData,'name'),groupType=text(formData,'group_type')||'friendship',leaderId=text(formData,'leader_id')||null,frequency=text(formData,'meeting_frequency')||'weekly'
  if(!name||!churchId||!frequencies.includes(frequency))redirect(withLang('/groups?error='+encodeURIComponent(lang==='es'?'Se requiere un nombre y frecuencia válidos.':'Valid group name and frequency are required.'),lang))
  const {data:group,error}=await supabase.from('groups').insert({church_id:churchId,name,group_type:groupType,leader_id:leaderId,description:text(formData,'description')||null,meeting_day:text(formData,'meeting_day')||null,meeting_time:text(formData,'meeting_time')||null,meeting_frequency:frequency,language_code:'en',capacity:null,location_label:null,accepting_members:true}).select('id').single()
  if(error||!group){console.error('createGroup failed',{message:error?.message});redirect(withLang('/groups?error='+encodeURIComponent(safeGroupError(lang)),lang))}
  if(leaderId){const memberResult=await supabase.from('group_memberships').upsert({group_id:group.id,user_id:leaderId,role:'leader'},{onConflict:'group_id,user_id'});if(memberResult.error)console.error('createGroup leader membership failed',{message:memberResult.error.message})}
  const meetingAddress=text(formData,'meeting_address')
  if(meetingAddress){const detailResult=await supabase.from('group_private_details').upsert({group_id:group.id,meeting_address:meetingAddress,updated_by:userId,updated_at:new Date().toISOString()},{onConflict:'group_id'});if(detailResult.error)console.error('createGroup private address failed',{message:detailResult.error.message})}
  revalidatePath('/groups');redirect(withLang(`/groups/${group.id}`,lang))
}

export async function updateGroupDetails(formData:FormData){
  const {supabase}=await currentUser(),groupId=text(formData,'group_id'),name=text(formData,'name'),frequency=text(formData,'meeting_frequency')
  if(!groupId||!name||!frequencies.includes(frequency))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Invalid group details.'))
  const {error}=await supabase.from('groups').update({name,description:text(formData,'description')||null,meeting_day:text(formData,'meeting_day')||null,meeting_time:text(formData,'meeting_time')||null,meeting_frequency:frequency}).eq('id',groupId)
  if(error){console.error('updateGroupDetails failed',{message:error.message});redirect(`/groups/${groupId}?error=`+encodeURIComponent('We could not save the group details.'))}
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?details=1`)
}

export async function updateGroupPrivateDetails(formData:FormData){
  const {supabase,userId}=await currentUser(),groupId=text(formData,'group_id')
  if(!groupId)redirect('/groups')
  const {error}=await supabase.from('group_private_details').upsert({group_id:groupId,meeting_address:text(formData,'meeting_address')||null,access_notes:text(formData,'access_notes')||null,updated_by:userId,updated_at:new Date().toISOString()},{onConflict:'group_id'})
  if(error){console.error('updateGroupPrivateDetails failed',{message:error.message});redirect(`/groups/${groupId}?error=`+encodeURIComponent('We could not save the meeting address.'))}
  revalidatePath(`/groups/${groupId}`);redirect(`/groups/${groupId}?private=1`)
}

export async function requestGroupMembership(formData:FormData){
  const {supabase,userId}=await currentUser(),groupId=text(formData,'group_id'),churchId=text(formData,'church_id')
  if(!groupId||!churchId)redirect('/groups?error='+encodeURIComponent('Group request is missing required information.'))
  const {data:existing}=await supabase.from('group_memberships').select('group_id,groups(name,group_type,active)').eq('user_id',userId)
  const current=(existing??[]).find((row:any)=>{const g=Array.isArray(row.groups)?row.groups[0]:row.groups;return g?.active&&g?.group_type==='friendship'&&row.group_id!==groupId}) as any
  if(current)redirect(`/groups/${groupId}?error=`+encodeURIComponent('You already belong to an active Friendship Group. Ask a leader if you need to transfer groups.'))
  const {error}=await supabase.from('group_join_requests').insert({group_id:groupId,church_id:churchId,user_id:userId,message:text(formData,'message')||null})
  if(error){console.error('requestGroupMembership failed',{message:error.message});const msg=error.code==='23505'?'You already have a pending request for this group.':'We could not send that group request.';redirect(`/groups/${groupId}?error=`+encodeURIComponent(msg))}
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?requested=1`)
}

export async function cancelGroupJoinRequest(formData:FormData){
  const {supabase}=await currentUser(),requestId=text(formData,'request_id'),groupId=text(formData,'group_id')
  if(!requestId||!groupId)redirect('/groups')
  const {error}=await supabase.from('group_join_requests').update({status:'cancelled'}).eq('id',requestId)
  if(error){console.error('cancelGroupJoinRequest failed',{message:error.message});redirect(`/groups/${groupId}?error=`+encodeURIComponent('We could not cancel that request.'))}
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?cancelled=1`)
}

export async function reviewGroupJoinRequest(formData:FormData){
  const {supabase}=await currentUser(),requestId=text(formData,'request_id'),groupId=text(formData,'group_id'),decision=text(formData,'decision')
  if(!requestId||!groupId||!['approved','declined'].includes(decision))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Invalid join-request review.'))
  if(decision==='approved'){
    const {data:req}=await supabase.from('group_join_requests').select('user_id').eq('id',requestId).eq('group_id',groupId).single()
    if(req?.user_id){const {data:existing}=await supabase.from('group_memberships').select('group_id,groups(group_type,active)').eq('user_id',req.user_id);if((existing??[]).some((row:any)=>{const g=Array.isArray(row.groups)?row.groups[0]:row.groups;return g?.active&&g?.group_type==='friendship'&&row.group_id!==groupId}))redirect(`/groups/${groupId}?error=`+encodeURIComponent('That member already belongs to another active Friendship Group. Transfer them before approving this request.'))}
  }
  const {error}=await supabase.from('group_join_requests').update({status:decision}).eq('id',requestId)
  if(error){console.error('reviewGroupJoinRequest failed',{message:error.message});redirect(`/groups/${groupId}?error=`+encodeURIComponent('We could not review that group request.'))}
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?reviewed=1`)
}

export async function addGroupMember(formData:FormData){
  const {supabase}=await currentUser(),groupId=text(formData,'group_id'),userId=text(formData,'user_id'),role=text(formData,'role')||'member'
  if(!groupId||!userId||!['member','assistant','leader'].includes(role))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Choose a valid member and role.'))
  const {error}=await supabase.from('group_memberships').upsert({group_id:groupId,user_id:userId,role},{onConflict:'group_id,user_id'})
  if(error){console.error('addGroupMember failed',{message:error.message});const message=error.message.includes('only one active Friendship Group')?'That member already belongs to another active Friendship Group. Transfer them first.':'We could not add that member to the group.';redirect(`/groups/${groupId}?error=`+encodeURIComponent(message))}
  revalidatePath(`/groups/${groupId}`);revalidatePath('/groups');redirect(`/groups/${groupId}?member=1`)
}

export async function selfCheckIn(formData:FormData){
  const {supabase,userId}=await currentUser(),groupId=text(formData,'group_id'),meetingDate=text(formData,'meeting_date')
  if(!groupId||!meetingDate)redirect(`/groups/${groupId||''}?error=`+encodeURIComponent('Check-in is missing meeting information.'))
  const {data:group}=await supabase.from('groups').select('church_id').eq('id',groupId).single()
  if(!group?.church_id)redirect('/groups?error='+encodeURIComponent('Group not found.'))
  const {error}=await supabase.from('group_meeting_checkins').insert({church_id:group.church_id,group_id:groupId,user_id:userId,meeting_date:meetingDate,scheduled_start_at:new Date().toISOString(),attendance_status:'on_time',source:'self',recorded_by:userId})
  if(error){console.error('selfCheckIn failed',{message:error.message});const msg=error.code==='23505'?'You are already checked in for this meeting.':error.message.includes('meeting day')?'Today is not this group’s meeting day.':error.message.includes('available')?'Check-in is not open right now.':'We could not check you in. Please ask your group leader.';redirect(`/groups/${groupId}?error=`+encodeURIComponent(msg))}
  revalidatePath(`/groups/${groupId}`);revalidatePath('/journey');redirect(`/groups/${groupId}?checked_in=1`)
}

export async function submitGroupReport(formData:FormData){
  const {supabase,userId}=await currentUser(),groupId=text(formData,'group_id')
  if(!groupId)redirect('/groups?error='+encodeURIComponent('Group report is missing a group.'))
  const {data:group,error:groupError}=await supabase.from('groups').select('church_id,leader_id,name').eq('id',groupId).single()
  if(groupError||!group?.church_id)redirect(`/groups/${groupId}?error=`+encodeURIComponent('Group not found or unavailable.'))

  const namedGuests=Array.from({length:5},(_,i)=>{const n=i+1;return {first_name:text(formData,`guest_${n}_first_name`),last_name:text(formData,`guest_${n}_last_name`)||null,phone:text(formData,`guest_${n}_phone`)||null,email:text(formData,`guest_${n}_email`)||null}}).filter(g=>g.first_name)
  const baptismNames=names(text(formData,'baptism_names')),holyGhostNames=names(text(formData,'holy_ghost_names')),meetingDate=text(formData,'meeting_date')
  const rawMeetingType=text(formData,'meeting_type'),meetingType=reportMeetingTypes.includes(rawMeetingType)?rawMeetingType:'regular'
  if(!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate))redirect(`/groups/${groupId}?error=`+encodeURIComponent('Choose a valid meeting date.'))

  const [{data:roster},{data:checkins},{data:wallPrayers}]=await Promise.all([
    supabase.from('group_memberships').select('user_id').eq('group_id',groupId),
    supabase.from('group_meeting_checkins').select('user_id,attendance_status,checked_in_at').eq('group_id',groupId).eq('meeting_date',meetingDate),
    supabase.from('prayer_requests').select('body,created_at').eq('group_id',groupId).eq('share_with_group',true).gte('created_at',`${meetingDate}T00:00:00Z`).lt('created_at',`${meetingDate}T23:59:59.999Z`).order('created_at')
  ])
  const checkinMap=new Map((checkins??[]).map((r:any)=>[r.user_id,r]))
  const attendanceRows=(roster??[]).map((r:any)=>{const override=text(formData,`attendance_status_${r.user_id}`);const check:any=checkinMap.get(r.user_id);const status=['on_time','late','missing'].includes(override)?override:(check?.attendance_status||'missing');return {user_id:r.user_id,status,checked_in_at:check?.checked_in_at??null}})
  const presentCount=attendanceRows.filter(r=>r.status!=='missing').length
  const firstTimeGuests=Math.max(number(formData,'first_time_guests'),namedGuests.length),baptisms=Math.max(number(formData,'baptisms'),baptismNames.length),holyGhostReceived=Math.max(number(formData,'holy_ghost_received'),holyGhostNames.length),attendanceCount=Math.max(number(formData,'attendance_count'),presentCount+firstTimeGuests)
  const leaderPrayer=text(formData,'prayer_needs'),wallPrayerText=(wallPrayers??[]).map((r:any)=>`• ${r.body}`).join('\n')
  const prayerNeeds=[leaderPrayer,wallPrayerText?`Group prayer wall:\n${wallPrayerText}`:''].filter(Boolean).join('\n\n')||null

  const {data:report,error}=await supabase.from('group_reports').insert({group_id:groupId,submitted_by:userId,meeting_date:meetingDate,attendance_count:attendanceCount,first_time_guests:firstTimeGuests,active_bible_studies:number(formData,'active_bible_studies'),baptisms,holy_ghost_received:holyGhostReceived,lesson_title:text(formData,'lesson_title')||null,follow_up_notes:text(formData,'follow_up_notes')||null,meeting_type:meetingType,location_label:text(formData,'location_label')||null,prayer_needs:prayerNeeds,issues_notes:text(formData,'issues_notes')||null,general_notes:text(formData,'general_notes')||null}).select('id').single()
  if(error||!report){
    console.error('submitGroupReport failed',{code:error?.code,message:error?.message})
    const message=error?.code==='23505'?'A report already exists for this group and meeting date. Open Meeting history instead of submitting it again.':'Unable to save the group report.'
    redirect(`/groups/${groupId}?error=`+encodeURIComponent(message))
  }

  let attendanceRecorded=0
  if(attendanceRows.length){const {error:attendanceError}=await supabase.from('group_report_attendance').insert(attendanceRows.map(r=>({church_id:group.church_id,group_id:groupId,group_report_id:report.id,user_id:r.user_id,present:r.status!=='missing',attendance_status:r.status,checked_in_at:r.checked_in_at})));if(attendanceError)console.error('group report attendance failed',{message:attendanceError.message});else attendanceRecorded=attendanceRows.length}

  let guestsAdded=0,duplicateGuests=0
  const followUpDue=new Date(Date.now()+24*60*60*1000).toISOString(),owner=group.leader_id||userId
  for(const guest of namedGuests){const {error:guestError}=await supabase.from('outreach_contacts').insert({church_id:group.church_id,created_by:userId,assigned_to:owner,first_name:guest.first_name,last_name:guest.last_name,phone:guest.phone,email:guest.email,stage:'guest',bible_study_interest:false,messaging_consent:false,follow_up_due_at:followUpDue,notes:`Added from Friendship Group: ${group.name}${meetingDate?` • ${meetingDate}`:''}`});if(!guestError)guestsAdded++;else if(guestError.code==='23505')duplicateGuests++}

  const milestoneRows=[...baptismNames.map(person_name=>({person_name,milestone_type:'baptism'})),...holyGhostNames.map(person_name=>({person_name,milestone_type:'holy_ghost'}))]
  if(milestoneRows.length)await supabase.from('reported_milestones').insert(milestoneRows.map(m=>({church_id:group.church_id,group_id:groupId,group_report_id:report.id,reported_by:userId,person_name:m.person_name,milestone_type:m.milestone_type,occurred_on:meetingDate||null,status:'pending'})))

  revalidatePath(`/groups/${groupId}`);revalidatePath('/journey');revalidatePath('/outreach');revalidatePath('/church/analytics')
  const params=new URLSearchParams({reported:'1',attendance_recorded:String(attendanceRecorded)});if(guestsAdded)params.set('guests_added',String(guestsAdded));if(duplicateGuests)params.set('guest_duplicates',String(duplicateGuests));if(milestoneRows.length)params.set('milestones_queued',String(milestoneRows.length));redirect(`/groups/${groupId}?${params.toString()}`)
}
