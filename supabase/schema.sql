-- Run once in the Supabase SQL Editor. Enable Auth > Anonymous Sign-Ins first.
create table if not exists public.records (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('place','trip')),
  status text not null check (status in ('draft','public')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists records_status_updated_idx on public.records(status,updated_at desc);
create index if not exists records_owner_idx on public.records(owner_id);

create table if not exists public.comments (
  id uuid primary key,
  record_id uuid not null references public.records(id) on delete cascade,
  stop_id uuid,
  parent_id uuid references public.comments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  author text not null check (char_length(author) between 1 and 40),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_record_idx on public.comments(record_id,created_at);

alter table public.records enable row level security;
alter table public.comments enable row level security;

-- Data API table privileges are required in addition to the RLS policies below.
-- Visitors can read public records; signed-in (including anonymous) users can write their own.
grant select on table public.records, public.comments to anon;
grant select, insert, update, delete on table public.records, public.comments to authenticated;

drop policy if exists "read public or own records" on public.records;
create policy "read public or own records" on public.records for select using (status = 'public' or owner_id = (select auth.uid()));
drop policy if exists "insert own records" on public.records;
create policy "insert own records" on public.records for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "update own records" on public.records;
create policy "update own records" on public.records for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "delete own records" on public.records;
create policy "delete own records" on public.records for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "read comments on visible records" on public.comments;
create policy "read comments on visible records" on public.comments for select using (
  exists (select 1 from public.records r where r.id = record_id and (r.status = 'public' or r.owner_id = (select auth.uid())))
);
drop policy if exists "comment on public records" on public.comments;
create policy "comment on public records" on public.comments for insert to authenticated with check (
  owner_id = (select auth.uid()) and
  exists (select 1 from public.records r where r.id = record_id and r.status = 'public') and
  (parent_id is null or exists (select 1 from public.comments p where p.id = parent_id and p.record_id = record_id and p.parent_id is null))
);
drop policy if exists "delete own comments" on public.comments;
create policy "delete own comments" on public.comments for delete to authenticated using (owner_id = (select auth.uid()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('photos','photos',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "public photo reading" on storage.objects;
create policy "public photo reading" on storage.objects for select using (bucket_id='photos');
drop policy if exists "upload to own folder" on storage.objects;
create policy "upload to own folder" on storage.objects for insert to authenticated with check (
  bucket_id='photos' and (storage.foldername(name))[1]=(select auth.uid())::text
);
drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects for delete to authenticated using (
  bucket_id='photos' and (storage.foldername(name))[1]=(select auth.uid())::text
);
