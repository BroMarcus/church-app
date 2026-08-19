import Link from 'next/link'
import { CalendarDays,Clock,ExternalLink,MapPin,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDay,formatChurchTime } from '@/lib/church-time'
import styles from './featured-events.module.css'

export async function FeaturedEvents({churchId,lang='en'}:{churchId:string;lang?:'en'|'es'}){
  const es=lang==='es',t=(en:string,sp:string)=>es?sp:en,l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const [{data:church},{data:events}]=await Promise.all([
    supabase.from('churches').select('timezone').eq('id',churchId).single(),
    supabase.from('events').select('id,title,starts_at,location,event_type,featured,flyer_path,audience_label,registration_url').eq('featured',true).gte('starts_at',new Date().toISOString()).order('starts_at').limit(8)
  ])
  if(!events?.length)return null
  const tz=church?.timezone||'America/Los_Angeles'
  return <section className={styles.section}><div className={styles.head}><div><div className="pill">{t('FEATURED EVENTS','EVENTOS DESTACADOS')}</div><h2>{t('Don’t miss what’s coming.','No te pierdas lo que viene.')}</h2></div><Link className="ghost" href={l('/calendar')}>{t('View full calendar','Ver calendario completo')}</Link></div><div className={styles.rail}>{events.map((e:any)=>{const flyer=e.flyer_path?supabase.storage.from('event-assets').getPublicUrl(e.flyer_path).data.publicUrl:null;const href=e.registration_url||l('/calendar');const external=Boolean(e.registration_url);return <a className={`card ${styles.card}`} href={href} target={external?'_blank':undefined} rel={external?'noreferrer':undefined} key={e.id}><div className={styles.image}>{flyer?<img src={flyer} alt={`${e.title} ${t('flyer','volante')}`}/>:<div className={styles.fallback}><Sparkles size={28}/></div>}</div><div className={styles.body}><div className={styles.tags}><span className={styles.tag}>{String(e.event_type).replaceAll('_',' ')}</span>{e.audience_label&&<span className={styles.tag}>{e.audience_label}</span>}</div><h3>{e.title}</h3><div className={styles.meta}><span><CalendarDays size={11}/>{formatChurchDay(e.starts_at,tz)}</span><span><Clock size={11}/>{formatChurchTime(e.starts_at,tz)}</span>{e.location&&<span><MapPin size={11}/>{e.location}</span>}</div><div className={styles.cta}>{external?t('Registration / details','Registro / detalles'):t('Open in Calendar','Abrir en Calendario')} <ExternalLink size={10}/></div></div></a>})}</div></section>
}