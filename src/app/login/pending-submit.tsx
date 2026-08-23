'use client'

import { useFormStatus } from 'react-dom'

export function PendingSubmit({label,pendingLabel}:{label:string;pendingLabel:string}){
  const status=useFormStatus()
  const text=status.pending?pendingLabel:label
  return <button className="btn" type="submit" disabled={status.pending} aria-disabled={status.pending} aria-busy={status.pending} style={{width:'100%'}}><span aria-live="polite">{text}</span></button>
}
