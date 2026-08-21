import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {churchDateParts,formatRecurringMeeting} from '@/lib/church-time'
import {FriendshipPortalClient} from './portal-client'
import './portal.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'
const dayIndex:Record<string,number>={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6}
const validTabs=new Set(['overview','attendance','report','lessons','members','prayer'])

function meetingDateForThisWeek(meetingDay:string|null|undefined,timeZone:string){
  const parts=churchDateParts(new Date(),timeZone)
  const today=`${parts.year}-${parts.month}-${parts.day}`
  const target=meetingDay?dayIndex[meetingDay]:undefined
  if(target===undefined)return today
  const date=new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate()+(target-date.getUTCDay()))
  return date.toISOString().slice(0,10)
}

function localDateOf(iso:string,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso))
  const get=(type:string)=>parts.find(part=>part.type===type)?.value??''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export default async function FriendshipPortalPage({params,searchParams}:{params:Promise<{groupId:string}>;searchParams:Promise<{tab?:string;attendance_saved?:string;guidelines_saved?:string;error?:string}>}){
  const [{groupId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')

  const {data:churchMembership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!churchMembership?.church_id)redirect('/')

  const church:any=Array.isArray(churchMembership.churches)?churchMembership.churches[0]:churchMembership.churches
  const timeZone=church?.timezone||'America/Los_Angeles'
  const {data:group}=await supabase.from('groups').select('*').eq('id',groupId).eq('church_id',churchMembership.church_id).single()
  if(!group)redirect('/groups?error='+encodeURIComponent('Group not found.'))

  const isAdmin=['pastor','church_admin'].includes(churchMembership.role)
  const {data:myMembership}=await supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  const canManage=isAdmin||group.leader_id===userId||myMembership?.role==='leader'
  const canReport=canManage||myMembership?.role==='assistant'
  const canViewPrivate=isAdmin||group.leader_id===userId||Boolean(myMembership)
  const meetingDate=meetingDateForThisWeek(group.meeting_day,timeZone)

  const [rosterResult,privateResult,reportsResult,lessonsResult,prayerResult,allGroupsResult,attendanceDraftResult,guidelinesResult,scheduleResult]=await Promise.all([
    canViewPrivate?supabase.from('group_memberships').select('user_id,role,joined_at').eq('group_id',groupId).order('joined_at'):Promise.resolve({data:[] as any[]}),
    canViewPrivate?supabase.from('group_private_details').select('meeting_address,access_notes').eq('group_id',groupId).maybeSingle():Promise.resolve({data:null}),
    canReport?supabase.from('group_reports').select('id,meeting_date,attendance_count,first_time_guests,prayer_needs,general_notes,created_at').eq('group_id',groupId).order('meeting_date',{ascending:false}).limit(12):Promise.resolve({data:[] as any[]}),
    canViewPrivate?supabase.from('group_lesson_assignments').select('id,scheduled_for,status,teaching_note,friendship_group_lessons(id,title,lesson_number,source_asset_path)').eq('group_id',groupId).neq('status','cancelled').order('scheduled_for',{ascending:false}).limit(20):Promise.resolve({data:[] as any[]}),
    canViewPrivate?supabase.from('prayer_requests').select('id,user_id,body,status,created_at').eq('group_id',groupId).eq('share_with_group',true).order('created_at',{ascending:false}).limit(25):Promise.resolve({data:[] as any[]}),
    supabase.from('groups').select('id,name,leader_id,meeting_day,meeting_time,meeting_frequency,location_label,capacity,accepting_members,active').eq('church_id',churchMembership.church_id).eq('group_type','friendship').eq('active',true).order('name'),
    canReport?supabase.from('group_attendance_drafts').select('user_id,attendance_status').eq('group_id',groupId).eq('meeting_date',meetingDate):Promise.resolve({data:[] as any[]}),
    canViewPrivate?supabase.from('group_guidelines').select('body,updated_at').eq('group_id',groupId).maybeSingle():Promise.resolve({data:null}),
    canViewPrivate?supabase.from('church_schedules').select('id,name').eq('church_id',churchMembership.church_id).eq('group_id',groupId).eq('active',true).order('created_at').limit(1).maybeSingle():Promise.resolve({data:null})
  ])

  const roster:any[]=rosterResult.data??[],reports:any[]=reportsResult.data??[],lessonAssignments:any[]=lessonsResult.data??[],prayers:any[]=prayerResult.data??[],allGroups:any[]=allGroupsResult.data??[]
  const attendanceDraft=Object.fromEntries(((attendanceDraftResult as any).data??[]).map((row:any)=>[row.user_id,row.attendance_status]))
  const groupSchedule:any=(scheduleResult as any).data??null
  let weeklyAssignments:any[]=[]
  if(groupSchedule?.id){
    const center=Date.parse(`${meetingDate}T12:00:00Z`),windowStart=new Date(center-36*60*60*1000).toISOString(),windowEnd=new Date(center+36*60*60*1000).toISOString()
    const {data:items}=await supabase.from('schedule_items').select('id,starts_at,title').eq('schedule_id',groupSchedule.id).eq('status','scheduled').gte('starts_at',windowStart).lte('starts_at',windowEnd).order('starts_at')
    const weeklyItem=(items??[]).find((item:any)=>localDateOf(item.starts_at,timeZone)===meetingDate)
    if(weeklyItem?.id){
      const {data}=await supabase.from('team_assignments').select('id,assigned_user_id,role_label,title,starts_at,assignment_status').eq('schedule_item_id',weeklyItem.id).eq('assignment_status','scheduled').order('role_label')
      weeklyAssignments=data??[]
    }
  }

  const profileIds=Array.from(new Set([...roster.map((r:any)=>r.user_id),...prayers.map((p:any)=>p.user_id),...allGroups.map((g:any)=>g.leader_id),...weeklyAssignments.map((a:any)=>a.assigned_user_id),group.leader_id].filter(Boolean))) as string[]
  let profiles:any[]=[]
  if(profileIds.length){const result=await supabase.from('profiles').select('id,display_name,first_name,last_name,avatar_path').in('id',profileIds);profiles=result.data??[]}
  const profileMap=new Map(profiles.map((p:any)=>[p.id,p]))

  const allGroupIds=allGroups.map((g:any)=>g.id)
  let counts=new Map<string,number>()
  if(allGroupIds.length){const {data:members}=await supabase.from('group_memberships').select('group_id').in('group_id',allGroupIds);counts=new Map();for(const row of members??[])counts.set(row.group_id,(counts.get(row.group_id)||0)+1)}

  const rosterView=roster.map((r:any)=>({userId:r.user_id,name:personName(profileMap.get(r.user_id)),role:r.role,avatarPath:profileMap.get(r.user_id)?.avatar_path??null}))
  const prayerView=prayers.map((r:any)=>({...r,name:personName(profileMap.get(r.user_id))}))
  const lessonView=lessonAssignments.map((a:any)=>{const lesson=Array.isArray(a.friendship_group_lessons)?a.friendship_group_lessons[0]:a.friendship_group_lessons;return {id:a.id,scheduledFor:a.scheduled_for,status:a.status,teachingNote:a.teaching_note,title:lesson?.title||'Scheduled lesson',lessonNumber:lesson?.lesson_number??null,assetPath:lesson?.source_asset_path??null}})
  const groupList=allGroups.map((g:any)=>({id:g.id,name:g.name,leader:personName(profileMap.get(g.leader_id)),day:g.meeting_day,time:g.meeting_time,frequency:g.meeting_frequency,place:g.location_label||'Location shared after joining',members:counts.get(g.id)||0,capacity:g.capacity,acceptingMembers:g.accepting_members}))
  const weeklyRoles=weeklyAssignments.map((a:any)=>({id:a.id,userId:a.assigned_user_id,name:personName(profileMap.get(a.assigned_user_id)),roleLabel:a.role_label||a.title||'Group role'}))

  const attendanceAverage=reports.length&&roster.length?Math.round(reports.reduce((sum:number,r:any)=>sum+Math.min(100,(Number(r.attendance_count||0)/Math.max(1,roster.length))*100),0)/reports.length):null
  const schedule=formatRecurringMeeting(group.meeting_frequency,group.meeting_day,group.meeting_time,'en')
  const initialTab=query.tab&&validTabs.has(query.tab)?query.tab:'overview'

  return <FriendshipPortalClient
    group={{id:group.id,name:group.name,description:group.description,schedule,day:group.meeting_day,time:group.meeting_time,place:(privateResult as any).data?.meeting_address||group.location_label||'Location shared with members',memberCount:roster.length,attendanceAverage}}
    roster={rosterView} reports={reports} lessons={lessonView} prayers={prayerView} allGroups={groupList}
    canManage={canManage} canReport={canReport} canViewPrivate={canViewPrivate} currentGroupId={groupId}
    attendanceDraft={attendanceDraft} meetingDate={meetingDate} attendanceSaved={query.attendance_saved==='1'} portalError={query.error||null} initialTab={initialTab}
    guidelines={(guidelinesResult as any).data?.body??''} guidelinesSaved={query.guidelines_saved==='1'} weeklyRoles={weeklyRoles} scheduleId={groupSchedule?.id??null}
  />
}
