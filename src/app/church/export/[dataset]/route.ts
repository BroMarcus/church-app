import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { csvResponse,toCsv } from '@/lib/csv'

const nameOf=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||''
const safeName=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'church'

async function context(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  return {supabase,churchId:membership.church_id,churchName:church?.name||'church'}
}

export async function GET(_request:Request,{params}:{params:Promise<{dataset:string}>}){
  const {dataset}=await params
  const {supabase,churchId,churchName}=await context()
  const prefix=`${safeName(churchName)}-${new Date().toISOString().slice(0,10)}`

  if(dataset==='members'){
    const {data:memberships}=await supabase.from('church_memberships').select('*').eq('church_id',churchId).order('created_at')
    const ids=(memberships??[]).map((m:any)=>m.user_id)
    let profiles:any[]=[];let details:any[]=[]
    if(ids.length){const [p,d]=await Promise.all([supabase.from('profiles').select('*').in('id',ids),supabase.from('member_private_details').select('*').in('user_id',ids)]);profiles=p.data??[];details=d.data??[]}
    const pm=new Map(profiles.map((p:any)=>[p.id,p]));const dm=new Map(details.map((d:any)=>[d.user_id,d]))
    const headers=['member_id','display_name','first_name','last_name','role','status','joined_at','login_email','contact_email','show_contact_email','phone','birthday','address_line1','address_line2','city','state','postal_code','bio']
    const rows=(memberships??[]).map((m:any)=>{const p=pm.get(m.user_id)||{};const d=dm.get(m.user_id)||{};return [m.user_id,p.display_name,p.first_name,p.last_name,m.role,m.status,m.joined_at,d.email,p.contact_email,p.show_contact_email,d.phone,d.birthday||d.birth_date,d.address_line1||d.address,d.address_line2,d.city,d.state,d.postal_code||d.zip_code,p.bio]})
    return csvResponse(`${prefix}-members.csv`,toCsv(headers,rows))
  }

  if(dataset==='groups'){
    const [{data:groups},{data:memberships}]=await Promise.all([supabase.from('groups').select('*').eq('church_id',churchId).order('name'),supabase.from('group_memberships').select('*')])
    const groupIds=(groups??[]).map((g:any)=>g.id);const relevant=(memberships??[]).filter((m:any)=>groupIds.includes(m.group_id));const ids=Array.from(new Set(relevant.map((m:any)=>m.user_id)))
    let profiles:any[]=[];if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
    const pm=new Map(profiles.map((p:any)=>[p.id,p]));const gm=new Map<string,any[]>();for(const m of relevant){const list=gm.get(m.group_id)??[];list.push(m);gm.set(m.group_id,list)}
    const headers=['group_id','group_name','group_type','description','meeting_day','meeting_time','frequency','language','public_area','capacity','accepting_members','active','member_id','member_name','group_role','joined_at']
    const rows:any[][]=[]
    for(const g of groups??[]){const members=gm.get(g.id)??[];if(!members.length)rows.push([g.id,g.name,g.group_type,g.description,g.meeting_day,g.meeting_time,g.meeting_frequency,g.language_code,g.location_label,g.capacity,g.accepting_members,g.active,'','','','']);else for(const m of members)rows.push([g.id,g.name,g.group_type,g.description,g.meeting_day,g.meeting_time,g.meeting_frequency,g.language_code,g.location_label,g.capacity,g.accepting_members,g.active,m.user_id,nameOf(pm.get(m.user_id)),m.role,m.joined_at])}
    return csvResponse(`${prefix}-groups-roster.csv`,toCsv(headers,rows))
  }

  if(dataset==='outreach'){
    const {data:contacts}=await supabase.from('outreach_contacts').select('*').eq('church_id',churchId).order('updated_at',{ascending:false})
    const ids=Array.from(new Set((contacts??[]).flatMap((c:any)=>[c.created_by,c.assigned_to,c.member_user_id]).filter(Boolean)))
    let profiles:any[]=[];if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
    const pm=new Map(profiles.map((p:any)=>[p.id,p]))
    const headers=['outreach_id','first_name','last_name','phone','email','stage','assigned_to','created_by','linked_member','services_attended','bible_study_interest','bible_study_lesson','messaging_consent','follow_up_due_at','last_contacted_at','prayer_request','private_notes','created_at','updated_at']
    const rows=(contacts??[]).map((c:any)=>[c.id,c.first_name,c.last_name,c.phone,c.email,c.stage,nameOf(pm.get(c.assigned_to)),nameOf(pm.get(c.created_by)),nameOf(pm.get(c.member_user_id)),c.service_count,c.bible_study_interest,c.bible_study_lesson,c.messaging_consent,c.follow_up_due_at,c.last_contacted_at,c.prayer_request,c.notes,c.created_at,c.updated_at])
    return csvResponse(`${prefix}-outreach-confidential.csv`,toCsv(headers,rows))
  }

  if(dataset==='events'){
    const {data:events}=await supabase.from('events').select('*').eq('church_id',churchId).order('starts_at',{ascending:false})
    const headers=['event_id','title','event_type','starts_at','ends_at','location','audience','featured','registration_url','description','created_at']
    const rows=(events??[]).map((e:any)=>[e.id,e.title,e.event_type,e.starts_at,e.ends_at,e.location,e.audience_label,e.featured,e.registration_url,e.description,e.created_at])
    return csvResponse(`${prefix}-events.csv`,toCsv(headers,rows))
  }

  if(dataset==='ministries'){
    const {data:ministries}=await supabase.from('ministries').select('id,name').eq('church_id',churchId)
    const ministryIds=(ministries??[]).map((m:any)=>m.id);let applications:any[]=[]
    if(ministryIds.length){const r=await supabase.from('ministry_applications').select('*').in('ministry_id',ministryIds).order('submitted_at',{ascending:false});applications=r.data??[]}
    const userIds=Array.from(new Set(applications.map((a:any)=>a.user_id)));let profiles:any[]=[];if(userIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',userIds);profiles=r.data??[]}
    const pm=new Map(profiles.map((p:any)=>[p.id,p]));const mm=new Map((ministries??[]).map((m:any)=>[m.id,m.name]))
    const headers=['application_id','ministry','member_id','member_name','status','qualification_score','submitted_at','message','review_note','reviewed_at']
    const rows=applications.map((a:any)=>[a.id,mm.get(a.ministry_id),a.user_id,nameOf(pm.get(a.user_id)),a.status,a.qualification_score,a.submitted_at,a.message,a.review_note,a.reviewed_at])
    return csvResponse(`${prefix}-ministry-applications.csv`,toCsv(headers,rows))
  }

  if(dataset==='teams'){
    const {data:assignments}=await supabase.from('team_assignments').select('*').eq('church_id',churchId).order('starts_at',{ascending:false})
    const userIds=Array.from(new Set((assignments??[]).map((a:any)=>a.assigned_user_id)));const ministryIds=Array.from(new Set((assignments??[]).map((a:any)=>a.ministry_id).filter(Boolean)))
    let profiles:any[]=[];let ministries:any[]=[];let responses:any[]=[]
    if(userIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',userIds);profiles=r.data??[]}
    if(ministryIds.length){const r=await supabase.from('ministries').select('id,name').in('id',ministryIds);ministries=r.data??[]}
    const assignmentIds=(assignments??[]).map((a:any)=>a.id);if(assignmentIds.length){const r=await supabase.from('team_assignment_responses').select('*').in('assignment_id',assignmentIds);responses=r.data??[]}
    const pm=new Map(profiles.map((p:any)=>[p.id,p]));const mm=new Map(ministries.map((m:any)=>[m.id,m.name]));const rm=new Map(responses.map((r:any)=>[r.assignment_id,r]))
    const headers=['assignment_id','member_id','member_name','ministry','assignment','starts_at','call_time','confirmation_required','response','response_note','responded_at','notes']
    const rows=(assignments??[]).map((a:any)=>{const r=rm.get(a.id)||{};return [a.id,a.assigned_user_id,nameOf(pm.get(a.assigned_user_id)),mm.get(a.ministry_id)||'',a.title,a.starts_at,a.call_time,a.confirmation_required,r.response,r.note,r.responded_at,a.notes]})
    return csvResponse(`${prefix}-team-assignments.csv`,toCsv(headers,rows))
  }

  if(dataset==='documents'){
    const {data:docs}=await supabase.from('member_documents').select('*').eq('church_id',churchId).order('created_at',{ascending:false})
    const userIds=Array.from(new Set((docs??[]).map((d:any)=>d.owner_user_id)));let profiles:any[]=[];if(userIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',userIds);profiles=r.data??[]}
    const pm=new Map(profiles.map((p:any)=>[p.id,p]))
    const headers=['document_id','member_id','member_name','document_type','title','issuer','issued_at','expires_at','verification_status','verification_notes','verified_at','created_at']
    const rows=(docs??[]).map((d:any)=>[d.id,d.owner_user_id,nameOf(pm.get(d.owner_user_id)),d.document_type,d.title,d.issuer,d.issued_at,d.expires_at,d.verification_status,d.verification_notes,d.verified_at,d.created_at])
    return csvResponse(`${prefix}-document-metadata.csv`,toCsv(headers,rows))
  }

  if(dataset==='learning'){
    const {data:courses}=await supabase.from('courses').select('id,title,language_code,curriculum_version').eq('church_id',churchId)
    const courseIds=(courses??[]).map((c:any)=>c.id);let enrollments:any[]=[]
    if(courseIds.length){const r=await supabase.from('course_enrollments').select('*').in('course_id',courseIds);enrollments=r.data??[]}
    const userIds=Array.from(new Set(enrollments.map((e:any)=>e.user_id)));let profiles:any[]=[];if(userIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',userIds);profiles=r.data??[]}
    const pm=new Map(profiles.map((p:any)=>[p.id,p]));const cm=new Map((courses??[]).map((c:any)=>[c.id,c]))
    const headers=['member_id','member_name','course','language','curriculum_version','status','progress_percent','final_score','credential_earned','credential_earned_at','started_at','completed_at']
    const rows=enrollments.map((e:any)=>{const c:any=cm.get(e.course_id)||{};return [e.user_id,nameOf(pm.get(e.user_id)),c.title,c.language_code,c.curriculum_version,e.status,e.progress_percent,e.final_score,e.credential_earned,e.credential_earned_at,e.started_at,e.completed_at]})
    return csvResponse(`${prefix}-learning-progress.csv`,toCsv(headers,rows))
  }

  return new Response('Unknown export dataset',{status:404,headers:{'Cache-Control':'no-store'}})
}
