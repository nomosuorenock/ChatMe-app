-- ==============================================================================
-- SUPABASE STORAGE RLS POLICIES FOR 'chatme-backups' BUCKET
-- Restricts access so that auth.uid() = (storage.foldername(name))[1]
-- ==============================================================================

-- 1. Ensure the bucket exists and is private
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chatme-backups', 'chatme-backups', false, 52428800, array['application/json', 'application/octet-stream', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- 2. SELECT (Read / Download): Users can only read objects in their own root directory
drop policy if exists "Users can view own backup files" on storage.objects;
create policy "Users can view own backup files" on storage.objects
  for select using (
    bucket_id = 'chatme-backups' and 
    auth.uid() = (storage.foldername(name))[1]
  );

-- 3. INSERT (Upload): Users can only upload objects into their own root directory
drop policy if exists "Users can upload own backup files" on storage.objects;
create policy "Users can upload own backup files" on storage.objects
  for insert with check (
    bucket_id = 'chatme-backups' and 
    auth.uid() = (storage.foldername(name))[1]
  );

-- 4. UPDATE: Users can only modify objects in their own root directory
drop policy if exists "Users can update own backup files" on storage.objects;
create policy "Users can update own backup files" on storage.objects
  for update using (
    bucket_id = 'chatme-backups' and 
    auth.uid() = (storage.foldername(name))[1]
  );

-- 5. DELETE: Users can only delete objects in their own root directory
drop policy if exists "Users can delete own backup files" on storage.objects;
create policy "Users can delete own backup files" on storage.objects
  for delete using (
    bucket_id = 'chatme-backups' and 
    auth.uid() = (storage.foldername(name))[1]
  );
