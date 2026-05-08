// ============================================
// ТСН «Строителей 5» — личный кабинет
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const config = window.TSN_CONFIG || {};
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

// ============================================
// КОНСТАНТЫ
// ============================================

const STATUS_LABELS = {
  new:         'Новая',
  in_progress: 'В работе',
  done:        'Выполнена',
  closed:      'Закрыта',
};

const CAT_LABELS = {
  planned: 'Плановая',
  urgent:  'Аварийная',
  board:   'В правление',
  docs:    'Документы',
};

// ============================================
// УТИЛИТЫ
// ============================================

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function setStatus(el, type, msg) {
  el.className = type ? `form-status ${type}` : 'form-status';
  el.textContent = msg;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================
// ТЕМА
// ============================================

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

// ============================================
// НАВИГАЦИЯ: обновление состояния входа
// ============================================

async function updateNav(user) {
  const navLoginBtn = document.getElementById('navLoginBtn');
  const navUser     = document.getElementById('navUser');
  const navAvatar   = document.getElementById('navAvatar');
  const navUserName = document.getElementById('navUserName');
  const navUserApt  = document.getElementById('navUserApt');

  if (!navLoginBtn || !navUser) return;

  if (!user) {
    navLoginBtn.hidden = false;
    navUser.hidden = true;
    document.documentElement.classList.remove('is-logged-in');
    return;
  }

  navLoginBtn.hidden = true;
  navUser.hidden = false;
  document.documentElement.classList.add('is-logged-in');
}

// Nav dropdown
const navUserBtn  = document.getElementById('navUserBtn');
const navDropdown = document.getElementById('navDropdown');

if (navUserBtn && navDropdown) {
  navUserBtn.addEventListener('click', () => {
    const isOpen = !navDropdown.hidden;
    navDropdown.hidden = isOpen;
    navUserBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', e => {
    if (!navUserBtn.contains(e.target) && !navDropdown.contains(e.target)) {
      navDropdown.hidden = true;
      navUserBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// Выход через nav
const navLogoutBtn = document.getElementById('navLogoutBtn');
if (navLogoutBtn) {
  navLogoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });
}

// Выход через кнопку профиля
const acctLogoutBtn = document.getElementById('acctLogoutBtn');
if (acctLogoutBtn) {
  acctLogoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });
}

// ============================================
// ДАННЫЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================

let currentResident = null;   // { name, apartment, is_board }
let allMyRequests   = [];     // кэш заявок жильца
let allBoardRequests = [];    // кэш всех заявок (для правления)

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    // На account.html тоже можно попасть по ссылке сброса
    // Редиректим обратно на главную чтобы открыть модал
    window.location.href = '/';
    return;
  }
  if (!session) {
    window.location.href = '/';
  }
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    window.location.href = '/';
    return;
  }
  updateNav(session.user);
  initDashboard(session.user);
});

// ============================================
// ДАШБОРД
// ============================================

async function initDashboard(user) {
  // Показать страницу
  const accountPage = document.getElementById('accountPage');
  if (accountPage) accountPage.hidden = false;

  // Загрузить профиль
  const { data: resident } = await supabase
    .from('residents')
    .select('name, apartment, is_board')
    .eq('user_id', user.id)
    .single();

  currentResident = resident;

  if (resident) {
    const initials = resident.name
      .split(' ').slice(0, 2)
      .map(w => w[0] || '').join('').toUpperCase();

    const acctAvatar = document.getElementById('acctAvatar');
    const acctName   = document.getElementById('acctName');
    const acctMeta   = document.getElementById('acctMeta');
    const navAvatar   = document.getElementById('navAvatar');
    const navUserName = document.getElementById('navUserName');
    const navUserApt  = document.getElementById('navUserApt');

    if (acctAvatar) acctAvatar.textContent = initials || '?';
    if (acctName)   acctName.textContent   = resident.name;
    if (acctMeta)   acctMeta.textContent   = `ул. Строителей, 5 · кв. ${resident.apartment}`;
    if (navAvatar)   navAvatar.textContent   = initials || '?';
    if (navUserName) navUserName.textContent = resident.name;
    if (navUserApt)  navUserApt.textContent  = `кв. ${resident.apartment}`;

    const boardBadge = document.getElementById('acctBoardBadge');
    if (boardBadge) boardBadge.hidden = !resident.is_board;

    if (resident.is_board) {
      const boardSection = document.getElementById('boardSection');
      if (boardSection) boardSection.hidden = false;
    }

    // Загрузить заявки
    await loadMyRequests(resident.apartment, resident.is_board);

    if (resident.is_board) {
      await loadBoardRequests();
    }

    // Загрузить последние показания
    await loadLastReadings(user.id);
  } else {
    const acctName = document.getElementById('acctName');
    const acctMeta = document.getElementById('acctMeta');
    if (acctName) acctName.textContent = user.email || '';
    if (acctMeta) acctMeta.textContent = 'Профиль не найден — обратитесь в правление';

    const myList = document.getElementById('myRequestsList');
    if (myList) myList.innerHTML = '<p class="requests-empty">Профиль не найден. Обратитесь в правление.</p>';
  }
}

// ============================================
// ФОРМА НОВОЙ ЗАЯВКИ
// ============================================

const acctNewReqBtn   = document.getElementById('acctNewReqBtn');
const acctRequestForm = document.getElementById('acctRequestForm');
const nrCancelBtn     = document.getElementById('nrCancelBtn');
const newRequestForm  = document.getElementById('newRequestForm');
const nrSubmitBtn     = document.getElementById('nrSubmitBtn');
const nrStatus        = document.getElementById('nrStatus');

if (acctNewReqBtn) {
  acctNewReqBtn.addEventListener('click', () => {
    acctRequestForm.hidden = !acctRequestForm.hidden;
    acctNewReqBtn.textContent = acctRequestForm.hidden ? '+ Подать заявку' : '− Скрыть форму';
  });
}

if (nrCancelBtn) {
  nrCancelBtn.addEventListener('click', () => {
    acctRequestForm.hidden = true;
    acctNewReqBtn.textContent = '+ Подать заявку';
    newRequestForm.reset();
    setStatus(nrStatus, '', '');
  });
}

if (newRequestForm) {
  newRequestForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentResident) return;

    nrSubmitBtn.disabled = true;
    nrSubmitBtn.textContent = 'Отправляем…';
    setStatus(nrStatus, '', '');

    const { error } = await supabase.from('requests').insert({
      category:    newRequestForm.category.value,
      description: newRequestForm.description.value.trim(),
      apartment:   currentResident.apartment,
      name:        currentResident.name,
      phone:       '',
    });

    if (error) {
      setStatus(nrStatus, 'error', 'Не удалось отправить заявку. Попробуйте ещё раз.');
    } else {
      setStatus(nrStatus, 'success', '✓ Заявка подана. Правление рассмотрит её в ближайшее время.');
      newRequestForm.reset();
      // Перезагрузить список
      await loadMyRequests(currentResident.apartment, currentResident.is_board);
      if (currentResident.is_board) await loadBoardRequests();
    }

    nrSubmitBtn.disabled = false;
    nrSubmitBtn.textContent = 'Отправить →';
  });
}

// ============================================
// ЗАЯВКИ ЖИЛЬЦА
// ============================================

async function loadMyRequests(apartment, isBoard) {
  const list = document.getElementById('myRequestsList');
  if (!list) return;

  list.innerHTML = '<div class="requests-loading">Загрузка…</div>';

  let query = supabase
    .from('requests')
    .select('id, category, apartment, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!isBoard && apartment) {
    query = query.eq('apartment', apartment);
  }

  const { data, error } = await query;

  if (error) {
    list.innerHTML = '<p class="requests-empty">Не удалось загрузить заявки</p>';
    return;
  }

  allMyRequests = data || [];
  renderRequestList('myRequestsList', allMyRequests, false);
}

function renderRequestList(listId, items, showApt) {
  const list = document.getElementById(listId);
  if (!list) return;

  // Определить активный фильтр
  const filtersId = listId === 'myRequestsList' ? 'myReqFilters' : 'boardReqFilters';
  const filtersEl = document.getElementById(filtersId);
  const activeBtn = filtersEl ? filtersEl.querySelector('.acct-filter.active') : null;
  const filter = activeBtn ? activeBtn.dataset.filter : 'all';

  const filtered = filter === 'all'
    ? items
    : items.filter(r => r.status === filter);

  if (!filtered.length) {
    list.innerHTML = '<p class="requests-empty">Заявок не найдено</p>';
    return;
  }

  list.innerHTML = filtered.map(r => `
    <div class="request-item">
      <div class="request-item-head">
        <span class="req-status-badge status-${escapeHtml(r.status)}">
          ${STATUS_LABELS[r.status] || escapeHtml(r.status)}
        </span>
        <span class="request-item-cat">${CAT_LABELS[r.category] || escapeHtml(r.category)}</span>
        ${showApt ? `<span class="request-item-apt">кв. ${escapeHtml(r.apartment)}</span>` : ''}
        <span class="request-item-date">${fmtDate(r.created_at)}</span>
      </div>
      <p class="request-item-desc">${escapeHtml(r.description)}</p>
    </div>
  `).join('');
}

// Фильтры «Мои заявки»
const myReqFilters = document.getElementById('myReqFilters');
if (myReqFilters) {
  myReqFilters.addEventListener('click', e => {
    const btn = e.target.closest('.acct-filter');
    if (!btn) return;
    myReqFilters.querySelectorAll('.acct-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRequestList('myRequestsList', allMyRequests, false);
  });
}

// ============================================
// ЗАЯВКИ ПРАВЛЕНИЯ (все заявки дома)
// ============================================

async function loadBoardRequests() {
  const list = document.getElementById('boardRequestsList');
  if (!list) return;

  list.innerHTML = '<div class="requests-loading">Загрузка…</div>';

  const { data, error } = await supabase
    .from('requests')
    .select('id, category, apartment, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    list.innerHTML = '<p class="requests-empty">Не удалось загрузить заявки</p>';
    return;
  }

  allBoardRequests = data || [];
  renderRequestList('boardRequestsList', allBoardRequests, true);
}

// Фильтры «Все заявки дома»
const boardReqFilters = document.getElementById('boardReqFilters');
if (boardReqFilters) {
  boardReqFilters.addEventListener('click', e => {
    const btn = e.target.closest('.acct-filter');
    if (!btn) return;
    boardReqFilters.querySelectorAll('.acct-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRequestList('boardRequestsList', allBoardRequests, true);
  });
}

// ============================================
// ПОКАЗАНИЯ СЧЁТЧИКОВ
// ============================================

const meterForm      = document.getElementById('meterForm');
const meterSubmitBtn = document.getElementById('meterSubmitBtn');
const meterStatus    = document.getElementById('meterStatus');

if (meterForm) {
  meterForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentResident) return;

    const cold = parseFloat(meterForm.cold_water.value) || null;
    const hot  = parseFloat(meterForm.hot_water.value)  || null;
    const elec = parseFloat(meterForm.electricity.value) || null;

    if (cold === null && hot === null && elec === null) {
      setStatus(meterStatus, 'error', 'Введите хотя бы одно показание');
      return;
    }

    meterSubmitBtn.disabled = true;
    meterSubmitBtn.textContent = 'Отправляем…';
    setStatus(meterStatus, '', '');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/'; return; }

    const { error } = await supabase.from('meter_readings').insert({
      user_id:     session.user.id,
      apartment:   currentResident.apartment,
      cold_water:  cold,
      hot_water:   hot,
      electricity: elec,
    });

    if (error) {
      setStatus(meterStatus, 'error', 'Не удалось передать показания. Попробуйте ещё раз.');
    } else {
      setStatus(meterStatus, 'success', '✓ Показания переданы. Спасибо!');
      meterForm.reset();
      await loadLastReadings(session.user.id);
    }

    meterSubmitBtn.disabled = false;
    meterSubmitBtn.textContent = 'Передать показания →';
  });
}

async function loadLastReadings(userId) {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('cold_water, hot_water, electricity, submitted_at')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  const lastReadings = document.getElementById('lastReadings');
  const lastRows     = document.getElementById('lastReadingsRows');
  if (!lastReadings || !lastRows) return;

  if (error || !data) {
    lastReadings.hidden = true;
    return;
  }

  const rows = [
    { label: 'Холодная вода', val: data.cold_water, unit: 'м³' },
    { label: 'Горячая вода',  val: data.hot_water,  unit: 'м³' },
    { label: 'Электроэнергия', val: data.electricity, unit: 'кВт·ч' },
  ].filter(r => r.val !== null && r.val !== undefined);

  if (!rows.length) {
    lastReadings.hidden = true;
    return;
  }

  const dateStr = fmtDate(data.submitted_at);
  lastRows.innerHTML = rows.map(r => `
    <div class="last-reading-row">
      <span class="last-reading-label">${escapeHtml(r.label)}</span>
      <span class="last-reading-val">${escapeHtml(String(r.val))} ${escapeHtml(r.unit)}</span>
    </div>
  `).join('') + `
    <div class="last-reading-row" style="opacity:.6;font-size:12px;">
      <span class="last-reading-label">Дата передачи</span>
      <span class="last-reading-val">${escapeHtml(dateStr)}</span>
    </div>
  `;
  lastReadings.hidden = false;
}
