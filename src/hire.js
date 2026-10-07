// Pure builder for the "Need a website?" mailto link. DOM-free so Node tests can use it.
import { normalizeLang, t } from './i18n.js';

export const HIRE_EMAIL = 'hello@xonicbox.com';

export function hireMailto(lang) {
  const l = normalizeLang(lang);
  const subject = encodeURIComponent(t(l, 'hireSubject'));
  const body = encodeURIComponent(t(l, 'hireBody'));
  return `mailto:${HIRE_EMAIL}?subject=${subject}&body=${body}`;
}
