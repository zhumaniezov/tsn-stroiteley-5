// ============================================
// ТСН «Строителей 5» — клиентская логика
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const config = window.TSN_CONFIG || {};
const isSupabaseConfigured =
  config.SUPABASE_URL &&
  config.SUPABASE_ANON_KEY &&
  !config.SUPABASE_URL.includes('YOUR_') &&
  !config.SUPABASE_ANON_KEY.includes('YOUR_');

const supabase = isSupabaseConfigured
  ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    '[ТСН] Supabase не настроен. Сайт работает в демо-режиме.\n' +
    'Откройте /config.js и заполните SUPABASE_URL и SUPABASE_ANON_KEY.'
  );
}

// ============================================
// ПЕРЕКЛЮЧЕНИЕ ТЕМЫ
// ============================================

const themeToggle = document.getElementById('themeToggle');

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

// ============================================
// АНИМАЦИИ ПРИ СКРОЛЛЕ
// ============================================

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ============================================
// ЗАГРУЗКА НОВОСТЕЙ ИЗ SUPABASE
// ============================================

async function loadNews() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('news')
      .select('id, title, category, excerpt, published_at')
      .order('published_at', { ascending: false })
      .limit(4);

    if (error) throw error;
    if (!data || data.length === 0) return;

    renderNews(data);
  } catch (err) {
    console.error('[ТСН] Ошибка загрузки новостей:', err);
  }
}

function renderNews(news) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  // Разная вёрстка для разных позиций: 0 — большая, 1 — обычная, 2-3 — маленькие
  grid.innerHTML = news.map((item, i) => {
    const sizeClass = i === 0 ? 'featured' : i === 1 ? 'regular' : 'small';
    const date = new Date(item.published_at).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: i === 0 ? 'numeric' : undefined
    });
    const showExcerpt = i < 2 && item.excerpt;

    return `
      <article class="news-card ${sizeClass} reveal visible">
        <div class="news-meta">
          <span class="news-cat">${escapeHtml(item.category || 'Новости')}</span>
          <span class="news-date">${date}</span>
        </div>
        <div class="news-arrow">↗</div>
        <h3 class="news-title display">${escapeHtml(item.title)}</h3>
        ${showExcerpt ? `<p class="news-excerpt">${escapeHtml(item.excerpt)}</p>` : ''}
      </article>
    `;
  }).join('');
}

// ============================================
// ОТПРАВКА ЗАЯВКИ
// ============================================

const form = document.getElementById('requestForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    // Honeypot: если заполнено — это бот
    if (formData.get('website')) return;

    const payload = {
      category: formData.get('category'),
      apartment: formData.get('apartment'),
      name: formData.get('name'),
      description: formData.get('description'),
      phone: formData.get('phone'),
    };

    // Демо-режим: показать сообщение без отправки
    if (!supabase) {
      showStatus('success', 'Демо-режим: заявка не отправлена. Настройте Supabase в /config.js');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    try {
      const { error } = await supabase
        .from('requests')
        .insert([payload]);

      if (error) throw error;

      form.reset();
      showStatus('success', '✓ Заявка принята. Мы свяжемся с вами в течение 12 часов.');
    } catch (err) {
      console.error('[ТСН] Ошибка отправки:', err);
      showStatus('error', 'Не удалось отправить заявку. Позвоните в диспетчерскую: +7 (499) 755-72-28');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку →';
    }
  });
}

function showStatus(type, message) {
  if (!statusEl) return;
  statusEl.className = `form-status ${type}`;
  statusEl.textContent = message;
  if (type === 'success') {
    setTimeout(() => { statusEl.className = 'form-status'; }, 8000);
  }
}

// ============================================
// УТИЛИТА: экранирование HTML
// ============================================

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

loadNews();
