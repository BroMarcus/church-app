import { createClient } from '@/lib/supabase/server'
import { CreatePost } from './create-post'
import { PostInteractions } from './post-interactions'

export async function CommunityFeed({churchId,userId}:{churchId:string;userId:string}){
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

  return <section><CreatePost churchId={churchId} userId={userId}/><div className="feed-head"><h2>Community</h2><span className="muted small">Member posts</span></div><div className="feed">{posts?.length?posts.map((post:any)=>{const p=Array.isArray(post.profiles)?post.profiles[0]:post.profiles;const author=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member';return <article className="card post" key={post.id}><div className="row"><div className="avatar">{author.slice(0,1).toUpperCase()}</div><div><strong>{author}</strong><div className="small muted">{post.post_type.replaceAll('_',' ')} • {new Date(post.created_at).toLocaleDateString()}</div></div></div><p>{post.body}</p><PostInteractions postId={post.id} userId={userId} comments={commentsBy.get(post.id)??[]} reactionRows={reactionsBy.get(post.id)??[]}/></article>}):<div className="card empty"><h3>Start the community feed.</h3><p className="muted">Your first real post will appear here for other signed-in church members.</p></div>}</div></section>
}
