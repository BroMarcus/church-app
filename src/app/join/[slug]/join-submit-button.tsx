'use client'

import { useFormStatus } from 'react-dom'
import { LoaderCircle,Sparkles } from 'lucide-react'

export function JoinSubmitButton({label,workingLabel}:{label:string;workingLabel:string}){
  const {pending}=useFormStatus()
  return <button className="btn" type="submit" disabled={pending} aria-disabled={pending} style={{width:'100%',minHeight:48,opacity:pending?.72:1}}>{pending?<><LoaderCircle size={15} className="spin"/> {workingLabel}</>:<><Sparkles size={15}/> {label}</>}</button>
}
