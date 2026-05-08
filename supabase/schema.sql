-- ============================================
-- ТСН «Строителей 5» — схема базы данных
-- ============================================
-- Запустите этот SQL в Supabase:
-- Dashboard → SQL Editor → New query → Paste → Run
-- ============================================

-- ============================================
-- ТАБЛИЦА: НОВОСТИ
-- ============================================
create table if not exists public.news (
  id bigserial primary key,
  title text not null,
  category text,
  excerpt text,
  body text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Индекс для быстрой сортировки по дате
create index if not exists news_published_at_idx
  on public.news (published_at desc);

-- Включаем Row Level Security
alter table public.news enable row level security;

-- Политика: ВСЕ могут ЧИТАТЬ новости (это публичный сайт)
create policy "Новости доступны всем для чтения"
  on public.news for select
  using (true);

-- Политика: только авторизованные могут добавлять/изменять/удалять
create policy "Только авторизованные могут добавлять новости"
  on public.news for insert
  with check (auth.role() = 'authenticated');

create policy "Только авторизованные могут изменять новости"
  on public.news for update
  using (auth.role() = 'authenticated');

create policy "Только авторизованные могут удалять новости"
  on public.news for delete
  using (auth.role() = 'authenticated');


-- ============================================
-- ТАБЛИЦА: ЗАЯВКИ ЖИЛЬЦОВ
-- ============================================
create table if not exists public.requests (
  id bigserial primary key,
  category text not null,
  apartment text not null,
  name text not null,
  phone text not null,
  description text not null,
  status text not null default 'new',  -- new / in_progress / done / closed
  created_at timestamptz not null default now()
);

create index if not exists requests_created_at_idx
  on public.requests (created_at desc);

create index if not exists requests_status_idx
  on public.requests (status);

alter table public.requests enable row level security;

-- Политика: КТО УГОДНО может создать заявку (через форму на сайте)
create policy "Любой может создать заявку"
  on public.requests for insert
  with check (true);

-- Политика: только авторизованные (правление) могут читать и менять
create policy "Только правление видит заявки"
  on public.requests for select
  using (auth.role() = 'authenticated');

create policy "Только правление меняет заявки"
  on public.requests for update
  using (auth.role() = 'authenticated');

create policy "Только правление удаляет заявки"
  on public.requests for delete
  using (auth.role() = 'authenticated');


-- ============================================
-- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: проверка членства в правлении
-- security definer — выполняется без RLS, чтобы избежать рекурсии
-- ============================================
create or replace function public.is_board_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.residents
    where user_id = auth.uid() and is_board = true
  );
$$;


-- ============================================
-- ТАБЛИЦА: ЖИЛЬЦЫ
-- Заполняется правлением через Supabase Dashboard:
--   Auth → Users → Invite user (задать email + пароль)
--   Table Editor → residents → Insert row (user_id, apartment, name)
-- ============================================
create table if not exists public.residents (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  apartment  text not null,
  name       text not null,
  is_board   boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists residents_user_id_idx
  on public.residents (user_id);

alter table public.residents enable row level security;

-- Жилец видит только свой профиль
create policy "Жилец видит свой профиль"
  on public.residents for select
  using (auth.uid() = user_id);

-- Правление видит все профили (через security definer функцию — без рекурсии)
create policy "Правление видит все профили"
  on public.residents for select
  using (public.is_board_member());

-- Правление управляет жильцами
create policy "Правление управляет жильцами"
  on public.residents for insert
  with check (public.is_board_member());

create policy "Правление обновляет жильцов"
  on public.residents for update
  using (public.is_board_member());

create policy "Правление удаляет жильцов"
  on public.residents for delete
  using (public.is_board_member());


-- ============================================
-- ОБНОВЛЕНИЕ ПОЛИТИК ДЛЯ ЗАЯВОК
-- Если таблица уже создана — выполните сначала:
--   drop policy "Только правление видит заявки" on public.requests;
-- ============================================

-- Жильцы видят только заявки своей квартиры
create policy "Жильцы видят свои заявки"
  on public.requests for select
  using (
    apartment = (
      select apartment from public.residents
      where user_id = auth.uid()
    )
  );

-- Правление видит все заявки
create policy "Правление видит все заявки"
  on public.requests for select
  using (public.is_board_member());


-- ============================================
-- ТАБЛИЦА: ПОКАЗАНИЯ СЧЁТЧИКОВ
-- ============================================
create table if not exists public.meter_readings (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  apartment text not null,
  cold_water numeric(10,3),
  hot_water numeric(10,3),
  electricity numeric(10,3),
  submitted_at timestamptz not null default now()
);

alter table public.meter_readings enable row level security;

create policy "Жилец вставляет свои показания"
  on public.meter_readings for insert
  with check (auth.uid() = user_id);

create policy "Жилец видит свои показания"
  on public.meter_readings for select
  using (auth.uid() = user_id);

create policy "Правление видит все показания"
  on public.meter_readings for select
  using (public.is_board_member());


-- ============================================
-- ПРИМЕРНЫЕ ДАННЫЕ ДЛЯ НАЧАЛА
-- ============================================
insert into public.news (title, category, excerpt, published_at) values
(
  'Завершён отопительный период 2025/2026 года',
  'Важно',
  'Согласно постановлению №353-ПП Главы городского округа Котельники, отопление отключено с 4 мая. Начисления за май будут произведены по фактическому количеству дней с отоплением.',
  '2026-05-04 10:00:00+03'
),
(
  'Гидравлические испытания тепловых сетей',
  'Сервис',
  'О сроках возможного отключения горячей воды сообщим дополнительно.',
  '2026-05-01 12:00:00+03'
),
(
  'Передача показаний счётчиков — до 25 числа',
  'Дом',
  null,
  '2026-04-25 09:00:00+03'
),
(
  'Часы приёма населения — вторник и четверг',
  'Приём',
  null,
  '2026-04-20 09:00:00+03'
);
