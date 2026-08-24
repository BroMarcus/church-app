'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function DocumentLanguage(){
  const searchParams=useSearchParams()

  useEffect(()=>{
    const nextLang=searchParams.get('lang')==='es'?'es':'en'
    document.documentElement.lang=nextLang
  },[searchParams])

  return null
}
