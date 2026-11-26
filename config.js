/* Runtime config. When the PWA and the /api proxy are deployed on the same origin
   (e.g. Vercel), leave API_BASE ''. For the Android APK (bundled offline), set
   API_BASE to the deployed proxy origin, e.g. 'https://nutrivision.vercel.app'. */
window.API_BASE = '';

/* Supabase (optional email login + profile sync). The anon key is public by design;
   row level security on the profiles table protects user data. */
window.SUPABASE_URL = 'https://vwgxmqmqmatneucfxmpu.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_NffbBKMoaA4YPYsfxmGhEg_eCIoQi9B';
