'use client'

import {useFormStatus} from 'react-dom'

export function PrivacySubmitButton({label,pendingLabel}:{label:string;pendingLabel:string}){
  const {pending}=useFormStatus()
  return <button className="btn privacy-save" type="submit" disabled={pending} aria-disabled={pending}>{pending?pendingLabel:label}</button>
}
