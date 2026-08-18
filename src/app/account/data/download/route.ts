import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const [profile,privateDetails,memberships,milestones,badges,enrollments,moduleProgress,groupMemberships,teamAssignments,documents,notifications,posts,comments,reactions,careRequests]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',userId).maybeSingle(),
    supabase.from('member_private_details').select('*').eq('user_id',userId).maybeSingle(),
    supabase.from('church_memberships').select('*').eq('user_id',userId),
    supabase.from('member_milestones').select('*').eq('user_id',userId),
    supabase.from('member_badges').select('*').eq('user_id',userId),
    supabase.from('course_enrollments').select('*').eq('user_id',userId),
    supabase.from('course_module_progress').select('*').eq('user_id',userId),
    supabase.from('group_memberships').select('*').eq('user_id',userId),
    supabase.from('team_assignments').select('*').eq('assigned_user_id',userId),
    supabase.from('member_documents').select('id,church_id,owner_user_id,document_type,title,issued_at,expires_at,verification_status,issuer,notes,verification_notes,verified_at,created_at,updated_at').eq('owner_user_id',userId),
    supabase.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
    supabase.from('community_posts').select('*').eq('author_id',userId).order('created_at',{ascending:false}),
    supabase.from('post_comments').select('*').eq('author_id',userId).order('created_at',{ascending:false}),
    supabase.from('post_reactions').select('*').eq('user_id',userId),
    supabase.from('care_requests').select('*').eq('user_id',userId).order('created_at',{ascending:false})
  ])

  const payload={
    exported_at:new Date().toISOString(),
    scope:'Kingdom Network personal data export',
    notes:[
      'Private one-to-one message bodies are not included in this automated bundle.',
      'Uploaded document file bytes are not included; document metadata is included.',
      'Church leadership audit records and other members’ records are not included.'
    ],
    profile:profile.data,
    private_details:privateDetails.data,
    church_memberships:memberships.data??[],
    verified_milestones:milestones.data??[],
    badges:badges.data??[],
    course_enrollments:enrollments.data??[],
    lesson_progress:moduleProgress.data??[],
    group_memberships:groupMemberships.data??[],
    team_assignments:teamAssignments.data??[],
    document_metadata:documents.data??[],
    notifications:notifications.data??[],
    community_posts:posts.data??[],
    community_comments:comments.data??[],
    community_reactions:reactions.data??[],
    pastoral_care_requests:careRequests.data??[]
  }
  const body=JSON.stringify(payload,null,2)
  return new Response(body,{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="kingdom-network-my-data-${new Date().toISOString().slice(0,10)}.json"`,'Cache-Control':'no-store'}})
}
