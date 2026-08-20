'use client'

import { FormEvent,useState } from 'react'
import { CheckCircle2,Clock3,Plus,ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Task={id:string;title:string;notes:string|null;due_at:string|null;status:string;priority:string;created_by:string}
type TimeOff={id:string;starts_on:string;ends_on:string;notes:string|null;status:string}

export function PersonalPlanning({churchId,tasks,timeOff,lang}:{churchId:string;tasks:Task[];timeOff:TimeOff[];lang:'en'|'es';timeZone:string}){
  const es=lang==='es'
  const router=useRouter()
  const [busy,setBusy]=useState<string|null>(null)
  const [error,setError]=useState('')
  const t=es?{
    title:'Mi planificación',body:'Agrega recordatorios personales y avisa a liderazgo cuando no estarás disponible.',tasks:'MIS TAREAS',newTask:'Agregar tarea',taskTitle:'¿Qué necesitas hacer?',notes:'Notas (opcional)',due:'Fecha y hora (opcional)',priority:'Prioridad',normal:'Normal',high:'Alta',add:'Agregar',adding:'Agregando…',done:'Marcar listo',empty:'No tienes tareas pendientes.',away:'NO ESTOY DISPONIBLE',awayBody:'Envía las fechas para que liderazgo pueda verlas al preparar horarios.',start:'Desde',end:'Hasta',send:'Enviar fechas',sending:'Enviando…',noneAway:'No tienes fechas próximas registradas.',pending:'Pendiente',approved:'Aprobado',declined:'No aprobado',failed:'No se pudo guardar. Inténtalo otra vez.'
  }:{
    title:'My planning',body:'Add personal reminders and tell leadership when you will not be available.',tasks:'MY TASKS',newTask:'Add a task',taskTitle:'What do you need to do?',notes:'Notes (optional)',due:'Date & time (optional)',priority:'Priority',normal:'Normal',high:'High',add:'Add task',adding:'Adding…',done:'Mark done',empty:'No open tasks right now.',away:'I AM UNAVAILABLE',awayBody:'Send dates so leadership can see them while preparing schedules.',start:'From',end:'Through',send:'Send dates',sending:'Sending…',noneAway:'No upcoming unavailable dates saved.',pending:'Pending',approved:'Approved',declined:'Not approved',failed:'Could not save that. Please try again.'
  }

  async function userId(){const supabase=createClient();const {data}=await supabase.auth.getUser();return {supabase,id:data.user?.id}}

  async function addTask(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');setBusy('task')
    const form=new FormData(event.currentTarget),title=String(form.get('title')||'').trim()
    if(!title){setBusy(null);return}
    const {supabase,id}=await userId();if(!id){setError(t.failed);setBusy(null);return}
    const due=String(form.get('due_at')||'').trim()
    const {error:e}=await supabase.from('member_tasks').insert({church_id:churchId,assigned_to:id,created_by:id,title,notes:String(form.get('notes')||'').trim()||null,due_at:due?new Date(due).toISOString():null,priority:String(form.get('priority')||'normal')})
    if(e){setError(t.failed);setBusy(null);return}
    event.currentTarget.reset();setBusy(null);router.refresh()
  }

  async function completeTask(id:string){
    setError('');setBusy(id);const {supabase}=await userId()
    const {error:e}=await supabase.from('member_tasks').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',id)
    if(e)setError(t.failed);setBusy(null);router.refresh()
  }

  async function addTimeOff(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');setBusy('timeoff')
    const form=new FormData(event.currentTarget),starts=String(form.get('starts_on')||''),ends=String(form.get('ends_on')||'')
    if(!starts||!ends||ends<starts){setError(t.failed);setBusy(null);return}
    const {supabase,id}=await userId();if(!id){setError(t.failed);setBusy(null);return}
    const {error:e}=await supabase.from('member_time_off').insert({church_id:churchId,user_id:id,starts_on:starts,ends_on:ends,notes:String(form.get('notes')||'').trim()||null,status:'pending'})
    if(e){setError(t.failed);setBusy(null);return}
    event.currentTarget.reset();setBusy(null);router.refresh()
  }

  const status=(value:string)=>value==='approved'?t.approved:value==='declined'?t.declined:t.pending
  return <section className="card" style={{padding:18,marginBottom:18}}>
    <div className="pill"><ShieldCheck size={11}/> {t.title.toUpperCase()}</div><h2 style={{margin:'8px 0 5px'}}>{t.title}</h2><p className="small muted">{t.body}</p>
    {error&&<div className="notice error">{error}</div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:18,marginTop:16}}>
      <div><div className="pill">{t.tasks}</div><div style={{display:'grid',gap:8,margin:'10px 0 14px'}}>{tasks.map(task=><div className="card" style={{padding:12}} key={task.id}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div><strong>{task.title}</strong>{task.notes&&<div className="small muted">{task.notes}</div>}{task.due_at&&<div className="small muted"><Clock3 size={11}/> {new Date(task.due_at).toLocaleString()}</div>}</div><button className="ghost" type="button" onClick={()=>completeTask(task.id)} disabled={busy===task.id}><CheckCircle2 size={13}/> {t.done}</button></div></div>)}{!tasks.length&&<p className="small muted">{t.empty}</p>}</div>
        <form onSubmit={addTask} style={{display:'grid',gap:9}}><strong><Plus size={13}/> {t.newTask}</strong><input name="title" placeholder={t.taskTitle} required/><textarea name="notes" rows={2} placeholder={t.notes}/><label className="field"><span>{t.due}</span><input name="due_at" type="datetime-local"/></label><label className="field"><span>{t.priority}</span><select name="priority" defaultValue="normal"><option value="normal">{t.normal}</option><option value="high">{t.high}</option></select></label><button className="btn" disabled={busy==='task'}>{busy==='task'?t.adding:t.add}</button></form>
      </div>
      <div><div className="pill">{t.away}</div><p className="small muted">{t.awayBody}</p><form onSubmit={addTimeOff} style={{display:'grid',gap:9}}><label className="field"><span>{t.start}</span><input name="starts_on" type="date" required/></label><label className="field"><span>{t.end}</span><input name="ends_on" type="date" required/></label><textarea name="notes" rows={2} placeholder={t.notes}/><button className="ghost" disabled={busy==='timeoff'}>{busy==='timeoff'?t.sending:t.send}</button></form><div style={{display:'grid',gap:8,marginTop:14}}>{timeOff.map(row=><div className="notice" style={{margin:0}} key={row.id}><strong>{row.starts_on}{row.ends_on!==row.starts_on?` → ${row.ends_on}`:''}</strong><div className="small muted">{status(row.status)}{row.notes?` • ${row.notes}`:''}</div></div>)}{!timeOff.length&&<p className="small muted">{t.noneAway}</p>}</div></div>
    </div>
  </section>
}
