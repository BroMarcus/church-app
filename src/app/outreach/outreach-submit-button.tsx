'use client'

import { useFormStatus } from 'react-dom'

export function OutreachSubmitButton({idle,pending,className}:{idle:string;pending:string;className?:string}){
  const {pending:isPending}=useFormStatus()
  return <button type="submit" className={className} disabled={isPending} aria-disabled={isPending}>
    {isPending?pending:idle}
  </button>
}
