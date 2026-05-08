// ============================================
// ТСН «Строителей 5» — модал личного кабинета
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const config = window.TSN_CONFIG || {};

// Если Supabase не настроен — модал открываем, но без данных
const isConfigured = !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY
  && !config.SUPABASE_URL.includes('YOUR_'));

const supabase = isConfigured
  ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

// ============================================
// ЭЛЕМЕНТЫ
// ============================================

const modal      = document.getElementById('accountModal');
const modalInner = modal.querySelector('.modal-inner');
const closeBtn   = document.getElementById('modalClose');

const mlLogin    = document.getElementById('mlLogin');
const mlRecovery = document.getElementById('mlRecovery');
const mlDash     = document.getElementById('mlDash');

const mlLoginForm   = document.getElementById('mlLoginForm');
const mlLoginBtn    = document.getElementById('mlLoginBtn');
const mlLoginStatus = document.getElementById('mlLoginStatus');

const mlResetToggle = document.getElementById('mlResetToggle');
const mlResetBox    = document.getElementById('mlResetBox');
const mlResetForm   = document.getElementById('mlResetForm');
const mlResetBtn    = document.getElementById('mlResetBtn');
const mlResetStatus = document.getElementById('mlResetStatus');

const mlRecoveryForm   = document.getElementById('mlRecoveryForm');
const mlRecoveryBtn    = document.getElementById('mlRecoveryBtn');
const mlRecoveryStatus = document.getElementById('mlRecoveryStatus');

const mlLogoutBtn       = document.getElementById('mlLogoutBtn');
const mlBoardBadge      = document.getElementById('mlBoardBadge');
const mlChangePwdToggle = document.getElementById('mlChangePwdToggle');
const mlChangePwdBox    = document.getElementById('mlChangePwdBox');
const mlChangePwdForm   = document.getElementById('mlChangePwdForm');
const mlChangePwdBtn    = document.getElementById('mlChangePwdBtn');
const mlChangePwdCancel = document.getElementById('mlChangePwdCancel');
const mlChangePwdStatus = document.getElementById('mlChangePwdStatus');

// ============================================
// ОТКРЫТИЕ / ЗАКРЫТИЕ — не зависит от CSS-кэша
// ============================================

function openModal() {
  modal.removeAttribute('hidden');
  modal.classList.add('is-open');
  // Inline-стили как гарантия: работают даже при устаревшем кэше CSS
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.background = 'rgba(0,0,0,0.58)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.style.display = 'none';
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

// Клик вне modal-inner закрывает модал
modal.addEventListener('click', e => {
  if (!modalInner.contains(e.target)) closeModal();
});

closeBtn.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Кнопки с data-account-modal открывают модал
document.querySelectorAll('[data-account-modal]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); openModal(); });
});

// ============================================
// AUTH — только если Supabase настроен
// ============================================

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      openModal();
      showState(mlRecovery);
      return;
    }
    if (session) {
      showDash(session.user);
    } else {
      showState(mlLogin);
    }
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) showDash(session.user);
  });
}

// ============================================
// ВХОД
// ============================================

mlLoginForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabase) { setStatus(mlLoginStatus, 'error', 'Supabase не настроен в config.js'); return; }

  setStatus(mlLoginStatus, '', '');
  mlLoginBtn.disabled = true;
  mlLoginBtn.textContent = 'Входим…';

  const { error } = await supabase.auth.signInWithPassword({
    email:    mlLoginForm.email.value.trim(),
    password: mlLoginForm.password.value,
  });

  if (error) {
    setStatus(mlLoginStatus, 'error', 'Неверный email или пароль');
    mlLoginBtn.disabled = false;
    mlLoginBtn.textContent = 'Войти →';
  }
});

// ============================================
// СБРОС ПАРОЛЯ
// ============================================

mlResetToggle.addEventListener('click', () => {
  mlResetBox.hidden = !mlResetBox.hidden;
  mlResetToggle.textContent = mlResetBox.hidden ? 'Забыли пароль?' : 'Скрыть';
});

mlResetForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabase) return;
  mlResetBtn.disabled = true;
  mlResetBtn.textContent = 'Отправляем…';
  setStatus(mlResetStatus, '', '');

  const { error } = await supabase.auth.resetPasswordForEmail(
    mlResetForm.email.value.trim(),
    { redirectTo: location.origin }
  );

  setStatus(mlResetStatus,
    error ? 'error' : 'success',
    error ? 'Не удалось отправить. Проверьте email.' : '✓ Письмо отправлено. Проверьте почту.'
  );
  mlResetBtn.disabled = false;
  mlResetBtn.textContent = 'Отправить письмо →';
});

// ============================================
// НОВЫЙ ПАРОЛЬ (по ссылке из письма)
// ============================================

mlRecoveryForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabase) return;
  const pwd  = mlRecoveryForm.password.value;
  const pwd2 = mlRecoveryForm.password2.value;
  if (pwd !== pwd2) { setStatus(mlRecoveryStatus, 'error', 'Пароли не совпадают'); return; }

  mlRecoveryBtn.disabled = true;
  mlRecoveryBtn.textContent = 'Сохраняем…';
  setStatus(mlRecoveryStatus, '', '');

  const { error } = await supabase.auth.updateUser({ password: pwd });

  if (error) {
    setStatus(mlRecoveryStatus, 'error', 'Не удалось сохранить. Попробуйте ещё раз.');
    mlRecoveryBtn.disabled = false;
    mlRecoveryBtn.textContent = 'Сохранить пароль →';
  } else {
    setStatus(mlRecoveryStatus, 'success', '✓ Пароль изменён. Открываем кабинет…');
  }
});

// ============================================
// ВЫХОД
// ============================================

mlLogoutBtn.addEventListener('click', async () => {
  if (supabase) await supabase.auth.signOut();
  closeModal();
});

// ============================================
// СМЕНА ПАРОЛЯ ИЗ ДАШБОРДА
// ============================================

mlChangePwdToggle.addEventListener('click', () => {
  mlChangePwdBox.hidden = !mlChangePwdBox.hidden;
  mlChangePwdToggle.textContent = mlChangePwdBox.hidden ? 'Сменить пароль' : 'Скрыть';
});

mlChangePwdCancel.addEventListener('click', () => {
  mlChangePwdBox.hidden = true;
  mlChangePwdToggle.textContent = 'Сменить пароль';
  mlChangePwdForm.reset();
  setStatus(mlChangePwdStatus, '', '');
});

mlChangePwdForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabase) return;
  const pwd  = mlChangePwdForm.password.value;
  const pwd2 = mlChangePwdForm.password2.value;
  if (pwd !== pwd2) { setStatus(mlChangePwdStatus, 'error', 'Пароли не совпадают'); return; }

  mlChangePwdBtn.disabled = true;
  mlChangePwdBtn.textContent = 'Сохраняем…';
  setStatus(mlChangePwdStatus, '', '');

  const { error } = await supabase.auth.updateUser({ password: pwd });
  setStatus(mlChangePwdStatus,
    error ? 'error' : 'success',
    error ? 'Не удалось сохранить.' : '✓ Пароль успешно изменён'
  );
  mlChangePwdBtn.disabled = false;
  mlChangePwdBtn.textContent = 'Сохранить →';
  if (!error) mlChangePwdForm.reset();
});

// ============================================
// ДАШБОРД
// ============================================

async function showDash(user) {
  showState(mlDash);
  if (!supabase) return;

  const { data: resident } = await supabase
    .from('residents')
    .select('name, apartment, is_board')
    .eq('user_id', user.id)
    .single();

  if (resident) {
    const initials = resident.name
      .split(' ').slice(0, 2)
      .map(w => w[0] || '').join('').toUpperCase();

    document.getElementById('mlAvatar').textContent = initials || '?';
    document.getElementById('mlName').textContent   = resident.name;
    document.getElementById('mlApt').textContent    =
      `ул. Строителей, 5 · кв. ${resident.apartment}`;
    mlBoardBadge.hidden = !resident.is_board;
    loadRequests(resident.apartment, resident.is_board);
  } else {
    document.getElementById('mlName').textContent = user.email;
    document.getElementById('mlApt').textContent  =
      'Профиль не найден — обратитесь в правление';
    loadRequests(null, false);
  }
}

// ============================================
// ЗАЯВКИ
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
  if (!supabase) return;
  const list = document.getElementById('mlRequestsList');

  let query = supabase
    .from('requests')
    .select('id, category, apartment, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!isBoard && apartment) query = query.eq('apartment', apartment);

  const { data, error } = await query;

  if (error) {
    list.innerHTML = '<p class="requests-empty">Не удалось загрузить заявки</p>';
    return;
  }
  if (!data?.length) {
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
          ${new Date(r.created_at).toLocaleDateString('ru-RU', {day:'numeric', month:'short'})}
        </span>
      </div>
      <p class="request-item-desc">${escapeHtml(r.description)}</p>
    </div>
  `).join('');
}

// ============================================
// УТИЛИТЫ
// ============================================

function showState(active) {
  [mlLogin, mlRecovery, mlDash].forEach(s => { s.hidden = s !== active; });
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
