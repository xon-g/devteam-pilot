// Language picker for the content pages: shows one text block, translates the shared chrome.
import { HTML_LANG, normalizeLang, t } from './i18n.js';

const NAV_KEYS = {
  'how-to-play/': 'navHow', 'lucky-numbers/': 'navLucky', 'responsible-gaming/': 'navResponsible',
  'about/': 'navAbout', 'contact/': 'navContact', 'privacy/': 'navPrivacy',
};

function navKey(a) {
  const path = new URL(a.getAttribute('href'), location.href).pathname;
  const hit = Object.keys(NAV_KEYS).find((dir) => path.endsWith(`/${dir}`));
  return hit ? NAV_KEYS[hit] : 'navHome';
}

let lang = 'taglish';
try { lang = normalizeLang(localStorage.getItem('lang')); } catch { /* blocked storage: stay Taglish */ }

function apply() {
  document.documentElement.lang = HTML_LANG[lang];
  document.querySelectorAll('[data-lang-block]').forEach((el) => { el.hidden = el.dataset.langBlock !== lang; });
  document.getElementById('not-affiliated').textContent = t(lang, 'notAffiliated');
  document.getElementById('disclaimer').textContent = t(lang, 'disclaimer');
  const nav = document.querySelector('.site-links');
  nav.setAttribute('aria-label', t(lang, 'siteLinks'));
  nav.querySelectorAll('a').forEach((a) => { a.textContent = t(lang, navKey(a)); });
  const picked = document.querySelector(`input[name="lang"][value="${lang}"]`);
  if (picked) picked.checked = true;
}

document.querySelectorAll('input[name="lang"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    lang = normalizeLang(radio.value);
    try { localStorage.setItem('lang', lang); } catch { /* blocked storage: keep going */ }
    apply();
  });
});

apply();
