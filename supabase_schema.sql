-- ==============================================================================
-- CHATM APP - COMPLETE PRODUCTION-READY SUPABASE SQL SCHEMA
-- ==============================================================================

-- 1. Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. CREATE TABLES
-- ==============================================================================

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  username text unique,
  email text,
  phone text,
  bio text,
  avatar_url text,
  status_text text,
  online boolean default false,
  last_seen timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Chats table (supports 1-on-1 and group chats)
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  is_group boolean default false,
  name text,
  photo text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Chat members table
create table if not exists public.chat_members (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  unique(chat_id, user_id)
);

-- Messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  message_type text default 'text', -- text, image, video, audio, file, location, contact, call_scheduled
  content text,
  media_url text,
  reply_to uuid references public.messages(id) on delete set null,
  edited boolean default false,
  deleted boolean default false,
  read_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Status posts table
create table if not exists public.status_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text,
  caption text,
  viewers jsonb default '[]'::jsonb,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Calls table (supports voice, video and scheduled calls)
create table if not exists public.calls (
  id uuid default gen_random_uuid() primary key,
  caller_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete cascade,
  call_type text default 'video', -- video, voice
  status text default 'completed', -- missed, completed, scheduled
  scheduled_for timestamp with time zone,
  started_at timestamp with time zone default timezone('utc'::text, now()),
  ended_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Contacts table
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.profiles(id) on delete cascade not null,
  nickname text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(owner_id, contact_id)
);

-- Blocked users table
create table if not exists public.blocked_users (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(blocker_id, blocked_id)
);

-- Notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  body text,
  type text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
create index if not exists idx_chat_members_user_id on public.chat_members(user_id);
create index if not exists idx_chat_members_chat_id on public.chat_members(chat_id);
create index if not exists idx_messages_chat_id on public.messages(chat_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_created_at on public.messages(created_at);
create index if not exists idx_status_posts_user_id on public.status_posts(user_id);
create index if not exists idx_calls_caller_id on public.calls(caller_id);
create index if not exists idx_calls_receiver_id on public.calls(receiver_id);
create index if not exists idx_contacts_owner_id on public.contacts(owner_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.status_posts enable row level security;
alter table public.calls enable row level security;
alter table public.contacts enable row level security;
alter table public.blocked_users enable row level security;
alter table public.notifications enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Chats policies
create policy "Users can view chats they are members of" on public.chats
  for select using (
    exists (
      select 1 from public.chat_members
      where chat_members.chat_id = chats.id and chat_members.user_id = auth.uid()
    )
  );

create policy "Users can create chats" on public.chats
  for insert with check (auth.uid() = created_by);

-- Chat members policies
create policy "Users can view members of their chats" on public.chat_members
  for select using (
    exists (
      select 1 from public.chat_members cm
      where cm.chat_id = chat_members.chat_id and cm.user_id = auth.uid()
    )
  );

create policy "Chat creators or members can add members" on public.chat_members
  for insert with check (
    auth.uid() = user_id or exists (
      select 1 from public.chat_members cm
      where cm.chat_id = chat_members.chat_id and cm.user_id = auth.uid()
    )
  );

-- Messages policies
create policy "Users can view messages in their chats" on public.messages
  for select using (
    exists (
      select 1 from public.chat_members
      where chat_members.chat_id = messages.chat_id and chat_members.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their chats" on public.messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from public.chat_members
      where chat_members.chat_id = messages.chat_id and chat_members.user_id = auth.uid()
    )
  );

create policy "Users can update own messages" on public.messages
  for update using (auth.uid() = sender_id);

-- Status posts policies
create policy "Status posts are viewable by everyone" on public.status_posts
  for select using (true);

create policy "Users can create own status posts" on public.status_posts
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own status posts" on public.status_posts
  for delete using (auth.uid() = user_id);

-- Calls policies
create policy "Users can view calls they participated in" on public.calls
  for select using (auth.uid() = caller_id or auth.uid() = receiver_id);

create policy "Users can initiate calls" on public.calls
  for insert with check (auth.uid() = caller_id);

create policy "Participants can update call status" on public.calls
  for update using (auth.uid() = caller_id or auth.uid() = receiver_id);

-- Contacts policies
create policy "Users can view own contacts" on public.contacts
  for select using (auth.uid() = owner_id);

create policy "Users can manage own contacts" on public.contacts
  for all using (auth.uid() = owner_id);

-- Blocked users policies
create policy "Users can view own blocked list" on public.blocked_users
  for select using (auth.uid() = blocker_id);

create policy "Users can manage own blocked list" on public.blocked_users
  for all using (auth.uid() = blocker_id);

-- Notifications policies
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "System can insert notifications" on public.notifications
  for insert with check (true);

-- ==============================================================================
-- 5. AUTOMATIC PROFILE CREATION TRIGGER & FUNCTIONS
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, username, email, avatar_url, online)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://i.pravatar.cc/150?img=' || (floor(random() * 70) + 1)::text),
    true
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 6. ENABLE SUPABASE REALTIME
-- ==============================================================================

begin;
  -- Drop publication if exists
  drop publication if exists supabase_realtime;
  -- Create publication for realtime tables
  create publication supabase_realtime for table 
    public.messages, 
    public.chats, 
    public.chat_members, 
    public.status_posts, 
    public.calls, 
    public.notifications, 
    public.profiles;
commit;
