-- Lunch Order — chạy trong Supabase SQL Editor (một lần)
-- Project Settings → API → dùng URL + service_role key trong .env server

create table if not exists app_state (
  id text primary key default 'main',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table app_state is 'Toàn bộ AppState Lunch Order (members, orders, fund, history...)';

-- Cho phép service_role ghi; anon không cần truy cập bảng này (server dùng service_role)
alter table app_state enable row level security;

-- Không policy cho anon/authenticated → chỉ service_role bypass RLS được ghi/đọc

-- Seed rỗng (tùy chọn). Server sẽ upsert nếu chưa có.
-- insert into app_state (id, data) values ('main', '{}'::jsonb)
-- on conflict (id) do nothing;
