// ============================================
// ТСН «Строителей 5» — личный кабинет
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const config = window.TSN_CONFIG || {};
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

// ============================================
// ЭЛЕМЕНТЫ
// ============================================

const loginSection    = document.getElementById('loginSection');
const recoverySection = document.getElementById('recoverySection');
const dashSection     = document.getElementById('dashSection');

const loginForm    = document.getElementById('loginForm');
const loginBtn     = document.getElementById('loginBtn');
const loginStatus  = document.getElementById('loginStatus');

const resetToggle  = document.getElementById('resetToggle');
const resetSection = document.getElementById('resetSection');
const resetForm    = document.getElementById('resetForm');
const resetBtn     = document.getElementById('resetBtn');
const resetStatus  = document.getElementById('resetStatus');

const recoveryForm   = document.getElementById('recoveryForm');
const recoveryBtn    = document.getElementById('recoveryBtn');
const recoveryStatus = document.getElementById('recoveryStatus');

const logoutBtn      = document.getElementById('logoutBtn');
const boardBadge     = document.getElementById('boardBadge');

const changePwdBtn    = document.getElementById('changePwdBtn');
const changePwdCard   = document.getElementById('changePwdCard');
const changePwdForm   = document.getElementById('changePwdForm');
const changePwdSubmit = document.getElementById('changePwdSubmit');
const changePwdCancel = document.getElementById('changePwdCancel');
const changePwdStatus = document.getElementById('changePwdStatus');

// ============================================
// ТЕМА (дублируем из app.js)
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
// AUTH: РЕАКЦИЯ НА СОСТОЯНИЕ
// ============================================

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    show(recoverySection);
    return;
  }
  if (session) {
    showDashboard(session.user);
  } else {
    show(loginSection);
  }
});

// Проверка сессии при загрузке страницы
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) showDashboard(session.user);
  else show(loginSection);
});

// ============================================
// ВХОД
// ============================================

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(loginStatus, '', '');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Входим…';

  const { error } = await supabase.auth.signInWithPassword({
    email: loginForm.email.value.trim(),
    password: loginForm.password.value,
  });

  if (error) {
    setStatus(loginStatus, 'error', 'Неверный email или пароль');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Войти →';
  }
  // При успехе onAuthStateChange сам вызовет showDashboard
});

// ============================================
// ЗАБЫЛИ ПАРОЛЬ
// ============================================

resetToggle.addEventListener('click', () => {
  resetSection.hidden = !resetSection.hidden;
  resetToggle.textContent = resetSection.hidden ? 'Забыли пароль?' : 'Скрыть';
});

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus(resetStatus, '', '');
  resetBtn.disabled = true;
  resetBtn.textContent = 'Отправляем…';

  const { error } = await supabase.auth.resetPasswordForEmail(
    resetForm.email.value.trim(),
    { redirectTo: `${location.origin}/account` }
  );

  if (error) {
    setStatus(resetStatus, 'error', 'Не удалось отправить письмо. Проверьте email.');
  } else {
    setStatus(resetStatus, 'success', '✓ Письмо отправлено. Проверьте почту.');
  }
  resetBtn.disabled = false;
  resetBtn.textContent = 'Отправить письмо →';
});

// ============================================
// СМЕНА ПАРОЛЯ (по ссылке из письма)
// ============================================

recoveryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pwd  = recoveryForm.password.value;
  const pwd2 = recoveryForm.password2.value;

  if (pwd !== pwd2) {
    setStatus(recoveryStatus, 'error', 'Пароли не совпадают');
    return;
  }

  recoveryBtn.disabled = true;
  recoveryBtn.textContent = 'Сохраняем…';
  setStatus(recoveryStatus, '', '');

  const { error } = await supabase.auth.updateUser({ password: pwd });

  if (error) {
    setStatus(recoveryStatus, 'error', 'Не удалось сохранить пароль. Попробуйте ещё раз.');
    recoveryBtn.disabled = false;
    recoveryBtn.textContent = 'Сохранить пароль →';
  } else {
    setStatus(recoveryStatus, 'success', '✓ Пароль изменён. Входим в кабинет…');
    // onAuthStateChange переключит на дашборд
  }
});

// ============================================
// ВЫХОД
// ============================================

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// ============================================
// СМЕНА ПАРОЛЯ ИЗ ДАШБОРДА
// ============================================

changePwdBtn.addEventListener('click', () => {
  changePwdCard.hidden = !changePwdCard.hidden;
  changePwdBtn.textContent = changePwdCard.hidden ? 'Сменить пароль' : 'Скрыть';
});

changePwdCancel.addEventListener('click', () => {
  changePwdCard.hidden = true;
  changePwdBtn.textContent = 'Сменить пароль';
  changePwdForm.reset();
  setStatus(changePwdStatus, '', '');
});

changePwdForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pwd  = changePwdForm.password.value;
  const pwd2 = changePwdForm.password2.value;

  if (pwd !== pwd2) {
    setStatus(changePwdStatus, 'error', 'Пароли не совпадают');
    return;
  }

  changePwdSubmit.disabled = true;
  changePwdSubmit.textContent = 'Сохраняем…';
  setStatus(changePwdStatus, '', '');

  const { error } = await supabase.auth.updateUser({ password: pwd });

  if (error) {
    setStatus(changePwdStatus, 'error', 'Не удалось сохранить. Попробуйте ещё раз.');
  } else {
    setStatus(changePwdStatus, 'success', '✓ Пароль успешно изменён');
    changePwdForm.reset();
  }
  changePwdSubmit.disabled = false;
  changePwdSubmit.textContent = 'Сохранить →';
});

// ============================================
// ДАШБОРД
// ============================================

async function showDashboard(user) {
  show(dashSection);

  const { data: resident } = await supabase
    .from('residents')
    .select('name, apartment, is_board')
    .eq('user_id', user.id)
    .single();

  if (resident) {
    const initials = resident.name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0] || '')
      .join('')
      .toUpperCase();

    document.getElementById('dashAvatar').textContent = initials || '?';
    document.getElementById('dashName').textContent = resident.name;
    document.getElementById('dashApt').textContent =
      `ул. Строителей, 5 · кв. ${resident.apartment}`;
    boardBadge.hidden = !resident.is_board;

    loadRequests(resident.apartment, resident.is_board);
  } else {
    document.getElementById('dashName').textContent = user.email;
    document.getElementById('dashApt').textContent =
      'Профиль не найден — обратитесь в правление';
    loadRequests(null, false);
  }
}

// ============================================
// ЗАГРУЗКА ЗАЯВОК
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

async function loadRequests(apartment, isBoard) {
  const list = document.getElementById('requestsList');

  let query = supabase
    .from('requests')
    .select('id, category, apartment, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (!isBoard && apartment) {
    query = query.eq('apartment', apartment);
  }

  const { data, error } = await query;

  if (error) {
    list.innerHTML = '<p class="requests-empty">Не удалось загрузить заявки</p>';
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="requests-empty">Заявок пока нет</p>';
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="request-item">
      <div class="request-item-head">
        <span class="req-status-badge status-${escapeHtml(r.status)}">
          ${STATUS_LABELS[r.status] || escapeHtml(r.status)}
        </span>
        <span class="request-item-cat">${CAT_LABELS[r.category] || escapeHtml(r.category)}</span>
        ${isBoard ? `<span class="request-item-apt">кв. ${escapeHtml(r.apartment)}</span>` : ''}
        <span class="request-item-date">
          ${new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>
      <p class="request-item-desc">${escapeHtml(r.description)}</p>
    </div>
  `).join('');
}

// ============================================
// УТИЛИТЫ
// ============================================

function show(section) {
  [loginSection, recoverySection, dashSection].forEach(s => {
    s.hidden = s !== section;
  });
}

function setStatus(el, type, msg) {
  el.className = type ? `form-status ${type}` : 'form-status';
  el.textContent = msg;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
