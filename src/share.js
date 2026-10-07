export const SHARE_TARGETS = ['fb', 'msgr', 'viber', 'wa', 'tg', 'x', 'tiktok', 'copy'];

const LABELS = {
  fb: 'Facebook',
  msgr: 'Messenger',
  viber: 'Viber',
  wa: 'WhatsApp',
  tg: 'Telegram',
  x: 'X',
};

const enc = encodeURIComponent;

export function shareUrl(siteUrl, ref) {
  const base = String(siteUrl).split('#')[0].split('?')[0];
  return `${base}?ref=${ref}`;
}

export function shareLinks(text, siteUrl) {
  const u = (id) => enc(shareUrl(siteUrl, id));
  const t = enc(text);
  const withUrl = (id) => enc(`${text} ${shareUrl(siteUrl, id)}`);
  const hrefs = {
    fb: `https://www.facebook.com/sharer/sharer.php?u=${u('fb')}`,
    msgr: `fb-messenger://share/?link=${u('msgr')}`,
    viber: `viber://forward?text=${withUrl('viber')}`,
    wa: `https://wa.me/?text=${withUrl('wa')}`,
    tg: `https://t.me/share/url?url=${u('tg')}&text=${t}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u('x')}`,
  };
  return SHARE_TARGETS.filter((id) => id !== 'copy' && id !== 'tiktok').map((id) => ({ id, label: LABELS[id], href: hrefs[id] }));
}

export function isMobileUA(ua) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua || '');
}

export function copyText(text, siteUrl) {
  return `${text} ${shareUrl(siteUrl, 'copy')}`;
}
