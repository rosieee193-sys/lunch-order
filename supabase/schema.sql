-- Lunch Order — chạy trong Supabase SQL Editor (một lần)
-- Project Settings → API → dùng URL + service_role key trong .env / Vercel

create table if not exists app_state (
  id text primary key default 'main',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table app_state is 'Toàn bộ AppState Lunch Order (members, orders, fund, history...)';

alter table app_state enable row level security;

-- Client đọc để Realtime sync (ghi vẫn chỉ qua server + service_role)
drop policy if exists "Anyone can read app_state" on app_state;
create policy "Anyone can read app_state"
  on app_state for select
  to anon, authenticated
  using (true);

-- Bật Realtime cho bảng (bỏ qua lỗi nếu đã có trong publication)
do $$
begin
  alter publication supabase_realtime add table app_state;
exception
  when duplicate_object then null;
end $$;
