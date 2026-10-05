-- ==============================================================================
-- CHATME APP - STATUS POSTS ROW LEVEL SECURITY (RLS) POLICIES MIGRATION
-- ==============================================================================

-- 1. Ensure public.status_posts table exists with standard ChatMe columns
create table if not exists public.status_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text,
  thumbnail_url text,
  caption text,
  media_type text,
  type text default 'image',
  viewers jsonb default '[]'::jsonb,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Indexes for performant filtering
create index if not exists idx_status_posts_user_id on public.status_posts(user_id);
create index if not exists idx_status_posts_expires_at on public.status_posts(expires_at);

-- 3. Enable Row Level Security (RLS)
alter table public.status_posts enable row level security;

-- 4. Clean up any existing policies on status_posts
drop policy if exists "Status posts are viewable by everyone" on public.status_posts;
drop policy if exists "Users can view active status posts" on public.status_posts;
drop policy if exists "Users can view status posts" on public.status_posts;
drop policy if exists "Users can create own status posts" on public.status_posts;
drop policy if exists "Users can insert own status posts" on public.status_posts;
drop policy if exists "Users can update own status posts" on public.status_posts;
drop policy if exists "Users can delete own status posts" on public.status_posts;

-- 5. SELECT Policy:
-- Users can view status posts that have not expired, or view their own status posts
create policy "Users can view status posts" on public.status_posts
  for select using (
    expires_at is null 
    or expires_at > timezone('utc'::text, now()) 
    or (auth.uid() is not null and auth.uid() = user_id)
  );

-- 6. INSERT Policy:
-- Authenticated ChatMe user can INSERT their own status post.
-- The row must belong to the currently authenticated user: auth.uid() = user_id
create policy "Users can insert own status posts" on public.status_posts
  for insert with check (
    auth.uid() is not null and auth.uid() = user_id
  );

-- 7. UPDATE Policy:
-- The post owner can update their status post, or authenticated users can record view receipts in viewers
create policy "Users can update own status posts" on public.status_posts
  for update using (
    auth.uid() is not null and (
      auth.uid() = user_id or 
      (expires_at is null or expires_at > timezone('utc'::text, now()))
    )
  );

-- 8. DELETE Policy:
-- Only the authenticated post creator can delete their own status post
create policy "Users can delete own status posts" on public.status_posts
  for delete using (
    auth.uid() is not null and auth.uid() = user_id
  );
