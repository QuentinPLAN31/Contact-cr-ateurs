-- À exécuter une fois dans Supabase > SQL Editor (sans risque si déjà fait)
alter table creators add column if not exists website text;

create table if not exists scrape_jobs (
  id bigint generated always as identity primary key,
  platform text not null,
  query text not null,
  min_followers int default 0,
  max_followers int default 0,
  max_results int default 50,
  status text default 'pending',
  found int default 0,
  added int default 0,
  message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table scrape_jobs enable row level security;
