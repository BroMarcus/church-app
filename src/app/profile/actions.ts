'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export async function updateProfile(formData:FormData){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');const {error}=await supabase.from('profiles').update({first_name:String(formData.get('first_name')??'').trim(),last_name:String(formData.get('last_name')??'').trim(),display_name:String(formData.get('display_name')??'').trim(),bio:String(formData.get('bio')??'').trim(),updated_at:new Date().toISOString()}).eq('id',userId);if(error)redirect('/profile?error='+encodeURIComponent(error.message));redirect('/profile?saved=1')}
