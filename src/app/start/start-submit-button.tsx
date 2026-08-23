'use client'

import { useFormStatus } from 'react-dom'

type Props={
  label:string
  pendingLabel:string
}

export function StartSubmitButton({label,pendingLabel}:Props){
  const {pending}=useFormStatus()
  return <button className="btn" type="submit" disabled={pending} aria-disabled={pending} aria-busy={pending} aria-live="polite">{pending?pendingLabel:label}</button>
}
