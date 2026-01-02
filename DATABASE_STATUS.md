# Database Status Report

**Application Version:** 1.2
**Database Type:** Supabase (PostgreSQL)
**Schema Version:** 4
**Date:** Current

## Overview
The application persistence layer has been migrated from local SQL (Alasql) to **Supabase**. All data interactions are now asynchronous. Authentication is handled via Supabase Auth.

## Setup Instructions
1.  Create a new Supabase Project.
2.  Run the SQL commands found below in the Supabase SQL Editor.
3.  Set the `SUPABASE_URL` and `SUPABASE_KEY` environment variables (or hardcode for testing) in `services/supabase.ts`.

## SQL Initialization Script

**Note:** This script includes `DROP TABLE` commands. Running it will clear existing data in the public schema to ensure a clean setup.

```sql
-- 1. RESET: Drop existing tables to avoid "already exists" errors
-- We drop in reverse order of dependencies
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS sub_tasks;
DROP TABLE IF EXISTS bulk_tasks;
DROP TABLE IF EXISTS completions;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS profiles;

-- 2. SETUP: Create tables fresh

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (Public user data, linked to secure auth.users)
create table profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  email text
);
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);

-- Tasks
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users default auth.uid(),
  title text not null,
  description text,
  frequency text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by text,
  scheduled_date text,
  week_day integer,
  month_day integer
);
alter table tasks enable row level security;
create policy "Users can manage their own tasks" on tasks for all using (auth.uid() = user_id);

-- Completions
create table completions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users default auth.uid(),
  task_id uuid references tasks(id) on delete cascade,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date_key text not null,
  completed_by text
);
alter table completions enable row level security;
create policy "Users can manage their own completions" on completions for all using (auth.uid() = user_id);

-- Bulk Tasks (Projects)
create table bulk_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users default auth.uid(),
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by text
);
alter table bulk_tasks enable row level security;
create policy "Users can manage their own projects" on bulk_tasks for all using (auth.uid() = user_id);

-- Sub Tasks
create table sub_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users default auth.uid(),
  bulk_task_id uuid references bulk_tasks(id) on delete cascade,
  title text not null,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  completed_by text
);
alter table sub_tasks enable row level security;
create policy "Users can manage their own subtasks" on sub_tasks for all using (auth.uid() = user_id);

-- Activity Log
create table activity_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users default auth.uid(),
  user_name text,
  action text,
  target_type text,
  target_title text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table activity_log enable row level security;
create policy "Users can manage their own activity logs" on activity_log for all using (auth.uid() = user_id);
```

## Schema Definitions

### 1. Profiles (`public.profiles`)
Links Supabase Auth Users to Application Usernames.
- `id` (UUID, FK to auth.users)
- `username` (Text, Unique)
- `email` (Text)
- **Note:** Passwords are stored in the secure `auth.users` table, not here.

### 2. Tasks (`public.tasks`)
- `id` (UUID)
- `title` (Text)
- `description` (Text)
- `frequency` (Text)
- `created_at` (Timestamp)
- `created_by` (Text)
- `scheduled_date` (Text)
- `week_day` (Int)
- `month_day` (Int)
- `user_id` (UUID, FK)

### 3. Completions (`public.completions`)
- `id` (UUID)
- `task_id` (UUID, FK)
- `date_key` (Text)
- `completed_by` (Text)

### 4. Bulk Tasks (`public.bulk_tasks`)
- `id` (UUID)
- `title` (Text)
- `created_by` (Text)

### 5. Sub Tasks (`public.sub_tasks`)
- `id` (UUID)
- `bulk_task_id` (UUID, FK)
- `title` (Text)
- `is_completed` (Boolean)

### 6. Activity Log (`public.activity_log`)
- `id` (UUID)
- `user_name` (Text)
- `action` (Text)
- `target_type` (Text)
- `target_title` (Text)
- `timestamp` (Timestamp)

## Authentication Flow
1.  **Register:** Creates a Supabase Auth User + Creates a `profiles` entry with the username.
2.  **Login:** Resolves Username -> Email (via `profiles`), then authenticates with `auth.signInWithPassword`.