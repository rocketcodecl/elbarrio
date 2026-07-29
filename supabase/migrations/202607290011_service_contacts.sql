alter table public.posts
  add column if not exists service_phone text,
  add column if not exists service_whatsapp text,
  add column if not exists service_instagram text;

comment on column public.posts.service_phone is 'Optional public phone number for a service post.';
comment on column public.posts.service_whatsapp is 'Optional public WhatsApp number for a service post.';
comment on column public.posts.service_instagram is 'Optional public Instagram username for a service post.';
