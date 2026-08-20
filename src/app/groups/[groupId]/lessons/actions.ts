'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const refs=(v:string)=>v.split(/,|\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,30)

async function currentUser(){const supabase=await createClient(),{data}=await supabase.auth.getClaims(),userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}
async function leaderContext(groupId:string){
 const {supabase,userId}=await currentUser(),{data:group}=await supabase.from('groups').select('id,church_id,leader_id').eq('id',groupId).single()
 if(!group?.church_id)redirect('/groups?error='+encodeURIComponent('Group not found.'))
 const [{data:churchMembership},{data:groupMembership}]=await Promise.all([supabase.from('church_memberships').select('role,status').eq('church_id',group.church_id).eq('user_id',userId).eq('status','active').maybeSingle(),supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()])
 const canManage=group.leader_id===userId||groupMembership?.role==='leader'||['minister','pastor','church_admin'].includes(churchMembership?.role??'')
 if(!canManage)redirect(`/groups/${groupId}?error=`+encodeURIComponent('Only authorized group leadership can manage lessons.'))
 return{supabase,userId,group}
}

export async function createGroupLesson(formData:FormData){
 const groupId=text(formData,'group_id'),title=text(formData,'title'),body=text(formData,'body'),assetPath=text(formData,'source_asset_path')||null
 if(!groupId||!title||(!body&&!assetPath))redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('Add a lesson title and either lesson material or an uploaded file.'))
 const {supabase,userId,group}=await leaderContext(groupId)
 const {data:last}=await supabase.from('friendship_group_lessons').select('lesson_number').eq('church_id',group.church_id).eq('owner_group_id',groupId).order('lesson_number',{ascending:false}).limit(1).maybeSingle()
 const lessonNumber=(last?.lesson_number??0)+1,sourceRevision=`group:${groupId}`
 const content={summary:text(formData,'summary')||body.slice(0,300)||'Group lesson attachment',sections:body?[{heading:text(formData,'section_heading')||title,body}]:[],scripture_refs:refs(text(formData,'scripture_refs')),leader_discussion_prompts:refs(text(formData,'discussion_prompts'))}
 const {data:lesson,error}=await supabase.from('friendship_group_lessons').insert({church_id:group.church_id,owner_group_id:groupId,lesson_number:lessonNumber,title,opening_question:text(formData,'opening_question')||null,content,source_label:text(formData,'source_label')||'Friendship Group leader material',source_revision:sourceRevision,source_asset_path:assetPath,language_code:'en',published:true,created_by:userId}).select('id').single()
 if(error||!lesson){console.error('createGroupLesson failed',{message:error?.message});redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('We could not create that lesson.'))}
 const scheduled=text(formData,'scheduled_for');if(/^\d{4}-\d{2}-\d{2}$/.test(scheduled)){const {error:assignError}=await supabase.from('group_lesson_assignments').upsert({group_id:groupId,lesson_id:lesson.id,scheduled_for:scheduled,status:'scheduled',assigned_by:userId,teaching_note:text(formData,'teaching_note')||null,updated_at:new Date().toISOString()},{onConflict:'group_id,scheduled_for'});if(assignError)console.error('createGroupLesson assignment failed',{message:assignError.message})}
 revalidatePath(`/groups/${groupId}/lessons`);revalidatePath(`/groups/${groupId}`);redirect(`/groups/${groupId}/lessons?created=1`)
}

export async function updateGroupLesson(formData:FormData){
 const groupId=text(formData,'group_id'),lessonId=text(formData,'lesson_id'),title=text(formData,'title'),body=text(formData,'body')
 if(!groupId||!lessonId||!title)redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('Lesson title is required.'))
 const {supabase}=await leaderContext(groupId),{data:lesson}=await supabase.from('friendship_group_lessons').select('content,source_asset_path').eq('id',lessonId).eq('owner_group_id',groupId).maybeSingle()
 if(!lesson)redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('That group lesson is not available to edit.'))
 const old:any=lesson.content||{},content={...old,summary:text(formData,'summary')||old.summary||body.slice(0,300),sections:body?[{heading:text(formData,'section_heading')||title,body}]:old.sections||[],scripture_refs:refs(text(formData,'scripture_refs')),leader_discussion_prompts:refs(text(formData,'discussion_prompts'))}
 const {error}=await supabase.from('friendship_group_lessons').update({title,opening_question:text(formData,'opening_question')||null,content,source_label:text(formData,'source_label')||'Friendship Group leader material',source_asset_path:text(formData,'source_asset_path')||lesson.source_asset_path||null,updated_at:new Date().toISOString()}).eq('id',lessonId).eq('owner_group_id',groupId)
 if(error){console.error('updateGroupLesson failed',{message:error.message});redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('We could not update that lesson.'))}
 revalidatePath(`/groups/${groupId}/lessons`);revalidatePath(`/groups/${groupId}`);redirect(`/groups/${groupId}/lessons?updated=1`)
}

export async function archiveGroupLesson(formData:FormData){
 const groupId=text(formData,'group_id'),lessonId=text(formData,'lesson_id');if(!groupId||!lessonId)redirect(`/groups/${groupId}/lessons`)
 const {supabase}=await leaderContext(groupId),{error}=await supabase.from('friendship_group_lessons').update({published:false,updated_at:new Date().toISOString()}).eq('id',lessonId).eq('owner_group_id',groupId)
 if(error){console.error('archiveGroupLesson failed',{message:error.message});redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('We could not archive that lesson.'))}
 revalidatePath(`/groups/${groupId}/lessons`);redirect(`/groups/${groupId}/lessons?archived=1`)
}

export async function assignGroupLesson(formData:FormData){
 const groupId=text(formData,'group_id'),lessonId=text(formData,'lesson_id'),scheduledFor=text(formData,'scheduled_for')
 if(!groupId||!lessonId||!/^\d{4}-\d{2}-\d{2}$/.test(scheduledFor))redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('Choose a lesson and meeting date.'))
 const {supabase,userId,group}=await leaderContext(groupId),{data:lesson}=await supabase.from('friendship_group_lessons').select('id').eq('id',lessonId).eq('church_id',group.church_id).eq('published',true).maybeSingle()
 if(!lesson)redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('That lesson is not available to this group.'))
 const {error}=await supabase.from('group_lesson_assignments').upsert({group_id:groupId,lesson_id:lesson.id,scheduled_for:scheduledFor,status:'scheduled',assigned_by:userId,teaching_note:text(formData,'teaching_note')||null,updated_at:new Date().toISOString()},{onConflict:'group_id,scheduled_for'})
 if(error){console.error('assignGroupLesson failed',{message:error.message});redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('We could not schedule that lesson.'))}
 revalidatePath(`/groups/${groupId}/lessons`);revalidatePath(`/groups/${groupId}`);redirect(`/groups/${groupId}/lessons?assigned=1`)
}

export async function cancelGroupLessonAssignment(formData:FormData){
 const groupId=text(formData,'group_id'),assignmentId=text(formData,'assignment_id');if(!groupId||!assignmentId)redirect(`/groups/${groupId}/lessons`)
 const {supabase}=await leaderContext(groupId),{error}=await supabase.from('group_lesson_assignments').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',assignmentId).eq('group_id',groupId)
 if(error){console.error('cancelGroupLessonAssignment failed',{message:error.message});redirect(`/groups/${groupId}/lessons?error=`+encodeURIComponent('We could not cancel that lesson assignment.'))}
 revalidatePath(`/groups/${groupId}/lessons`);revalidatePath(`/groups/${groupId}`);redirect(`/groups/${groupId}/lessons?cancelled=1`)
}
