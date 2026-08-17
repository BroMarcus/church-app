import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,GraduationCap,HandHeart,Megaphone,Users,Church,FileText,BriefcaseBusiness } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CreatePost } from '@/components/create-post'

const modules=[
  {title:'Learning',desc:'Courses, badges & growth',Icon:GraduationCap,href:'/learning'},
  {title:'Groups',desc:'Friendship groups & reports',Icon:Users,href:'/groups'},
  {title:'Serve',desc:'Ministries & applications',Icon:HandHeart,href:'/serve'},
  {title:'Outreach',desc:'Guests & Bible studies',Icon:Megaphone,href:'/outreach'},
  {title:'Calendar',desc:'Church & district events',Icon:CalendarDays},
  {title:'Documents',desc:'Certificates & records',Icon:FileText},
  {title:'Teams',desc:'Schedules & assignments',Icon:BriefcaseBusiness},
  {title:'Church',desc:'Directory & leadership',Icon:Church,href:'/church'}
] as const

export default async function Home(){
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')

  const [{data:profile},{data:membership}]=await Promise.all([
    supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).single(),
    supabase.from('church_memberships').select('church_id,role,churches(name,city,state)').eq('user_id',userId).eq('status','active').limit(1).single()
  ])

  if(!membership?.church_id)return <main className="shell"><div className="card" style={{padding:24}}><h1>Account created.</h1><p>Your church membership is being connected.</p><form action="/auth/signout" method="post"><button className="btn">Sign out</button></form></div></main>

  const {data:posts}=await supabase.from('community_posts').select('id,body,post_type,created_at,author_id,profiles:author_id(display_name,first_name,last_name)').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(20)
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches as {name?:string;city?:string;state?:string}|null
  const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Member'
  const isAdmin=['pastor','church_admin'].includes(membership.role)

  return <main className="shell">
    <header className="topbar">
      <div><div className="brand">Kingdom <span>Network</span></div><div className="small muted">{church?.name??'Your Church'} • {membership.role.replaceAll('_',' ')}</div></div>
      <div className="row">{isAdmin&&<Link className="ghost" href="/church">Church admin</Link>}<Link className="ghost" href="/profile">My profile</Link><form action="/auth/signout" method="post"><button className="ghost">Sign out</button></form></div>
    </header>

    <section className="hero card"><div><div className="pill">WELCOME BACK</div><h1>{name}</h1><p>Connect. Grow. Serve. Reach.</p></div><div className="hero-stat"><strong>Alpha</strong><span>Real accounts + real database</span></div></section>

    <section className="module-grid">{modules.map(({title,desc,Icon,...module})=>{
      const body=<><Icon size={22}/><strong>{title}</strong><span>{desc}</span><small>{'href' in module?'Open module':'Foundation ready'}</small></>
      return 'href' in module?<Link className="module card module-link" href={module.href} key={title}>{body}</Link>:<div className="module card" key={title}>{body}</div>
    })}</section>

    <div className="content-grid"><section><CreatePost churchId={membership.church_id} userId={userId}/><div className="feed-head"><h2>Community</h2><span className="muted small">Member posts</span></div><div className="feed">{posts?.length?posts.map((post:any)=>{const p=Array.isArray(post.profiles)?post.profiles[0]:post.profiles;const author=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member';return <article className="card post" key={post.id}><div className="row"><div className="avatar">{author.slice(0,1).toUpperCase()}</div><div><strong>{author}</strong><div className="small muted">{post.post_type.replaceAll('_',' ')} • {new Date(post.created_at).toLocaleDateString()}</div></div></div><p>{post.body}</p></article>}):<div className="card empty"><h3>Start the community feed.</h3><p className="muted">Your first real post will appear here for other signed-in church members.</p></div>}</div></section><aside><div className="card side"><div className="pill">ACTIVE NOW</div><h3>Kingdom Network Alpha</h3><ul><li>Member profiles & private contact info</li><li>Church admin & verified records</li><li>Friendship Groups & leader reports</li><li>First Steps Learning Center</li><li>Outreach follow-up pipeline</li><li>Ministry opportunities & qualification</li><li>Community feed</li></ul></div><div className="card side"><div className="pill">COMING NEXT</div><h3>Kingdom Guide</h3><p className="muted">AI navigation, biblical resource search and personalized discipleship recommendations will connect to approved church resources.</p></div></aside></div>
  </main>
}
