'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2,Heart,HandHeart,Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './post-interactions.module.css'

type CommentRow={id:string;body:string;created_at:string;author_id:string;profiles?:any}
type ReactionRow={reaction_type:string;user_id:string}
const reactions=[['amen','Amen',CheckCircle2],['love','Love',Heart],['praying','Praying',HandHeart],['encouraged','Encouraged',Sparkles]] as const

export function PostInteractions({postId,userId,comments,reactionRows}:{postId:string;userId:string;comments:CommentRow[];reactionRows:ReactionRow[]}){
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

  return <div className={styles.wrap}><div className={styles.reactions}>{reactions.map(([type,label,Icon])=><button type="button" className={`${styles.reaction} ${myReaction===type?styles.active:''}`} onClick={()=>react(type)} disabled={busy} key={type}><Icon size={12}/>{label}{counts[type]?<span>{counts[type]}</span>:null}</button>)}</div>{visible.length>0&&<div className={styles.comments}>{visible.map(c=>{const p=Array.isArray(c.profiles)?c.profiles[0]:c.profiles;const name=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member';return <div className={styles.comment} key={c.id}><div className={styles.avatar}>{name.slice(0,1).toUpperCase()}</div><div className={styles.bubble}><strong>{name}</strong><time>{new Date(c.created_at).toLocaleString()}</time><p>{c.body}</p></div></div>})}</div>}{comments.length>3&&<div className={styles.more}>Showing latest 3 of {comments.length} comments.</div>}<form className={styles.commentForm} onSubmit={comment}><input value={body} onChange={e=>setBody(e.target.value)} maxLength={1500} placeholder="Write a comment…" aria-label="Comment"/><button disabled={busy||!body.trim()}>Comment</button></form></div>
}
