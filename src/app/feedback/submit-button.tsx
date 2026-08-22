'use client'

import {useFormStatus} from 'react-dom'
import {MessageSquareWarning} from 'lucide-react'

export function SubmitFeedbackButton({label,sending}:{label:string;sending:string}){
  const {pending}=useFormStatus()
  return <button className="btn" type="submit" disabled={pending} aria-disabled={pending} aria-busy={pending} style={{minHeight:44,opacity:pending?.7:1,cursor:pending?'wait':'pointer'}}><MessageSquareWarning size={14}/>{pending?sending:label}</button>
}
