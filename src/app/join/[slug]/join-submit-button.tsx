'use client'

import { useFormStatus } from 'react-dom'
import { LoaderCircle,Sparkles } from 'lucide-react'

export function JoinSubmitButton({label,workingLabel}:{label:string;workingLabel:string}){
  const {pending}=useFormStatus()
  const text=pending?workingLabel:label
  return <button className="btn" type="submit" disabled={pending} aria-disabled={pending} aria-busy={pending} style={{width:'100%',minHeight:48,opacity:pending ? 0.72 : 1}}>{pending?<LoaderCircle size={15}/>:<Sparkles size={15}/>} <span aria-live="polite">{text}</span></button>
}
