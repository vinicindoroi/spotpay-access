
-- roles
create type public.app_role as enum ('admin','moderator','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins read roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- support tickets
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text,
  email text,
  subject text,
  message text,
  kind text not null default 'support',
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
alter table public.support_tickets enable row level security;
create policy "own tickets select" on public.support_tickets for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "own tickets insert" on public.support_tickets for insert to authenticated with check (auth.uid() = user_id);
create policy "admins update tickets" on public.support_tickets for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- refunds
create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  amount numeric(12,2),
  reason text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  stage text not null default 'Refund pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.refund_requests to authenticated;
grant all on public.refund_requests to service_role;
alter table public.refund_requests enable row level security;
create policy "own refunds select" on public.refund_requests for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "own refunds insert" on public.refund_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "admins update refunds" on public.refund_requests for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- withdrawals
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  amount numeric(12,2),
  account_email text,
  account_holder text,
  full_name text,
  document text,
  birth_date date,
  address text,
  documents jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  stage text not null default 'Documents received',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.withdrawal_requests to authenticated;
grant all on public.withdrawal_requests to service_role;
alter table public.withdrawal_requests enable row level security;
create policy "own withdrawals select" on public.withdrawal_requests for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "own withdrawals insert" on public.withdrawal_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "admins update withdrawals" on public.withdrawal_requests for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- chat
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user','admin')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index chat_messages_user_created_idx on public.chat_messages (user_id, created_at);
grant select, insert, update on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "chat select" on public.chat_messages for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "chat insert user" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id and sender = 'user');
create policy "chat insert admin" on public.chat_messages for insert to authenticated with check (public.has_role(auth.uid(),'admin') and sender = 'admin');
create policy "chat update" on public.chat_messages for update to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin')) with check (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- admins can read all profiles
create policy "admins read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins read state" on public.user_state for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- updated_at triggers
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_support before update on public.support_tickets for each row execute function public.touch_updated_at();
create trigger t_refund before update on public.refund_requests for each row execute function public.touch_updated_at();
create trigger t_withdraw before update on public.withdrawal_requests for each row execute function public.touch_updated_at();

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users where email = 'viniciobdf@gmail.com'
on conflict do nothing;
