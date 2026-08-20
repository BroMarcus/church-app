'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const safe=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)
const split=(v:FormDataEntryValue|null)=>String(v??'').split(',').map(x=>x.trim()).filter(Boolean)
const assetType=(resourceType:string)=>resourceType==='video'?'video':resourceType==='audio'?'audio':resourceType==='slides'?'slides':'other'

const copy={
  en:{add:'ADD RESOURCE',title:'Add a lesson or ministry resource',choose:'Choose a file first.',size:'File must be 50 MB or smaller.',saved:'Resource saved. Refreshing…',resourceTitle:'Title',titlePlaceholder:'Lesson or resource title',type:'Resource type',status:'Status',language:'Language',scope:'Source scope',year:'Source year',yearPlaceholder:'e.g. 2025',ministry:'Ministry / class',ministryPlaceholder:'First Steps, Friendship Group…',source:'Source label',sourcePlaceholder:'2025 class binder, Assembly Constitution…',topics:'Topics / tags',topicsPlaceholder:'prayer, baptism, holiness, outreach',scriptures:'Scripture references',description:'Description / notes',descriptionPlaceholder:'What this resource covers and how it was used.',file:'File',official:'Mark as an official district / organization / church-approved reference. Use only for verified authoritative documents.',members:'Members may see this resource. Leave unchecked for leadership-only legacy/reference material.',uploading:'Uploading…',save:'Save to Resource Library',comma:'Comma separated'},
  es:{add:'AGREGAR RECURSO',title:'Agregar una lección o recurso de ministerio',choose:'Elige un archivo primero.',size:'El archivo debe ser de 50 MB o menos.',saved:'Recurso guardado. Actualizando…',resourceTitle:'Título',titlePlaceholder:'Título de la lección o recurso',type:'Tipo de recurso',status:'Estado',language:'Idioma',scope:'Origen de la fuente',year:'Año de la fuente',yearPlaceholder:'ej. 2025',ministry:'Ministerio / clase',ministryPlaceholder:'Primeros Pasos, Grupo de Amistad…',source:'Nombre de la fuente',sourcePlaceholder:'Carpeta de clase 2025, Constitución de la Asamblea…',topics:'Temas / etiquetas',topicsPlaceholder:'oración, bautismo, santidad, evangelismo',scriptures:'Referencias bíblicas',description:'Descripción / notas',descriptionPlaceholder:'Qué cubre este recurso y cómo se utilizó.',file:'Archivo',official:'Marcar como referencia oficial del distrito, organización o iglesia. Úsalo solo para documentos de autoridad verificada.',members:'Los miembros pueden ver este recurso. Déjalo sin marcar para material de referencia o legado exclusivo del liderazgo.',uploading:'Subiendo…',save:'Guardar en Biblioteca de Recursos',comma:'Separado por comas'}
} as const

export function ResourceUploader({churchId,userId,canApproveOfficial,lang='en'}:{churchId:string;userId:string;canApproveOfficial:boolean;lang?:'en'|'es'}){
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const t=copy[lang]

  async function submit(formData:FormData){
    const file=formData.get('file') as File|null
    if(!file||!file.size){setMessage(t.choose);return}
    if(file.size>50*1024*1024){setMessage(t.size);return}
    setBusy(true);setMessage('')
    const supabase=createClient()
    const path=`${churchId}/${userId}/${crypto.randomUUID()}/${safe(file.name)}`
    const up=await supabase.storage.from('resource-library').upload(path,file,{contentType:file.type,upsert:false})
    if(up.error){setMessage(up.error.message);setBusy(false);return}
    const yearRaw=String(formData.get('source_year')??'').trim()
    const requestedScope=String(formData.get('source_scope')||'local_church')
    const sourceScope=canApproveOfficial?requestedScope:['local_church','ministry','group','external'].includes(requestedScope)?requestedScope:'local_church'
    const official=canApproveOfficial&&formData.get('official_source')==='on'
    const resourceType=String(formData.get('resource_type')||'lesson')
    const insert=await supabase.from('media_assets').insert({
      church_id:churchId,uploaded_by:userId,library_kind:'knowledge',title:String(formData.get('title')||file.name).trim(),asset_type:assetType(resourceType),storage_path:path,
      description:String(formData.get('description')||'').trim()||null,resource_type:resourceType,language_code:String(formData.get('language_code')||'en'),
      source_year:yearRaw?Number(yearRaw):null,ministry_area:String(formData.get('ministry_area')||'').trim()||null,topic_tags:split(formData.get('topic_tags')),scripture_refs:split(formData.get('scripture_refs')),
      archive_status:String(formData.get('archive_status')||'legacy'),source_label:String(formData.get('source_label')||'').trim()||null,approved_for_members:formData.get('approved_for_members')==='on',can_edit_copy:true,
      source_scope:sourceScope,official_source:official,reviewed_by:official?userId:null,reviewed_at:official?new Date().toISOString():null
    })
    if(insert.error){await supabase.storage.from('resource-library').remove([path]);setMessage(insert.error.message);setBusy(false);return}
    setMessage(t.saved);window.location.reload()
  }

  return <form action={submit} className="resource-upload" style={{marginTop:12}}><div className="resource-upload-head"><div><div className="pill">{t.add}</div><h2>{t.title}</h2></div><Upload/></div><div className="resource-form-grid"><label><span>{t.resourceTitle}</span><input name="title" required placeholder={t.titlePlaceholder}/></label><label><span>{t.type}</span><select name="resource_type" defaultValue="lesson"><option value="lesson">{lang==='es'?'Lección':'Lesson'}</option><option value="bible_study">{lang==='es'?'Estudio bíblico':'Bible study'}</option><option value="teacher_guide">{lang==='es'?'Guía del maestro':'Teacher guide'}</option><option value="handout">{lang==='es'?'Hoja de trabajo':'Handout'}</option><option value="sermon">{lang==='es'?'Sermón':'Sermon'}</option><option value="policy">{lang==='es'?'Política / constitución':'Policy / constitution'}</option><option value="slides">{lang==='es'?'Diapositivas':'Slides'}</option><option value="training">{lang==='es'?'Capacitación':'Training'}</option><option value="video">Video</option><option value="audio">Audio</option><option value="other">{lang==='es'?'Otro':'Other'}</option></select></label><label><span>{t.status}</span><select name="archive_status" defaultValue="legacy"><option value="current">{lang==='es'?'Actual / aprobado':'Current / approved'}</option><option value="legacy">{lang==='es'?'Anterior / legado':'Legacy / older material'}</option><option value="draft">{lang==='es'?'Borrador':'Draft'}</option><option value="reference_only">{lang==='es'?'Solo referencia':'Reference only'}</option><option value="retired">{lang==='es'?'Retirado':'Retired'}</option></select></label><label><span>{t.language}</span><select name="language_code" defaultValue="en"><option value="en">English</option><option value="es">Español</option><option value="bilingual">Bilingual</option></select></label><label><span>{t.scope}</span><select name="source_scope" defaultValue="local_church"><option value="local_church">{lang==='es'?'Iglesia local':'Local church'}</option><option value="ministry">{lang==='es'?'Ministerio':'Ministry'}</option><option value="group">{lang==='es'?'Grupo':'Group'}</option><option value="external">{lang==='es'?'Referencia externa':'External reference'}</option>{canApproveOfficial&&<><option value="district">{lang==='es'?'Distrito':'District'}</option><option value="organization">{lang==='es'?'Organización / Asamblea':'Organization / Assembly'}</option></>}</select></label><label><span>{t.year}</span><input name="source_year" type="number" min="1900" max="2100" placeholder={t.yearPlaceholder}/></label><label><span>{t.ministry}</span><input name="ministry_area" placeholder={t.ministryPlaceholder}/></label><label><span>{t.source}</span><input name="source_label" placeholder={t.sourcePlaceholder}/></label><label className="wide"><span>{t.topics}</span><input name="topic_tags" placeholder={t.topicsPlaceholder}/><small>{t.comma}</small></label><label className="wide"><span>{t.scriptures}</span><input name="scripture_refs" placeholder="Acts 2:38, John 3:5, Romans 6:3-4"/><small>{t.comma}</small></label><label className="wide"><span>{t.description}</span><textarea name="description" rows={3} placeholder={t.descriptionPlaceholder}/></label><label className="wide"><span>{t.file}</span><input name="file" type="file" required accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.webp,.mp4,.mp3"/></label></div>{canApproveOfficial&&<label className="resource-check"><input type="checkbox" name="official_source"/><span>{t.official}</span></label>}<label className="resource-check"><input type="checkbox" name="approved_for_members"/><span>{t.members}</span></label><button className="btn" disabled={busy}>{busy?t.uploading:t.save}</button>{message&&<div className="small muted" style={{marginTop:8}}>{message}</div>}</form>
}
