// ============================================
// ТСН «Строителей 5» — модал входа + nav update
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const config = window.TSN_CONFIG || {};

const isConfigured = !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY
  && !config.SUPABASE_URL.includes('YOUR_'));

const supabase = isConfigured
  ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

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

  if (!supabase) return;

  const { data: resident } = await supabase
    .from('residents')
    .select('name, apartment')
    .eq('user_id', user.id)
    .single();

  if (resident) {
    const initials = resident.name
      .split(' ').slice(0, 2)
      .map(w => w[0] || '').join('').toUpperCase();
    if (navAvatar)   navAvatar.textContent   = initials || '?';
    if (navUserName) navUserName.textContent = resident.name;
    if (navUserApt)  navUserApt.textContent  = `кв. ${resident.apartment}`;
  } else {
    if (navAvatar)   navAvatar.textContent   = '?';
    if (navUserName) navUserName.textContent = user.email || '';
    if (navUserApt)  navUserApt.textContent  = '';
  }
}

// ============================================
// NAV DROPDOWN (для залогиненных)
// ============================================

const navUserBtn  = document.getElementById('navUserBtn');
const navDropdown = document.getElementById('navDropdown');

if (navUserBtn && navDropdown) {
  navUserBtn.addEventListener('click', () => {
    const isOpen = navDropdown.hidden === false;
    navDropdown.hidden = isOpen;
    navUserBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  // Закрывать дропдаун при клике вне
  document.addEventListener('click', e => {
    if (navUserBtn && navDropdown && !navUserBtn.contains(e.target) && !navDropdown.contains(e.target)) {
      navDropdown.hidden = true;
      navUserBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// Кнопка выхода в nav
const navLogoutBtn = document.getElementById('navLogoutBtn');
if (navLogoutBtn) {
  navLogoutBtn.addEventListener('click', async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/';
  });
}

// ============================================
// ЭЛЕМЕНТЫ МОДАЛА
// ============================================

const modal      = document.getElementById('accountModal');
const modalInner = modal ? modal.querySelector('.modal-inner') : null;
const closeBtn   = document.getElementById('modalClose');

const mlLogin    = document.getElementById('mlLogin');
const mlRecovery = document.getElementById('mlRecovery');

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

// ============================================
// ОТКРЫТИЕ / ЗАКРЫТИЕ — не зависит от CSS-кэша
// ============================================

function openModal() {
  if (!modal) return;
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
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.style.display = 'none';
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

function showState(active) {
  [mlLogin, mlRecovery].forEach(s => {
    if (s) s.hidden = s !== active;
  });
}

if (modal && modalInner) {
  modal.addEventListener('click', e => {
    if (!modalInner.contains(e.target)) closeModal();
  });
}

if (closeBtn) closeBtn.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Кнопки с data-account-modal:
// если залогинен → редирект на /account, иначе открыть модал
document.querySelectorAll('[data-account-modal]').forEach(el => {
  el.addEventListener('click', async e => {
    e.preventDefault();
    if (!supabase) { openModal(); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      window.location.href = '/account';
    } else {
      openModal();
    }
  });
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
    updateNav(session ? session.user : null);
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    updateNav(session ? session.user : null);
  });
}

// ============================================
// ВХОД
// ============================================

if (mlLoginForm) {
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
    } else {
      // Успешный вход — редирект на /account
      window.location.href = '/account';
    }
  });
}

// ============================================
// СБРОС ПАРОЛЯ
// ============================================

if (mlResetToggle) {
  mlResetToggle.addEventListener('click', () => {
    mlResetBox.hidden = !mlResetBox.hidden;
    mlResetToggle.textContent = mlResetBox.hidden ? 'Забыли пароль?' : 'Скрыть';
  });
}

if (mlResetForm) {
  mlResetForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!supabase) return;
    mlResetBtn.disabled = true;
    mlResetBtn.textContent = 'Отправляем…';
    setStatus(mlResetStatus, '', '');

    const { error } = await supabase.auth.resetPasswordForEmail(
      mlResetForm.email.value.trim(),
      { redirectTo: `${location.origin}/account` }
    );

    setStatus(mlResetStatus,
      error ? 'error' : 'success',
      error ? 'Не удалось отправить. Проверьте email.' : '✓ Письмо отправлено. Проверьте почту.'
    );
    mlResetBtn.disabled = false;
    mlResetBtn.textContent = 'Отправить письмо →';
  });
}

// ============================================
// НОВЫЙ ПАРОЛЬ (по ссылке из письма)
// ============================================

if (mlRecoveryForm) {
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
      setStatus(mlRecoveryStatus, 'success', '✓ Пароль изменён. Переходим в кабинет…');
      setTimeout(() => { window.location.href = '/account'; }, 1200);
    }
  });
}
