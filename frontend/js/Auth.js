// ============================================================
// auth.js — Login, Register, Logout
// ============================================================

// Login/Register tab geçişi
function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login')
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register')
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', i === (tab === 'login' ? 0 : 1))
  })
}

async function login() {
  const email    = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  if (!email || !password) { showErr('login-error', 'Please fill in all fields'); return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('login-error', 'Invalid email'); return }
  try {
    const data = await api('/auth/login', 'POST', { email, password })
    localStorage.setItem('token',    data.token)
    localStorage.setItem('username', data.user.username)
    document.getElementById('navbar').classList.remove('hidden')
    document.getElementById('dash-username').textContent = data.user.username
    // Profil var mı? Yoksa onboarding'e gönder
    try { await api('/calories/profile'); showView('dashboard') }
    catch { showView('onboarding') }
  } catch (err) { showErr('login-error', err.message) }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim()
  const email    = document.getElementById('reg-email').value.trim()
  const password = document.getElementById('reg-password').value
  if (!username || !email || !password) { showErr('register-error', 'Please fill in all fields'); return }
  if (username.length < 3) { showErr('register-error', 'Username min 3 chars'); return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('register-error', 'Invalid email'); return }
  if (password.length < 6) { showErr('register-error', 'Password min 6 chars'); return }
  try {
    const data = await api('/auth/register', 'POST', { username, email, password })
    localStorage.setItem('token',    data.token)
    localStorage.setItem('username', data.user.username)
    // Kayıt sonrası direkt onboarding'e yönlendir
    document.getElementById('navbar').classList.add('hidden')
    showView('onboarding')
  } catch (err) { showErr('register-error', err.message) }
}

function logout() {
  localStorage.clear()
  document.getElementById('navbar').classList.add('hidden')
  showView('auth')
}