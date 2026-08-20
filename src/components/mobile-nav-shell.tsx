import { createClient } from '@/lib/supabase/server'
import { MobileNav, type MobileNavAccess } from './mobile-nav'

const privilegedBaseRoles=new Set(['pastor','church_admin'])

export async function MobileNavShell(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)return null

  const {data:membership}=await supabase
    .from('church_memberships')
    .select('church_id,role')
    .eq('user_id',userId)
    .eq('status','active')
    .limit(1)
    .maybeSingle()

  if(!membership?.church_id)return null

  const churchId=membership.church_id
  const role=membership.role
  const isPrivileged=privilegedBaseRoles.has(role)
  const permission=async(key:string)=>{
    const {data}=await supabase.rpc('current_user_has_church_permission',{
      p_church_id:churchId,
      p_permission_key:key
    })
    return Boolean(data)
  }

  const [manageGroups,leadOwnGroup,manageTeams,manageLearning,manageOutreach,manageCalendar,viewLeadership]=await Promise.all([
    permission('manage_groups'),
    permission('lead_own_group'),
    permission('manage_teams'),
    permission('manage_learning'),
    permission('manage_outreach'),
    permission('manage_calendar'),
    permission('view_leadership')
  ])

  const access:MobileNavAccess={
    canLeadGroups:isPrivileged||role==='group_leader'||manageGroups||leadOwnGroup,
    canManageTeams:isPrivileged||role==='ministry_leader'||role==='minister'||manageTeams,
    canManageLearning:isPrivileged||role==='minister'||manageLearning,
    canManageOutreach:isPrivileged||role==='minister'||manageOutreach,
    canManageCalendar:isPrivileged||role==='ministry_leader'||role==='minister'||manageCalendar,
    canViewLeadership:isPrivileged||viewLeadership
  }

  return <MobileNav access={access}/>
}
