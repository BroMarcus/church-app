'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const MANAGER_ROLES=new Set(['ministry_leader','minister','pastor','church_admin'])
const ADMIN_ROLES=new Set(['ministry_leader','pastor','church_admin'])
const MEMBER_STATUSES=new Set(['active','on_leave','inactive'])

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const checked=(formData:FormData,key:string)=>['on','true','1','yes'].includes(text(formData,key).toLowerCase())
const langOf=(formData:FormData)=>text(formData,'lang')==='es'?'es':'en'
const manageUrl=(lang:string,extra='')=>`/teams/manage?lang=${lang}${extra}`
const safeError=(lang:string,en:string,es:string)=>lang==='es'?es:en

function errorText(error:unknown){
  return error instanceof Error?error.message:'Unknown error'
}

async function auth(lang:string){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  return {supabase,userId}
}

async function permissions(lang:string){
  const {supabase,userId}=await auth(lang)
  const {data:membership,error}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(error||!membership?.church_id)redirect('/')
  const [teamsPermission,ministriesPermission]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_teams'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_ministries'})
  ])
  const canManageTeams=MANAGER_ROLES.has(membership.role)||Boolean(teamsPermission.data)
  const canManageMinistries=ADMIN_ROLES.has(membership.role)||Boolean(ministriesPermission.data)
  if(!canManageTeams&&!canManageMinistries)redirect(`/teams?lang=${lang}`)
  return {supabase,userId,churchId:membership.church_id,canManageTeams,canManageMinistries}
}

export async function createTeam(formData:FormData){
  const lang=langOf(formData)
  const {supabase,churchId,canManageMinistries}=await permissions(lang)
  if(!canManageMinistries)redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'You do not have permission to create teams.','No tienes permiso para crear equipos.'))))
  const name=text(formData,'name')
  if(name.length<2)redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'Team name must be at least 2 characters.','El nombre del equipo debe tener al menos 2 caracteres.'))))
  const openingsText=text(formData,'openings')
  const openings=openingsText?Math.max(0,Number.parseInt(openingsText,10)||0):null
  const {error}=await supabase.from('ministries').insert({church_id:churchId,name,description:text(formData,'description')||null,openings,active:true})
  if(error){
    console.error('createTeam failed',{churchId,code:error.code,message:error.message})
    redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'We could not create that team. Please try again.','No pudimos crear ese equipo. Inténtalo de nuevo.'))))
  }
  revalidatePath('/teams');revalidatePath('/teams/manage');revalidatePath('/serve')
  redirect(manageUrl(lang,'&team_created=1'))
}

export async function updateTeam(formData:FormData){
  const lang=langOf(formData)
  const {supabase,churchId,canManageMinistries}=await permissions(lang)
  if(!canManageMinistries)redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'You do not have permission to edit teams.','No tienes permiso para editar equipos.'))))
  const teamId=text(formData,'team_id'),name=text(formData,'name')
  if(!teamId||name.length<2)redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'Team name is required.','Se requiere el nombre del equipo.'))))
  const openingsText=text(formData,'openings')
  const openings=openingsText?Math.max(0,Number.parseInt(openingsText,10)||0):null
  const {error}=await supabase.from('ministries').update({name,description:text(formData,'description')||null,openings,active:checked(formData,'active')}).eq('id',teamId).eq('church_id',churchId)
  if(error){
    console.error('updateTeam failed',{churchId,teamId,code:error.code,message:error.message})
    redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'We could not save the team changes.','No pudimos guardar los cambios del equipo.'))))
  }
  revalidatePath('/teams');revalidatePath('/teams/manage');revalidatePath('/serve')
  redirect(manageUrl(lang,'&team_saved=1'))
}

export async function addTeamMember(formData:FormData){
  const lang=langOf(formData)
  const {supabase,churchId,canManageTeams}=await permissions(lang)
  if(!canManageTeams)redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'You do not have permission to manage team rosters.','No tienes permiso para administrar las listas de equipos.'))))
  const ministryId=text(formData,'ministry_id'),userId=text(formData,'user_id'),roleLabel=text(formData,'role_label')||safeError(lang,'Member','Miembro')
  if(!ministryId||!userId)redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'Choose a team and church member.','Escoge un equipo y un miembro de la iglesia.'))))
  const [{data:ministry},{data:member}]=await Promise.all([
    supabase.from('ministries').select('id').eq('id',ministryId).eq('church_id',churchId).maybeSingle(),
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',userId).eq('status','active').maybeSingle()
  ])
  if(!ministry||!member)redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'That team or member is not available in this church.','Ese equipo o miembro no está disponible en esta iglesia.'))))
  const {error}=await supabase.from('ministry_team_members').upsert({church_id:churchId,ministry_id:ministryId,user_id:userId,role_label:roleLabel.slice(0,80),is_leader:checked(formData,'is_leader'),member_status:'active',updated_at:new Date().toISOString()},{onConflict:'ministry_id,user_id'})
  if(error){
    console.error('addTeamMember failed',{churchId,ministryId,userId,code:error.code,message:error.message})
    redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'We could not add that person to the team.','No pudimos agregar a esa persona al equipo.'))))
  }
  revalidatePath('/teams');revalidatePath('/teams/manage');revalidatePath('/calendar/manage')
  redirect(manageUrl(lang,`&member_added=1#team-${ministryId}`))
}

export async function updateTeamMember(formData:FormData){
  const lang=langOf(formData)
  const {supabase,churchId,canManageTeams}=await permissions(lang)
  if(!canManageTeams)redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'You do not have permission to manage team rosters.','No tienes permiso para administrar las listas de equipos.'))))
  const memberId=text(formData,'team_member_id'),ministryId=text(formData,'ministry_id'),roleLabel=text(formData,'role_label'),status=text(formData,'member_status')
  if(!memberId||!ministryId||roleLabel.length<1||!MEMBER_STATUSES.has(status))redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'The roster update is incomplete.','La actualización de la lista está incompleta.'))))
  const {error}=await supabase.from('ministry_team_members').update({role_label:roleLabel.slice(0,80),is_leader:checked(formData,'is_leader'),member_status:status,updated_at:new Date().toISOString()}).eq('id',memberId).eq('church_id',churchId).eq('ministry_id',ministryId)
  if(error){
    console.error('updateTeamMember failed',{churchId,memberId,ministryId,code:error.code,message:error.message})
    redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'We could not save that roster change.','No pudimos guardar ese cambio de la lista.'))))
  }
  revalidatePath('/teams');revalidatePath('/teams/manage');revalidatePath('/calendar/manage')
  redirect(manageUrl(lang,`&member_saved=1#team-${ministryId}`))
}

export async function reactivateTeamMember(formData:FormData){
  const lang=langOf(formData)
  const {supabase,churchId,canManageTeams}=await permissions(lang)
  if(!canManageTeams)redirect(manageUrl(lang))
  const memberId=text(formData,'team_member_id'),ministryId=text(formData,'ministry_id')
  if(!memberId||!ministryId)redirect(manageUrl(lang))
  const {error}=await supabase.from('ministry_team_members').update({member_status:'active',updated_at:new Date().toISOString()}).eq('id',memberId).eq('church_id',churchId).eq('ministry_id',ministryId)
  if(error){
    console.error('reactivateTeamMember failed',{churchId,memberId,message:errorText(error)})
    redirect(manageUrl(lang,'&error='+encodeURIComponent(safeError(lang,'We could not reactivate that team member.','No pudimos reactivar a ese miembro del equipo.'))))
  }
  revalidatePath('/teams/manage');revalidatePath('/calendar/manage')
  redirect(manageUrl(lang,`&member_saved=1#team-${ministryId}`))
}
