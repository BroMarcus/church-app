import { CalendarOff,CheckCircle2,ClipboardList,Clock3,Plus } from 'lucide-react'
import { cancelTimeOff,createPersonalTask,submitTimeOff,updatePersonalTask } from './actions'

type Task={id:string;title:string;notes:string|null;due_at:string|null;status:string;priority:string;created_by:string}
type TimeOff={id:string;starts_on:string;ends_on:string;notes:string|null;status:string}

const priorityLabel=(value:string,es:boolean)=>value==='high'?(es?'Alta':'High'):value==='low'?(es?'Baja':'Low'):(es?'Normal':'Normal')

export function PersonalPlanning({tasks,timeOff,lang,timeZone}:{churchId:string;tasks:Task[];timeOff:TimeOff[];lang:'en'|'es';timeZone:string}){
  const es=lang==='es'
  const dateTime=(value:string)=>new Intl.DateTimeFormat(es?'es-US':'en-US',{dateStyle:'medium',timeStyle:'short',timeZone}).format(new Date(value))
  return <section className="card" style={{padding:18,marginBottom:18}}>
    <div className="pill">{es?'PLAN PERSONAL':'PERSONAL PLANNING'}</div>
    <h2>{es?'Tareas y fechas no disponibles':'Tasks and unavailable dates'}</h2>
    <p className="small muted">{es?'Agrega recordatorios personales y avisa a liderazgo cuándo no estás disponible.':'Add personal reminders and let leadership know when you are unavailable.'}</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,marginTop:14}}>
      <div style={{display:'grid',gap:10}}>
        <div className="row" style={{gap:7}}><ClipboardList size={16}/><strong>{es?'Mis tareas':'My tasks'}</strong></div>
        <form action={createPersonalTask} style={{display:'grid',gap:8,padding:12,border:'1px solid var(--line)',borderRadius:12}}>
          <input type="hidden" name="lang" value={lang}/><label className="field"><span>{es?'Tarea':'Task'}</span><input name="title" maxLength={160} required placeholder={es?'Ej. llamar a Juan':'e.g. Call John'}/></label><label className="field"><span>{es?'Notas opcionales':'Optional notes'}</span><textarea name="notes" rows={2}/></label><div className="row" style={{gap:8,flexWrap:'wrap'}}><label className="field" style={{flex:'1 1 180px'}}><span>{es?'Fecha y hora':'Due date & time'}</span><input name="due_at" type="datetime-local"/></label><label className="field" style={{flex:'0 1 140px'}}><span>{es?'Prioridad':'Priority'}</span><select name="priority" defaultValue="normal"><option value="low">{es?'Baja':'Low'}</option><option value="normal">{es?'Normal':'Normal'}</option><option value="high">{es?'Alta':'High'}</option></select></label></div><button className="btn" type="submit"><Plus size={13}/> {es?'Agregar tarea':'Add task'}</button>
        </form>
        <div style={{display:'grid',gap:8}}>{tasks.map(task=><article key={task.id} style={{padding:12,border:'1px solid var(--line)',borderRadius:12}}><div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:10}}><div><strong>{task.title}</strong>{task.notes&&<div className="small muted" style={{marginTop:3}}>{task.notes}</div>}<div className="small muted" style={{marginTop:5}}>{priorityLabel(task.priority,es)}{task.due_at?` • ${dateTime(task.due_at)}`:''}</div></div><form action={updatePersonalTask}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="task_id" value={task.id}/><input type="hidden" name="status" value="completed"/><button className="ghost" type="submit" title={es?'Completar':'Complete'}><CheckCircle2 size={14}/></button></form></div>{task.status==='open'&&<form action={updatePersonalTask} style={{marginTop:8}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="task_id" value={task.id}/><input type="hidden" name="status" value="in_progress"/><button className="ghost" type="submit"><Clock3 size={12}/> {es?'Marcar en progreso':'Mark in progress'}</button></form>}</article>)}{!tasks.length&&<div className="small muted">{es?'No tienes tareas abiertas.':'No open tasks.'}</div>}</div>
      </div>
      <div style={{display:'grid',gap:10,alignContent:'start'}}>
        <div className="row" style={{gap:7}}><CalendarOff size={16}/><strong>{es?'No estoy disponible':'I am unavailable'}</strong></div>
        <form action={submitTimeOff} style={{display:'grid',gap:8,padding:12,border:'1px solid var(--line)',borderRadius:12}}><input type="hidden" name="lang" value={lang}/><div className="row" style={{gap:8,flexWrap:'wrap'}}><label className="field" style={{flex:1}}><span>{es?'Desde':'From'}</span><input name="starts_on" type="date" required/></label><label className="field" style={{flex:1}}><span>{es?'Hasta':'Through'}</span><input name="ends_on" type="date" required/></label></div><label className="field"><span>{es?'Nota opcional':'Optional note'}</span><textarea name="notes" rows={2} placeholder={es?'Ej. fuera de la ciudad':'e.g. Out of town'}/></label><button className="btn secondary" type="submit">{es?'Enviar fechas':'Send dates'}</button></form>
        <div style={{display:'grid',gap:8}}>{timeOff.map(item=><article key={item.id} style={{padding:12,border:'1px solid var(--line)',borderRadius:12}}><strong>{item.starts_on} → {item.ends_on}</strong><div className="small muted" style={{marginTop:3}}>{item.status}{item.notes?` • ${item.notes}`:''}</div>{item.status==='pending'&&<form action={cancelTimeOff} style={{marginTop:7}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="time_off_id" value={item.id}/><button className="ghost" type="submit">{es?'Cancelar solicitud':'Cancel request'}</button></form>}</article>)}{!timeOff.length&&<div className="small muted">{es?'No hay fechas no disponibles registradas.':'No unavailable dates recorded.'}</div>}</div>
      </div>
    </div>
  </section>
}
