// Language picker for the content pages: shows one text block, translates the shared chrome.
import { HTML_LANG, normalizeLang, t } from './i18n.js';
import { hireMailto } from './hire.js';
import { eventPath, track } from './analytics.js';

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
  // Stored language the page has no block for: show Taglish.
  const blocks = [...document.querySelectorAll('[data-lang-block]')];
  const shown = blocks.some((el) => el.dataset.langBlock === lang) ? lang : 'taglish';
  document.documentElement.lang = HTML_LANG[shown];
  blocks.forEach((el) => { el.hidden = el.dataset.langBlock !== shown; });
  document.getElementById('not-affiliated').textContent = t(shown, 'notAffiliated');
  document.getElementById('disclaimer').textContent = t(shown, 'disclaimer');
  document.getElementById('hire-title').textContent = t(shown, 'hireTitle');
  document.querySelector('.hire-text').textContent = t(shown, 'hireText');
  const hire = document.querySelector('.hire-link');
  hire.textContent = t(shown, 'hireCta');
  hire.href = hireMailto(shown);
  const nav = document.querySelector('.site-links');
  nav.setAttribute('aria-label', t(shown, 'siteLinks'));
  nav.querySelectorAll('a').forEach((a) => { a.textContent = t(shown, navKey(a)); });
  const picked = document.querySelector(`input[name="lang"][value="${shown}"]`);
  if (picked) picked.checked = true;
}

document.querySelector('.hire-link').addEventListener('click', () => {
  track(window.goatcounter, eventPath('hire-click'));
});

document.querySelectorAll('input[name="lang"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    lang = normalizeLang(radio.value);
    try { localStorage.setItem('lang', lang); } catch { /* blocked storage: keep going */ }
    apply();
  });
});

apply();
