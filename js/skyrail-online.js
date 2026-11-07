/* SkyRail L17 — autenticação Supabase por usuário e senha (sem cadastro público). */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const screen = $('skyrail-login-screen');
  const form = $('skyrail-login-card');
  const userInput = $('skyrail-login-user');
  const passInput = $('skyrail-login-password');
  const submit = $('skyrail-login-submit');
  const errorBox = $('skyrail-login-error');
  const logout = $('skyrail-logout-btn');
  const adminButton = $('skyrail-admin-btn');
  const adminModal = $('skyrail-admin-modal');
  const adminForm = $('skyrail-admin-card');
  const adminMessage = $('skyrail-admin-message');
  const launcher = $('launcher');
  if (!screen || !form || !userInput || !passInput || !submit || !errorBox || !launcher) return;

  const config = window.SKYRAIL_CONFIG || {};
  const configured = typeof config.supabaseUrl === 'string' && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl.trim()) &&
    typeof config.supabaseAnonKey === 'string' && config.supabaseAnonKey.trim().length > 20 && !config.supabaseAnonKey.includes('COLE_AQUI');
  let client = null;
  let busy = false;

  function message(text, isError = true) {
    errorBox.textContent = text || '';
    errorBox.style.color = isError ? '#ff9c91' : '#9fe0ae';
  }
  function setBusy(value) {
    busy = value;
    submit.disabled = value;
    submit.textContent = value ? 'AGUARDE…' : 'ENTRAR NO SKYRAIL';
  }
  async function verifyActiveProfile(session) {
    const { data: profile, error } = await client.from('skyrail_profiles')
      .select('active,role').eq('id', session.user.id).maybeSingle();
    if (error || !profile || profile.active !== true) {
      await client.auth.signOut();
      throw new Error('Acesso não autorizado ou usuário desativado. Solicite liberação ao administrador.');
    }
    return profile;
  }
  function showSignedOut(reason) {
    screen.hidden = false;
    launcher.style.visibility = 'hidden';
    if (logout) logout.hidden = true;
    if (adminButton) adminButton.hidden = true;
    if (adminModal) adminModal.hidden = true;
    if (reason) message(reason);
  }
  function showSignedIn(session, profile) {
    screen.hidden = true;
    launcher.style.visibility = 'visible';
    if (adminButton) adminButton.hidden = profile?.role !== 'admin';
    if (logout) {
      logout.hidden = false;
      const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'usuário';
      logout.textContent = `Sair · ${username}`;
      logout.title = `Sessão de ${username}`;
    }
    message('');
  }
  function usernameToEmail(username) {
    const clean = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(clean)) {
      throw new Error('Informe um usuário válido (3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado).');
    }
    return `${clean}@login.skyrail.invalid`;
  }

  if (!configured) {
    showSignedOut('O Supabase ainda não foi configurado. Preencha a URL e a chave pública em js/skyrail-config.js.');
    submit.disabled = true;
  } else if (!window.supabase?.createClient) {
    showSignedOut('Não foi possível carregar o serviço de autenticação. Verifique sua conexão e atualize a página.');
    submit.disabled = true;
  } else {
    client = window.supabase.createClient(config.supabaseUrl.trim(), config.supabaseAnonKey.trim(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    showSignedOut('');
    client.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (data?.session) {
        const profile = await verifyActiveProfile(data.session);
        showSignedIn(data.session, profile);
      }
    }).catch((error) => showSignedOut(error?.message || 'Não foi possível verificar a sessão. Confira a conexão e tente novamente.'));
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') showSignedOut('Sessão encerrada. Entre novamente para continuar.');
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client || busy) return;
    message('');
    let email;
    try { email = usernameToEmail(userInput.value); }
    catch (error) { message(error.message); userInput.focus(); return; }
    if (!passInput.value) { message('Digite sua senha.'); passInput.focus(); return; }
    setBusy(true);
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password: passInput.value });
      if (error) throw error;
      if (!data?.session) throw new Error('O servidor não confirmou o acesso. Tente novamente.');
      const profile = await verifyActiveProfile(data.session);
      passInput.value = '';
      showSignedIn(data.session, profile);
    } catch (error) {
      if (error?.message?.includes('Acesso não autorizado')) {
        message(error.message);
        return;
      }
      const raw = String(error?.message || '').toLowerCase();
      if (raw.includes('invalid login credentials') || raw.includes('invalid email or password')) {
        message('Usuário ou senha incorretos, ou usuário ainda não cadastrado pelo administrador.');
      } else if (raw.includes('fetch') || raw.includes('network')) {
        message('Falha de conexão com o Supabase. Verifique a internet e a configuração do projeto.');
      } else {
        message('Não foi possível entrar. Confira suas credenciais ou fale com o administrador.');
      }
    } finally { setBusy(false); }
  });

  if (logout) logout.addEventListener('click', async () => {
    if (!client || busy) return;
    logout.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      showSignedOut('Sessão encerrada.');
    } catch (_) {
      message('Não foi possível encerrar a sessão no servidor. Tente novamente.');
    } finally { logout.disabled = false; }
  });

  if (adminButton && adminModal && adminForm) {
    adminButton.addEventListener('click', () => { adminMessage.textContent = ''; adminModal.hidden = false; $('skyrail-new-fullname').focus(); });
    $('skyrail-admin-cancel')?.addEventListener('click', () => { adminModal.hidden = true; adminForm.reset(); });
    adminForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!client) return;
      const createButton = $('skyrail-admin-create');
      const payload = {
        fullName: $('skyrail-new-fullname').value.trim(),
        username: $('skyrail-new-username').value.trim().toLowerCase(),
        password: $('skyrail-new-password').value,
      };
      adminMessage.textContent = '';
      createButton.disabled = true;
      createButton.textContent = 'CRIANDO…';
      try {
        const { data, error } = await client.functions.invoke('skyrail-admin-create-user', { body: payload });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'O servidor não confirmou o cadastro.');
        adminMessage.style.color = '#9fe0ae';
        adminMessage.textContent = `Acesso criado para ${data.user.username}. Informe a senha inicial ao funcionário.`;
        adminForm.reset();
      } catch (error) {
        adminMessage.style.color = '#ff9c91';
        adminMessage.textContent = error?.context?.error || error?.message || 'Não foi possível criar o acesso. Verifique a Edge Function.';
      } finally {
        createButton.disabled = false;
        createButton.textContent = 'CRIAR ACESSO';
      }
    });
  }
})();
