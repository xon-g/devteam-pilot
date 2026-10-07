import { CONTACT_EMAIL } from './config.js';

for (const el of document.querySelectorAll('[data-contact-email]')) {
  el.href = 'mailto:' + CONTACT_EMAIL;
  el.textContent = CONTACT_EMAIL;
}
