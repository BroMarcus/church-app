'use client'

import {useEffect,useState} from 'react'
import {useFormStatus} from 'react-dom'

export function PendingAction({label,pendingLabel,cooldownLabel,cooldownKey,cooldownSeconds=60,action}:{label:string;pendingLabel:string;cooldownLabel:string;cooldownKey:string;cooldownSeconds?:number;action:(formData:FormData)=>void|Promise<void>}){
  const status=useFormStatus()
  const storageKey=`kingdom-network:auth-cooldown:${cooldownKey}`
  const [remaining,setRemaining]=useState(0)
  const successCode=cooldownKey==='password-reset'?'reset_sent':cooldownKey==='confirmation-resend'?'confirmation_sent':''

  useEffect(()=>{
    const sync=()=>{
      try{
        const until=Number(window.localStorage.getItem(storageKey)||0)
        const seconds=Math.max(0,Math.ceil((until-Date.now())/1000))
        setRemaining(seconds)
        if(seconds===0&&until)window.localStorage.removeItem(storageKey)
      }catch{
        // Storage can be unavailable in restricted/private browser modes. Recovery must still work.
        setRemaining(0)
      }
    }
    sync()
    const timer=window.setInterval(sync,1000)
    return()=>window.clearInterval(timer)
  },[storageKey])

  useEffect(()=>{
    if(!successCode)return
    const params=new URLSearchParams(window.location.search)
    if(params.get('message_code')!==successCode)return
    const now=Date.now()
    const until=now+cooldownSeconds*1000
    try{
      const existing=Number(window.localStorage.getItem(storageKey)||0)
      if(existing>now){
        setRemaining(Math.max(0,Math.ceil((existing-now)/1000)))
        return
      }
      window.localStorage.setItem(storageKey,String(until))
    }catch{
      // Storage is optional. Keep this page safe; server-side rate limits remain the authority.
    }
    setRemaining(cooldownSeconds)
  },[cooldownSeconds,storageKey,successCode])

  const cooling=remaining>0
  const text=status.pending?pendingLabel:cooling?cooldownLabel.replace('{seconds}',String(remaining)):label
  return <button className="btn secondary" type="submit" formAction={action} disabled={status.pending||cooling} aria-busy={status.pending} aria-disabled={status.pending||cooling}><span aria-live="polite">{text}</span></button>
}