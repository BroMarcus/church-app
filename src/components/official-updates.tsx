import Link from 'next/link'
import { AlertTriangle,Megaphone,Pin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import styles from './official-updates.module.css'

const priorityRank:Record<string,number>={urgent:0,important:1,normal:2}
const typeLabel=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export async function OfficialUpdates({churchId}:{churchId:string}){
  const supabase=await createClient()
  const {data}=await supabase.from('official_updates').select('id,title,body,update_type,priority,pinned,published_at').eq('church_id',churchId).lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).limit(12)
  const rows=[...(data??[])].sort((a:any,b:any)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||(priorityRank[a.priority]??9)-(priorityRank[b.priority]??9)||new Date(b.published_at).getTime()-new Date(a.published_at).getTime()).slice(0,3)
  if(!rows.length)return null
  return <section className={styles.section}><div className={styles.head}><div><div className="pill">OFFICIAL UPDATES</div><h2>From church leadership</h2></div><Link className="ghost" href="/updates">View all</Link></div><div className={styles.list}>{rows.map((u:any)=><article className={`card ${styles.item} ${u.priority==='urgent'?styles.urgent:u.priority==='important'?styles.important:''}`} key={u.id}><div className={styles.icon}>{u.priority==='urgent'?<AlertTriangle size={16}/>:u.pinned?<Pin size={15}/>:<Megaphone size={15}/>}</div><div className={styles.copy}><h3>{u.title}</h3><p>{u.body.length>260?`${u.body.slice(0,257)}…`:u.body}</p><div className={styles.meta}><span>{typeLabel(u.update_type)}</span><span>{new Date(u.published_at).toLocaleDateString()}</span>{u.pinned&&<span className={styles.pin}>Pinned</span>}</div></div><span className={styles.tag}>{u.priority}</span></article>)}</div></section>
}
