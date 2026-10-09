// "More xonicbox tools" block: replaces the static fallback list with the shared list, relabels per language.
import { MORE_SITES } from './config.js';
import { loadSites, moreSitesModel } from './more-sites.js';
import { t } from './i18n.js';

let sites = null;
let lang = 'taglish';

function render() {
  const list = document.querySelector('#more-sites .more-sites-list');
  if (!list || !sites) return;
  const soon = t(lang, 'moreSoon');
  list.replaceChildren(...sites.map((s) => {
    const li = document.createElement('li');
    if (s.soon) {
      li.textContent = `${s.name} ${soon}`;
    } else {
      const a = document.createElement('a');
      a.href = s.href;
      a.rel = 'noopener';
      a.textContent = s.name;
      li.append(a);
    }
    return li;
  }));
}

// Call on every language change.
export function relabelMoreSites(newLang) {
  lang = newLang;
  const title = document.getElementById('more-sites-title');
  if (title) title.textContent = t(lang, 'moreTitle');
  render();
}

// Language comes from the latest relabelMoreSites() call.
export async function initMoreSites() {
  try {
    sites = moreSitesModel(await loadSites(MORE_SITES), MORE_SITES.selfId);
    render();
  } catch { /* keep the static list */ }
}
