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
