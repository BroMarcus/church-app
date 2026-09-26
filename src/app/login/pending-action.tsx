'use client'

import {useEffect,useRef,useState} from 'react'
import {useFormStatus} from 'react-dom'

export function PendingAction({label,pendingLabel,cooldownLabel,cooldownKey,cooldownSeconds=60,action}:{label:string;pendingLabel:string;cooldownLabel:string;cooldownKey:string;cooldownSeconds?:number;action:(formData:FormData)=>void|Promise<void>}){
  const status=useFormStatus()
  const storageKey=`kingdom-network:auth-cooldown:${cooldownKey}`
  const [remaining,setRemaining]=useState(0)
  const fallbackUntilRef=useRef(0)
  const successCode=cooldownKey==='password-reset'?'reset_sent':cooldownKey==='confirmation-resend'?'confirmation_sent':''

  useEffect(()=>{
    const sync=()=>{
      const now=Date.now()
      try{
        const until=Number(window.localStorage.getItem(storageKey)||0)
        if(until>fallbackUntilRef.current)fallbackUntilRef.current=until
        const seconds=Math.max(0,Math.ceil((until-now)/1000))
        setRemaining(seconds)
        if(seconds===0&&until)window.localStorage.removeItem(storageKey)
        if(seconds===0&&fallbackUntilRef.current<=now)fallbackUntilRef.current=0
      }catch{
        const seconds=Math.max(0,Math.ceil((fallbackUntilRef.current-now)/1000))
        setRemaining(seconds)
        if(seconds===0)fallbackUntilRef.current=0
      }
    }
    sync()
    const timer=window.setInterval(sync,1000)
    return()=>window.clearInterval(timer)
  },[storageKey])

  useEffect(()=>{
    if(!successCode)return
    const url=new URL(window.location.href)
    if(url.searchParams.get('message_code')!==successCode)return
    const now=Date.now()
    const until=now+cooldownSeconds*1000
    fallbackUntilRef.current=until
    try{
      const existing=Number(window.localStorage.getItem(storageKey)||0)
      if(existing>now){
        fallbackUntilRef.current=existing
        setRemaining(Math.max(0,Math.ceil((existing-now)/1000)))
      }else{
        window.localStorage.setItem(storageKey,String(until))
        setRemaining(cooldownSeconds)
      }
    }catch{
      setRemaining(cooldownSeconds)
    }
    url.searchParams.delete('message_code')
    window.history.replaceState(window.history.state,'',`${url.pathname}${url.search}${url.hash}`)
  },[cooldownSeconds,storageKey,successCode])

  const cooling=remaining>0
  const text=status.pending?pendingLabel:cooling?cooldownLabel.replace('{seconds}',String(remaining)):label
  return <button className="btn secondary" type="submit" formAction={action} disabled={status.pending||cooling} aria-busy={status.pending} aria-disabled={status.pending||cooling} style={{minHeight:44,touchAction:'manipulation'}}><span aria-live="polite">{text}</span></button>
}