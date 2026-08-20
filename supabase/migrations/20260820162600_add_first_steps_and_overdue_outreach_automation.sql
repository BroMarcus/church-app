alter table public.outreach_contacts
  add column if not exists owner_reminder_due_snapshot timestamptz,
  add column if not exists leadership_escalation_due_snapshot timestamptz;

comment on column public.outreach_contacts.owner_reminder_due_snapshot is 'Follow-up due_at value for which the assigned owner has already received an overdue reminder.';
comment on column public.outreach_contacts.leadership_escalation_due_snapshot is 'Follow-up due_at value for which church leadership has already received the 24-hour overdue escalation.';

insert into public.communication_templates
  (church_id,template_key,channel,language_code,name,subject,body,delay_minutes,active)
select c.id,v.template_key,v.channel,v.language_code,v.name,v.subject,v.body,v.delay_minutes,true
from public.churches c
cross join (values
  ('first_steps_invite','email','en','First Steps invitation','You’re invited to First Steps','Hi {{first_name}}, we’d love to invite you to First Steps at {{church_name}}. It’s a simple way to learn more about the church, grow in your walk with God, and see your next steps. Reply to your church leader if you’d like the details.',60),
  ('first_steps_invite','email','es','Invitación a Primeros Pasos','Estás invitado a Primeros Pasos','Hola {{first_name}}, nos encantaría invitarte a Primeros Pasos en {{church_name}}. Es una manera sencilla de conocer mejor la iglesia, crecer en tu caminar con Dios y ver tus próximos pasos. Responde a tu líder de la iglesia si deseas los detalles.',60),
  ('first_steps_invite','sms','en','First Steps invitation text',null,'Hi {{first_name}}! You’re invited to First Steps at {{church_name}}. It’s a simple way to learn more about the church and your next steps. Reply to your church leader if you’d like the details.',60),
  ('first_steps_invite','sms','es','Texto de invitación a Primeros Pasos',null,'¡Hola {{first_name}}! Estás invitado a Primeros Pasos en {{church_name}}. Es una manera sencilla de conocer mejor la iglesia y tus próximos pasos. Responde a tu líder de la iglesia si deseas los detalles.',60)
) as v(template_key,channel,language_code,name,subject,body,delay_minutes)
on conflict (church_id,template_key,channel,language_code) do nothing;

create or replace function private.enqueue_outreach_communications()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $function$
begin
  if tg_op='INSERT' then
    if new.stage='guest' then
      perform private.queue_contact_communication(new.id,'guest_thanks',coalesce(new.source_occurred_at::date::text,new.created_at::date::text));
    end if;
    return new;
  end if;

  if new.stage='guest' and old.stage is distinct from new.stage then
    perform private.queue_contact_communication(new.id,'guest_thanks',current_date::text);
  end if;

  if new.stage='bible_study' and old.stage is distinct from new.stage then
    perform private.queue_contact_communication(new.id,'bible_study_followup',current_date::text);
  end if;

  if new.stage='regular_attendee' and old.stage is distinct from new.stage then
    perform private.queue_contact_communication(new.id,'first_steps_invite',current_date::text);
  end if;

  if new.service_count>=1 and old.service_count is distinct from new.service_count and new.stage in ('guest','regular_attendee') then
    perform private.queue_contact_communication(new.id,'reinvite',concat('service-',new.service_count));
  end if;

  return new;
end
$function$;

create or replace function private.process_overdue_outreach_followups()
returns table(owner_reminders integer, leadership_escalations integer)
language plpgsql
security definer
set search_path to 'public','private'
as $function$
declare
  o record;
  l record;
  v_name text;
  v_owner integer:=0;
  v_escalations integer:=0;
  v_leader_notified boolean;
begin
  for o in
    select oc.*
    from public.outreach_contacts oc
    where oc.follow_up_due_at is not null
      and oc.follow_up_due_at <= now()
      and oc.stage not in ('inactive','serving')
      and (oc.last_contacted_at is null or oc.last_contacted_at < oc.follow_up_due_at)
    order by oc.follow_up_due_at
    for update skip locked
  loop
    v_name:=trim(coalesce(o.first_name,'')||' '||coalesce(o.last_name,''));
    if v_name='' then v_name:='A guest / Un invitado'; end if;

    if o.assigned_to is not null
       and o.owner_reminder_due_snapshot is distinct from o.follow_up_due_at
       and exists(
         select 1 from public.church_memberships cm
         where cm.church_id=o.church_id
           and cm.user_id=o.assigned_to
           and cm.status='active'
       ) then
      perform private.notify_user(
        o.assigned_to,
        o.church_id,
        'outreach_follow_up_overdue',
        'Follow-up overdue / Seguimiento atrasado',
        v_name||' needs follow-up now. / '||v_name||' necesita seguimiento ahora.',
        '/outreach/'||o.id::text,
        'outreach_contact',
        o.id
      );
      update public.outreach_contacts
      set owner_reminder_due_snapshot=o.follow_up_due_at,
          updated_at=now()
      where id=o.id;
      v_owner:=v_owner+1;
    end if;

    if now() >= o.follow_up_due_at + interval '24 hours'
       and o.leadership_escalation_due_snapshot is distinct from o.follow_up_due_at then
      v_leader_notified:=false;
      for l in
        select distinct cm.user_id
        from public.church_memberships cm
        where cm.church_id=o.church_id
          and cm.status='active'
          and cm.role in ('pastor','church_admin')
      loop
        perform private.notify_user(
          l.user_id,
          o.church_id,
          'outreach_follow_up_escalated',
          'Follow-up needs leadership attention / Seguimiento requiere atención',
          v_name||' is more than 24 hours overdue for follow-up. / El seguimiento de '||v_name||' lleva más de 24 horas atrasado.',
          '/outreach/'||o.id::text,
          'outreach_contact',
          o.id
        );
        v_leader_notified:=true;
        v_escalations:=v_escalations+1;
      end loop;

      if v_leader_notified then
        update public.outreach_contacts
        set leadership_escalation_due_snapshot=o.follow_up_due_at,
            updated_at=now()
        where id=o.id;
      end if;
    end if;
  end loop;

  return query select v_owner,v_escalations;
end
$function$;

revoke all on function private.process_overdue_outreach_followups() from public, anon, authenticated;

select cron.schedule(
  'outreach-followup-escalation',
  '15 * * * *',
  $cron$select private.process_overdue_outreach_followups();$cron$
)
where not exists(select 1 from cron.job where jobname='outreach-followup-escalation');
