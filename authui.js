/* Auth sheet UI wiring. Runs after app.js and auth.js. */
(function(){
  const sheet = $('#authSheet');
  function refreshAuth() {
    const u = window.NVAuth && NVAuth.user;
    $('#authSignedOut').classList.toggle('hidden', !!u);
    $('#authSignedIn').classList.toggle('hidden', !u);
    $('#authWho').textContent = u ? (t('signedInAs') + ' ' + (u.email || '')) : '';
    $('#accountState').textContent = u ? '✓' : '';
    if (u) sheet.classList.add('hidden');
  }
  window.NVOnAuth = function(u){
    refreshAuth();
    if (u) toast(t('welcomeBack') + ' ✓');
  };
  $('#btnAccount').addEventListener('click', () => {
    $('#settingsSheet').classList.add('hidden');
    $('#authErr').textContent = '';
    refreshAuth();
    sheet.classList.remove('hidden');
  });
  $('#closeAuth').addEventListener('click', () => sheet.classList.add('hidden'));
  async function go(fn) {
    const email = $('#authEmail').value.trim(), pw = $('#authPass').value;
    const err = $('#authErr');
    err.textContent = '';
    if (!email || !pw) { err.textContent = t('authNeedBoth'); return; }
    if (!window.NVAuth || !NVAuth.ready) { err.textContent = t('authNotConfigured'); return; }
    const { error } = await fn(email, pw);
    if (error) err.textContent = error.message || t('authErr');
    else if (fn === NVAuth.signUp && !NVAuth.user) err.textContent = t('authCheckEmail');
  }
  $('#btnSignIn').addEventListener('click', () => go(NVAuth.signIn));
  $('#btnGoogle').addEventListener('click', async () => {
    const err = $('#authErr');
    err.textContent = '';
    if (!window.NVAuth || !NVAuth.ready) { err.textContent = t('authNotConfigured'); return; }
    const { error } = await NVAuth.signInWithGoogle();
    if (error) err.textContent = error.message || t('authErr');
  });
  $('#btnSignUp').addEventListener('click', () => go(NVAuth.signUp));
  $('#btnSignOut').addEventListener('click', async () => { await NVAuth.signOut(); refreshAuth(); });
})();
