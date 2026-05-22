create table if not exists public.notion_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_notion_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  bot_id text not null,
  workspace_id text,
  workspace_name text,
  workspace_icon text,
  duplicated_template_id text,
  notion_database_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notion_oauth_states enable row level security;
alter table public.user_notion_connections enable row level security;

create index if not exists notion_oauth_states_expires_at_idx
  on public.notion_oauth_states(expires_at);

create unique index if not exists user_notion_connections_bot_id_idx
  on public.user_notion_connections(bot_id);
