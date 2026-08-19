'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function ProphetLauncher({authenticated=false}:{authenticated?:boolean}){
  const pathname=usePathname()
  if(!authenticated||pathname.startsWith('/login')||pathname.startsWith('/auth')||pathname.startsWith('/join')||pathname.startsWith('/prophet'))return null
  return <Link href="/prophet" aria-label="Open The Prophet AI helper" title="The Prophet • AI helper" style={{position:'fixed',right:18,bottom:'calc(env(safe-area-inset-bottom, 0px) + 82px)',zIndex:45,display:'inline-flex',alignItems:'center',gap:8,padding:'10px 13px',borderRadius:999,textDecoration:'none',fontWeight:800,background:'var(--panel)',border:'1px solid var(--line)',boxShadow:'0 10px 28px rgba(0,0,0,.28)'}}><Sparkles size={17}/><span>The Prophet</span><span className="small muted">AI</span></Link>
}
