/* NutriVision auth + profile sync (Supabase). Optional: app works fully without an account.
   Diary, meals, water and weight history stay on the device. Only the profile
   (name, body stats, goal, language) syncs when the user signs in. */
(function(){
  const url = window.SUPABASE_URL || '';
  const key = window.SUPABASE_ANON_KEY || '';
  const ready = !!(url && key && window.supabase);
  let sb = null, user = null;

  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const plugins = (window.Capacitor && window.Capacitor.Plugins) || {};

  if (ready) {
    sb = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
    });
    // Android APK: Google sign-in runs in the system browser and returns via ma.nutrivision.app://
    if (isNative && plugins.App) {
      plugins.App.addListener('appUrlOpen', async ({ url }) => {
        if (!url || url.indexOf('auth/callback') === -1) return;
        try {
          if (url.indexOf('code=') !== -1) await sb.auth.exchangeCodeForSession(url);
          // implicit-flow hash URLs are picked up by detectSessionInUrl instead
        } catch (e) { /* session listener will stay signed out */ }
        try { if (plugins.Browser) await plugins.Browser.close(); } catch (e) {}
      });
    }
    sb.auth.onAuthStateChange(async (ev, session) => {
      user = session ? session.user : null;
      if (ev === 'SIGNED_IN') await pullProfile();
      if (window.NVOnAuth) window.NVOnAuth(user);
    });
    sb.auth.getSession().then(({ data }) => { user = data.session ? data.session.user : null; if (window.NVOnAuth) window.NVOnAuth(user); });
  }

  async function signIn(email, pw) {
    if (!ready) return { error: { message: 'auth not configured' } };
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (!error) user = data.user;
    return { error };
  }
  async function signUp(email, pw) {
    if (!ready) return { error: { message: 'auth not configured' } };
    const { data, error } = await sb.auth.signUp({ email, password: pw });
    if (!error) user = data.user;
    return { error };
  }
  async function signOut() { if (sb) await sb.auth.signOut(); user = null; }
  async function signInWithGoogle() {
    if (!ready) return { error: { message: 'auth not configured' } };
    const redirectTo = isNative ? 'ma.nutrivision.app://auth/callback' : window.location.origin + '/';
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: isNative }
    });
    if (!error && isNative && data && data.url && plugins.Browser) {
      await plugins.Browser.open({ url: data.url });
    } else if (!error && isNative && data && data.url) {
      window.location.href = data.url; // last resort if the Browser plugin is missing
    }
    return { error };
  }

  function rowFromState() {
    const p = window.S ? S.profile : null;
    if (!p) return null;
    return { id: user.id, name: p.name || '', sex: p.sex, age: p.age, height: p.height,
      weight: p.weight, activity: p.activity, goal: p.goal, target_kcal: p.targetKcal,
      lang: p.lang, theme: p.theme, updated_at: new Date().toISOString() };
  }
  async function pushProfile() {
    if (!ready || !user) return;
    const row = rowFromState();
    if (row) await sb.from('profiles').upsert(row);
  }
  async function pullProfile() {
    if (!ready || !user || !window.S) return;
    const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!data) { await pushProfile(); return; }
    const p = S.profile;
    // Remote wins only when it is newer than the local profile edit.
    const remoteT = new Date(data.updated_at || 0).getTime();
    const localT = S.profileT || 0;
    if (remoteT >= localT) {
      Object.assign(p, { name: data.name || p.name, sex: data.sex || p.sex, age: data.age ?? p.age,
        height: data.height ?? p.height, weight: data.weight ?? p.weight,
        activity: data.activity ?? p.activity, goal: data.goal || p.goal,
        targetKcal: data.target_kcal ?? p.targetKcal, lang: data.lang || p.lang,
        theme: data.theme || p.theme, onboarded: true });
      S.profileT = remoteT;
      save(); applyTheme(); applyLang();
      if (!$('#app').classList.contains('hidden')) go('home');
    }
  }
  window.NVAuth = { ready, signIn, signUp, signOut, signInWithGoogle, pushProfile,
    get user() { return user; } };
})();
