create table if not exists cache (
  key text primary key,
  value jsonb not null,
  fetched_at bigint not null
);

alter table cache enable row level security;
