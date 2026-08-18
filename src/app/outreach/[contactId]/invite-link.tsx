'use client'

import { useState } from 'react'
import { Copy,Check } from 'lucide-react'

export function OutreachInviteLink({inviteId}:{inviteId:string}){
  const [copied,setCopied]=useState(false)
  async function copy(){
    const url=`${window.location.origin}/login?invite=${encodeURIComponent(inviteId)}`
    await navigator.clipboard.writeText(url)
    setCopied(true);setTimeout(()=>setCopied(false),1800)
  }
  return <button type="button" className="btn" onClick={copy}>{copied?<><Check size={13}/> Copied</>:<><Copy size={13}/> Copy invitation link</>}</button>
}
