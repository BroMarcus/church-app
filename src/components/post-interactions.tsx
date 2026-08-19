'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2,Heart,HandHeart,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './post-interactions.module.css'

type CommentRow={id:string;body:string;created_at:string;author_id:string;profiles?:any}
type ReactionRow={reaction_type:string;user_id:string}
const reactionDefs=[['amen','Amen','Amén',CheckCircle2],['love','Love','Me gusta',Heart],['praying','Praying','Orando',HandHeart],['encouraged','Encouraged','Animado',Sparkles]] as const

export function PostInteractions({postId,userId,comments,reactionRows,lang='en'}:{postId:string;userId:string;comments:CommentRow[];reactionRows:ReactionRow[];lang?:'en'|'es'}){
  const es=lang==='es',t=(en:string,sp:string)=>es?sp:en
  const router=useRouter();const [body,setBody]=useState('');const [busy,setBusy]=useState(false)
  const myReaction=reactionRows.find(r=>r.user_id===userId)?.reaction_type??null
  const counts=reactionRows.reduce<Record<string,number>>((m,r)=>{m[r.reaction_type]=(m[r.reaction_type]??0)+1;return m},{})
  const visible=comments.slice(-3)

  async function react(type:string){
    if(busy)return;setBusy(true);const supabase=createClient()
    const result=myReaction===type?await supabase.from('post_reactions').delete().eq('post_id',postId).eq('user_id',userId):await supabase.from('post_reactions').upsert({post_id:postId,user_id:userId,reaction_type:type},{onConflict:'post_id,user_id'})
    setBusy(false);if(!result.error)router.refresh()
  }
  async function comment(e:React.FormEvent){
    e.preventDefault();const clean=body.trim();if(!clean||busy)return;setBusy(true);const supabase=createClient();const {error}=await supabase.from('post_comments').insert({post_id:postId,author_id:userId,body:clean});setBusy(false);if(!error){setBody('');router.refresh()}
  }

  return <div className={styles.wrap}><div className={styles.reactions}>{reactionDefs.map(([type,enLabel,esLabel,Icon])=><button type="button" className={`${styles.reaction} ${myReaction===type?styles.active:''}`} onClick={()=>react(type)} disabled={busy} key={type}><Icon size={12}/>{es?esLabel:enLabel}{counts[type]?<span>{counts[type]}</span>:null}</button>)}</div>{visible.length>0&&<div className={styles.comments}>{visible.map(c=>{const p=Array.isArray(c.profiles)?c.profiles[0]:c.profiles;const name=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||t('Church member','Miembro de la iglesia');return <div className={styles.comment} key={c.id}><div className={styles.avatar}>{name.slice(0,1).toUpperCase()}</div><div className={styles.bubble}><strong>{name}</strong><time>{new Date(c.created_at).toLocaleString(es?'es-US':'en-US')}</time><p>{c.body}</p></div></div>})}</div>}{comments.length>3&&<div className={styles.more}>{t(`Showing latest 3 of ${comments.length} comments.`,`Mostrando los 3 comentarios más recientes de ${comments.length}.`)}</div>}<form className={styles.commentForm} onSubmit={comment}><input value={body} onChange={e=>setBody(e.target.value)} maxLength={1500} placeholder={t('Write a comment…','Escribe un comentario…')} aria-label={t('Comment','Comentario')}/><button disabled={busy||!body.trim()}>{t('Comment','Comentar')}</button></form></div>
}