// Shows the ad slot only when the generated markup put an AdSense <ins> in it.
export function initAdSlot() {
  const slot = document.getElementById('ad-slot');
  if (!slot || !slot.querySelector('ins.adsbygoogle')) return;
  slot.hidden = false;
  (window.adsbygoogle = window.adsbygoogle || []).push({});
}
