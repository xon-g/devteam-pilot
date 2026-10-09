export const CONTACT_EMAIL = 'hello@xonicbox.com';
export const PCSO_RESULTS_URL = 'https://www.pcso.gov.ph/SearchLottoResult.aspx';
export const PCSO_FACEBOOK_URL = 'https://www.facebook.com/pcsoofficialsocialmedia';
export const SITE_URL = 'https://lotto.xonicbox.com/';

// "More xonicbox tools": shared list at xonicbox.com/sites.json; `tools` is the built-in fallback (same 5 sites).
export const MORE_SITES = {
  selfId: 'lotto',
  sitesUrl: 'https://xonicbox.com/sites.json',
  tools: [
    { id: 'lotto', name: 'Lotto Lucky Numbers PH', tagline: 'Random lucky numbers for fun, 18+', url: 'https://lotto.xonicbox.com/' },
    { id: 'leave', name: 'Sulit Leave PH', tagline: 'Plan your leave around PH holidays', url: 'https://leave.xonicbox.com/' },
    { id: 'kitakita', name: 'KitaKita', tagline: 'Does AI recommend your business?', url: null },
    { id: 'hayag', name: 'Hayag Cebu', tagline: 'Brownout and water schedules per barangay', url: null },
    { id: 'clara', name: 'Clara', tagline: 'Clinic booking', url: null },
  ],
};
