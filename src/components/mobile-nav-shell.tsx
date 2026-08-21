import { createClient } from '@/lib/supabase/server'
import { MobileNav, type MobileNavAccess } from './mobile-nav'

const privilegedBaseRoles=new Set(['pastor','church_admin'])
const allFeatureGatedNav=['documents','prayer','messages','serve','directory','updates','private_care','library','outreach']

export async function MobileNavShell(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)return null
  const preferredLanguage=(claims?.claims as any)?.user_metadata?.preferred_language==='es'?'es':'en'

  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  if(!membership?.church_id)return null

  const churchId=membership.church_id,role=membership.role,isPrivileged=privilegedBaseRoles.has(role)
  const permission=async(key:string)=>{const {data}=await supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:key});return Boolean(data)}

  const [manageGroups,leadOwnGroup,manageTeams,manageLearning,manageOutreach,manageCalendar,viewLeadership,featureResult,formsResult]=await Promise.all([
    permission('manage_groups'),permission('lead_own_group'),permission('manage_teams'),permission('manage_learning'),permission('manage_outreach'),permission('manage_calendar'),permission('view_leadership'),
    supabase.from('church_feature_settings').select('feature_key,enabled').eq('church_id',churchId).eq('enabled',false),
    supabase.from('church_forms').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('published',true).is('archived_at',null)
  ])
  if(featureResult.error)console.info('feature settings unavailable; hiding gated navigation',{code:featureResult.error.code})
  if(formsResult.error)console.info('published forms lookup unavailable',{code:formsResult.error.code})

  const access:MobileNavAccess={
    canLeadGroups:isPrivileged||role==='group_leader'||manageGroups||leadOwnGroup,
    canManageTeams:isPrivileged||role==='ministry_leader'||role==='minister'||manageTeams,
    canManageLearning:isPrivileged||role==='minister'||manageLearning,
    canManageOutreach:isPrivileged||role==='minister'||manageOutreach,
    canManageCalendar:isPrivileged||role==='ministry_leader'||role==='minister'||manageCalendar,
    canViewLeadership:isPrivileged||viewLeadership,
    canManageChurch:isPrivileged,
    hasForms:!formsResult.error&&(formsResult.count??0)>0,
    disabledFeatures:featureResult.error?allFeatureGatedNav:(featureResult.data??[]).map((row:any)=>String(row.feature_key))
  }

  return <MobileNav access={access} preferredLanguage={preferredLanguage}/>
}
