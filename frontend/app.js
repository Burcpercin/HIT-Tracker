// ============================================
// KISIM 1: TEMEL YAPI
// ============================================

// API'nin adresi — tüm istekler buraya gidecek
const API_URL = 'http://localhost:3000/api'

// Kullanıcının seçimlerini tutacak obje
// Onboarding anketinde dolacak
const onboardingData = {
  gender: null,
  activity: null,
  goal: null
}

// AI Coach seçimlerini tutan obje
const aiData = {
  ai_exp: null,
  ai_eq: null
}

// Şu an kaçıncı onboarding adımındayız
let currentStep = 1
const TOTAL_STEPS = 5

// ============================================
// KISIM 2: API YARDIMCI FONKSİYONLARI
// ============================================

// Bu fonksiyon tüm API isteklerini yapıyor
// Her seferinde aynı kodu yazmamak için
async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token')

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Token varsa her isteğe ekle
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  // Body varsa JSON'a çevir ve ekle
  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${endpoint}`, options)
  const data = await response.json()

  // İstek başarısız olduysa hata fırlat
  if (!response.ok) {
    // Backend bazen errors[], bazen error: "" döndürüyor
    const message = data.errors
      ? data.errors.join(', ')
      : data.error || 'Something went wrong'
    throw new Error(message)
  }

  return data
}

// ============================================
// KISIM 3: VIEW YÖNETİMİ
// ============================================

// Hangi ekranın görüneceğini bu fonksiyon yönetiyor
// Sayfa yenilenmeden sadece ilgili div gösteriliyor
function showView(viewName) {
  // Tüm view'ları gizle
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'))

  // İstenen view'ı göster
  document.getElementById(`${viewName}-view`).classList.remove('hidden')

  // Navbar'daki aktif butonu güncelle
  document.querySelectorAll('.nav-links button').forEach(b => {
    b.classList.remove('active')
  })

  // İlgili nav butonunu aktif yap
  const navBtn = document.querySelector(`.nav-links button[onclick="showView('${viewName}')"]`)
  if (navBtn) navBtn.classList.add('active')

  // Her view açıldığında verilerini yükle
  if (viewName === 'dashboard') loadDashboard()
  if (viewName === 'exercises') loadExercises()
  if (viewName === 'sessions') loadSessions()
  if (viewName === 'programs') loadPrograms()
}

// Form'u açıp kapatmak için
function toggleForm(formId) {
  const form = document.getElementById(formId)
  form.classList.toggle('hidden')
}

// Hata mesajı göster
function showError(elementId, message) {
  const el = document.getElementById(elementId)
  el.textContent = message
  el.classList.remove('hidden')
  // 5 saniye sonra otomatik kaybol
  setTimeout(() => el.classList.add('hidden'), 5000)
}

// Hata mesajını temizle
function hideError(elementId) {
  document.getElementById(elementId).classList.add('hidden')
}

// ============================================
// KISIM 4: UYGULAMA BAŞLANGIÇ
// ============================================

// Sayfa yüklenince bu çalışır
// Kullanıcı giriş yapmış mı? Profil var mı? Kontrol eder
async function init() {
  const token = localStorage.getItem('token')

  // Token yoksa login sayfasına gönder
  if (!token) {
    showView('auth')
    return
  }

  try {
    // Profil var mı kontrol et
    const profileData = await apiRequest('/calories/profile')

    // Profil varsa navbar'ı göster ve dashboard'a git
    document.getElementById('navbar').classList.remove('hidden')

    // Kullanıcı adını localStorage'dan al
    const username = localStorage.getItem('username')
    if (username) {
      document.getElementById('dash-username').textContent = username
    }

    showView('dashboard')
  } catch (err) {
    if (err.message.includes('Profile not found')) {
      // Token var ama profil yok → onboarding'e gönder
      document.getElementById('navbar').classList.add('hidden')
      showView('onboarding')
    } else {
      // Token geçersiz → login'e gönder
      localStorage.clear()
      showView('auth')
    }
  }
}

// Sayfa hazır olunca init çalıştır
document.addEventListener('DOMContentLoaded', init)

// ============================================
// KISIM 5: AUTH — LOGIN / REGISTER
// ============================================

// Login ve Register formları arasında geçiş
function switchTab(tab) {
  const loginForm = document.getElementById('login-form')
  const registerForm = document.getElementById('register-form')
  const tabs = document.querySelectorAll('.tab-btn')

  // Önce hepsini gizle ve aktifliği kaldır
  tabs.forEach(t => t.classList.remove('active'))

  if (tab === 'login') {
    loginForm.classList.remove('hidden')
    registerForm.classList.add('hidden')
    tabs[0].classList.add('active')
  } else {
    loginForm.classList.add('hidden')
    registerForm.classList.remove('hidden')
    tabs[1].classList.add('active')
  }
}

async function login() {
  // Inputlardan değerleri al ve boşlukları temizle
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value

  // Frontend validasyon — backend'e gitmeden önce kontrol et
  if (!email || !password) {
    showError('login-error', 'Please fill in all fields')
    return
  }

  // Email formatı doğru mu?
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('login-error', 'Please enter a valid email')
    return
  }

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password })

    // Token ve kullanıcı bilgilerini kaydet
    // localStorage = tarayıcıda saklanan veri, sayfa kapanınca silinmez
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', data.user.username)
    localStorage.setItem('userId', data.user.id)

    // Navbar'ı göster
    document.getElementById('navbar').classList.remove('hidden')
    document.getElementById('dash-username').textContent = data.user.username

    // Profil var mı kontrol et
    try {
      await apiRequest('/calories/profile')
      showView('dashboard')
    } catch {
      // Profil yoksa onboarding'e gönder
      showView('onboarding')
    }

  } catch (err) {
    showError('login-error', err.message)
  }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim()
  const email = document.getElementById('reg-email').value.trim()
  const password = document.getElementById('reg-password').value

  // Frontend validasyon
  if (!username || !email || !password) {
    showError('register-error', 'Please fill in all fields')
    return
  }

  if (username.length < 3) {
    showError('register-error', 'Username must be at least 3 characters')
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('register-error', 'Please enter a valid email')
    return
  }

  if (password.length < 6) {
    showError('register-error', 'Password must be at least 6 characters')
    return
  }

  try {
    const data = await apiRequest('/auth/register', 'POST', {
      username, email, password
    })

    // Kayıt başarılı → direkt giriş yap
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', data.user.username)
    localStorage.setItem('userId', data.user.id)

    document.getElementById('navbar').classList.add('hidden')
    showView('onboarding')

  } catch (err) {
    showError('register-error', err.message)
  }
}

function logout() {
  // localStorage'ı temizle
  localStorage.clear()
  // Navbar'ı gizle
  document.getElementById('navbar').classList.add('hidden')
  // Login sayfasına gönder
  showView('auth')
}