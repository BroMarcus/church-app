'use client'

import {useState,type CSSProperties,type InputHTMLAttributes} from 'react'
import {Eye,EyeOff} from 'lucide-react'

type Props={
  name:string
  label:string
  showLabel?:string
  hideLabel?:string
  inputStyle?:CSSProperties
}&Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'name'|'style'>

export function PasswordField({name,label,showLabel='Show password',hideLabel='Hide password',inputStyle,...inputProps}:Props){
  const [visible,setVisible]=useState(false)
  return <label className="field"><span>{label}</span><div style={{position:'relative'}}><input autoCapitalize="none" autoCorrect="off" spellCheck={false} {...inputProps} name={name} type={visible?'text':'password'} style={{width:'100%',paddingRight:52,...inputStyle}}/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?hideLabel:showLabel} aria-pressed={visible} title={visible?hideLabel:showLabel} style={{position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',display:'grid',placeItems:'center',width:44,height:44,border:0,background:'transparent',cursor:'pointer',touchAction:'manipulation'}}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>
}
