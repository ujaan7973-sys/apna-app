-- APNA public video app database setup
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'APNA Creator',
  caption text not null,
  video_path text not null,
  video_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.video_likes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(video_id, user_id)
);

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default 'APNA User',
  comment text not null,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_comments enable row level security;

drop policy if exists "Anyone can view public videos" on public.videos;
create policy "Anyone can view public videos" on public.videos
for select using (true);

drop policy if exists "Signed-in users can publish videos" on public.videos;
create policy "Signed-in users can publish videos" on public.videos
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Owners can delete their videos" on public.videos;
create policy "Owners can delete their videos" on public.videos
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can view likes" on public.video_likes;
create policy "Anyone can view likes" on public.video_likes
for select using (true);

drop policy if exists "Users can like as themselves" on public.video_likes;
create policy "Users can like as themselves" on public.video_likes
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can remove their likes" on public.video_likes;
create policy "Users can remove their likes" on public.video_likes
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can view comments" on public.video_comments;
create policy "Anyone can view comments" on public.video_comments
for select using (true);

drop policy if exists "Signed-in users can comment as themselves" on public.video_comments;
create policy "Signed-in users can comment as themselves" on public.video_comments
for insert to authenticated with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('apna-videos', 'apna-videos', true, 104857600, array['video/mp4','video/quicktime','video/webm','video/3gpp'])
on conflict (id) do update set public = true, file_size_limit = 104857600;

drop policy if exists "Public can watch APNA videos" on storage.objects;
create policy "Public can watch APNA videos" on storage.objects
for select using (bucket_id = 'apna-videos');

drop policy if exists "Signed-in users can upload APNA videos" on storage.objects;
create policy "Signed-in users can upload APNA videos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'apna-videos' and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their APNA videos" on storage.objects;
create policy "Users can delete their APNA videos" on storage.objects
for delete to authenticated using (
  bucket_id = 'apna-videos' and (storage.foldername(name))[1] = auth.uid()::text
);

grant select on public.videos, public.video_likes, public.video_comments to anon, authenticated;
grant insert, delete on public.videos, public.video_likes, public.video_comments to authenticated;
