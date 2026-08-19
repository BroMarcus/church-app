# Supabase Auth Email Templates

Kingdom Network uses an app-side confirmation step so security scanners and email preview systems do not consume one-time authentication links before a person taps them.

## Password recovery template

In Supabase Dashboard -> Authentication -> Emails -> Reset password, use a link that sends the token hash to Kingdom Network instead of using the default ConfirmationURL directly:

```html
<h2>Reset your Kingdom Network password</h2>
<p>Tap the button below to continue.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password">Reset password</a></p>
<p>If you did not request this, you can ignore this email.</p>
```

## Confirm signup template

In Supabase Dashboard -> Authentication -> Emails -> Confirm signup:

```html
<h2>Confirm your Kingdom Network account</h2>
<p>Tap the button below to confirm your email address.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/login">Confirm email</a></p>
```

## Required URL configuration

Site URL:

```text
https://kingdom-network.vercel.app
```

Allowed redirect URL:

```text
https://kingdom-network.vercel.app/**
```

The `/auth/confirm` GET handler does not consume the token. It forwards to `/auth/verify`, where the person must explicitly tap a button before `verifyOtp` runs. This reduces failures caused by automated email-link scanners.
