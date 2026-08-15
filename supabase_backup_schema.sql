-- ==============================================================================
-- CHATME APP - BACKUP & RESTORE SUPABASE MIGRATION
-- ==============================================================================

-- 1. Create backup_metadata table for tracking user backup snapshots
create table if not exists public.backup_metadata (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  backup_version text not null default '1.0',
  backup_size_bytes bigint default 0,
  message_count integer default 0,
  chat_count integer default 0,
  media_count integer default 0,
  includes_photos boolean default true,
  includes_videos boolean default false,
  includes_voice_messages boolean default true,
  includes_documents boolean default false,
  storage_path text not null,
  status text not null default 'completed', -- 'completed', 'in_progress', 'failed'
  metadata jsonb default '{}'::jsonb
);

-- 2. Indexes for fast user queries
create index if not exists idx_backup_metadata_user_id on public.backup_metadata(user_id);
create index if not exists idx_backup_metadata_created_at on public.backup_metadata(created_at desc);

-- 3. Enable Row Level Security
alter table public.backup_metadata enable row level security;

-- 4. RLS Policies: Authenticated users can ONLY view, insert, update, and delete their own backups
drop policy if exists "Users can view own backup metadata" on public.backup_metadata;
create policy "Users can view own backup metadata" on public.backup_metadata
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own backup metadata" on public.backup_metadata;
create policy "Users can insert own backup metadata" on public.backup_metadata
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own backup metadata" on public.backup_metadata;
create policy "Users can update own backup metadata" on public.backup_metadata
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own backup metadata" on public.backup_metadata;
create policy "Users can delete own backup metadata" on public.backup_metadata
  for delete using (auth.uid() = user_id);

-- 5. Storage Bucket Configuration for Private Backups
-- Note: Create the 'chatme-backups' private bucket in Supabase Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chatme-backups', 'chatme-backups', false, 52428800, array['application/json', 'application/octet-stream', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- 6. Storage RLS Policies: Strict user isolation where auth.uid() = (storage.foldername(name))[1]
-- Ensures each authenticated user can only view, upload, update, and delete in their own user directory
drop policy if exists "Users can view own backup files" on storage.objects;
create policy "Users can view own backup files" on storage.objects
  for select using (
    bucket_id = 'chatme-backups' and 
    auth.uid() = (storage.foldername(name))[1]
  );

drop policy if exists "Users can upload own backup files" on storage.objects;
create policy "Users can upload own backup files" on storage.objects
  for insert with check (
    bucket_id = 'chatme-backups' and 
    auth.uid() = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own backup files" on storage.objects;
create policy "Users can update own backup files" on storage.objects
  for update using (
    bucket_id = 'chatme-backups' and 
    auth.uid() = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own backup files" on storage.objects;
create policy "Users can delete own backup files" on storage.objects
  for delete using (
    bucket_id = 'chatme-backups' and 
    auth.uid() = (storage.foldername(name))[1]
  );
