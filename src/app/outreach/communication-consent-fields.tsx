export function CommunicationConsentFields({es=false,emailConsent=false,smsConsent=false,language='en',compact=false}:{es?:boolean;emailConsent?:boolean;smsConsent?:boolean;language?:'en'|'es'|string;compact?:boolean}){
  return <div className={compact?'wide':'card wide'} style={compact?{display:'grid',gap:8}:{padding:12,display:'grid',gap:8,background:'rgba(255,255,255,.025)'}}>
    <div><strong>{es?'Permiso de comunicación':'Communication permission'}</strong><div className="small muted">{es?'Marca solamente los canales que la persona aceptó recibir.':'Only check channels the person actually agreed to receive.'}</div></div>
    <div className="checkrow" style={{display:'flex',gap:14,flexWrap:'wrap'}}><label><input type="checkbox" name="email_consent" defaultChecked={emailConsent}/> {es?'Correo electrónico aprobado':'Email approved'}</label><label><input type="checkbox" name="sms_consent" defaultChecked={smsConsent}/> {es?'Mensajes de texto aprobados':'Text messages approved'}</label></div>
    <label className="field"><span>{es?'Idioma de comunicación':'Communication language'}</span><select name="communication_language" defaultValue={language==='es'?'es':'en'}><option value="en">English</option><option value="es">Español</option></select></label>
  </div>
}
