import { createClient } from '@/lib/supabase/server'
import { CreatePost } from './create-post'
import { PostInteractions } from './post-interactions'

export async function CommunityFeed({churchId,userId,lang='en'}:{churchId:string;userId:string;lang?:'en'|'es'}){
  const es=lang==='es',t=(en:string,sp:string)=>es?sp:en
  const supabase=await createClient()
  const {data:posts}=await supabase.from('community_posts').select('id,body,post_type,created_at,author_id,profiles:author_id(display_name,first_name,last_name)').eq('church_id',churchId).order('created_at',{ascending:false}).limit(20)
  const postIds=(posts??[]).map((p:any)=>p.id)
  let comments:any[]=[];let reactions:any[]=[]
  if(postIds.length){
    const [c,r]=await Promise.all([
      supabase.from('post_comments').select('id,post_id,body,created_at,author_id,profiles:author_id(display_name,first_name,last_name)').in('post_id',postIds).order('created_at'),
      supabase.from('post_reactions').select('post_id,user_id,reaction_type').in('post_id',postIds)
    ])
    comments=c.data??[];reactions=r.data??[]
  }
  const commentsBy=new Map<string,any[]>();for(const c of comments){const list=commentsBy.get(c.post_id)??[];list.push(c);commentsBy.set(c.post_id,list)}
  const reactionsBy=new Map<string,any[]>();for(const r of reactions){const list=reactionsBy.get(r.post_id)??[];list.push(r);reactionsBy.set(r.post_id,list)}
  const typeLabel=(v:string)=>v==='life_update'?t('Life update','Actualización personal'):v==='prayer_request'?t('Prayer request','Petición de oración'):v==='testimony'?t('Testimony','Testimonio'):v==='encouragement'?t('Encouragement','Ánimo'):v.replaceAll('_',' ')

  return <section><CreatePost churchId={churchId} userId={userId} lang={lang}/><div className="feed-head"><h2>{t('Community','Comunidad')}</h2><span className="muted small">{t('Member posts','Publicaciones de miembros')}</span></div><div className="feed">{posts?.length?posts.map((post:any)=>{const p=Array.isArray(post.profiles)?post.profiles[0]:post.profiles;const author=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||t('Church member','Miembro de la iglesia');return <article className="card post" key={post.id}><div className="row"><div className="avatar">{author.slice(0,1).toUpperCase()}</div><div><strong>{author}</strong><div className="small muted">{typeLabel(post.post_type)} • {new Date(post.created_at).toLocaleDateString(es?'es-US':'en-US')}</div></div></div><p>{post.body}</p><PostInteractions postId={post.id} userId={userId} comments={commentsBy.get(post.id)??[]} reactionRows={reactionsBy.get(post.id)??[]} lang={lang}/></article>}):<div className="card empty"><h3>{t('Start the community feed.','Comienza la comunidad.')}</h3><p className="muted">{t('Your first post will appear here for other signed-in church members.','Tu primera publicación aparecerá aquí para otros miembros de tu iglesia que hayan iniciado sesión.')}</p></div>}</div></section>
}