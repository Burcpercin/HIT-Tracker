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

// ============================================
// KISIM 6: ONBOARDING — PROFİL ANKETİ
// ============================================

// Kart veya buton seçimi için genel fonksiyon
// group = hangi gruba ait (gender, activity, goal...)
// value = seçilen değer
// element = tıklanan HTML elementi
function selectChoice(group, value, element) {
  // Aynı gruptaki tüm seçimlerin aktifliğini kaldır
  const parent = element.parentElement
  parent.querySelectorAll('.choice-btn, .activity-card, .goal-card')
    .forEach(el => el.classList.remove('selected'))

  // Tıklananı seç
  element.classList.add('selected')

  // Hangi objeye kaydedileceğine karar ver
  if (group in onboardingData) {
    onboardingData[group] = value
  } else if (group in aiData) {
    aiData[group] = value
  }
}

// İleri butonu
async function obNext() {
  // Önce mevcut adımı validate et
  const error = validateStep(currentStep)
  if (error) {
    showError('onboarding-error', error)
    return
  }

  hideError('onboarding-error')

  // Son adımdan önce özet ekranını hazırla
  if (currentStep === 4) {
    buildSummaryStep()
  }

  // Mevcut adımı gizle
  document.getElementById(`step-${currentStep}`).classList.add('hidden')
  currentStep++

  // Yeni adımı göster
  document.getElementById(`step-${currentStep}`).classList.remove('hidden')

  // Progress bar'ı güncelle
  updateProgress()

  // Son adımdaysak butonları değiştir
  if (currentStep === TOTAL_STEPS) {
    document.getElementById('ob-next').classList.add('hidden')
    document.getElementById('ob-finish').classList.remove('hidden')
  }

  // Geri butonu — ilk adımda gizli
  document.getElementById('ob-back').classList.remove('hidden')
}

// Geri butonu
function obBack() {
  hideError('onboarding-error')

  document.getElementById(`step-${currentStep}`).classList.add('hidden')
  currentStep--
  document.getElementById(`step-${currentStep}`).classList.remove('hidden')

  updateProgress()

  // Son adım değilsek next'i geri getir
  document.getElementById('ob-next').classList.remove('hidden')
  document.getElementById('ob-finish').classList.add('hidden')

  // İlk adımdaysak geri butonu gizle
  if (currentStep === 1) {
    document.getElementById('ob-back').classList.add('hidden')
  }
}

// Progress bar'ı güncelle
function updateProgress() {
  const percent = (currentStep / TOTAL_STEPS) * 100
  document.getElementById('progress-fill').style.width = `${percent}%`
  document.getElementById('step-current').textContent = currentStep
}

// Her adım için validasyon
function validateStep(step) {
  if (step === 1) {
    const birthdate = document.getElementById('ob-birthdate').value
    if (!birthdate) return 'Please enter your date of birth'

    // Yaş kontrolü — backend ile aynı kurallar
    const birth = new Date(birthdate)
    const today = new Date()

    if (birth > today) return 'Birth date cannot be in the future'
    if (birth.getFullYear() < 1900) return 'Please enter a valid birth date'

    let age = today.getFullYear() - birth.getFullYear()
    const hasHadBirthday =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() >= birth.getDate())
    if (!hasHadBirthday) age--

    if (age < 13) return 'You must be at least 13 years old'
    if (age > 100) return 'Please enter a valid birth date'

    if (!onboardingData.gender) return 'Please select your gender'
  }

  if (step === 2) {
    const height = document.getElementById('ob-height').value
    const weight = document.getElementById('ob-weight').value

    if (!height) return 'Please enter your height'
    if (!weight) return 'Please enter your weight'
    if (height < 100 || height > 250) return 'Height must be between 100-250 cm'
    if (weight < 30 || weight > 300) return 'Weight must be between 30-300 kg'
  }

  if (step === 3) {
    if (!onboardingData.activity) return 'Please select your activity level'
  }

  if (step === 4) {
    if (!onboardingData.goal) return 'Please select your goal'
  }

  return null // hata yok
}

// Step 5: Özet ekranını hazırla
function buildSummaryStep() {
  const birthdate = document.getElementById('ob-birthdate').value
  const height = document.getElementById('ob-height').value
  const weight = document.getElementById('ob-weight').value

  // Yaşı hesapla
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate())
  if (!hasHadBirthday) age--

  // Aktivite seviyesi → okunabilir metin
  const activityLabels = {
    sedentary: '🪑 Sedentary',
    light: '🚶 Light',
    moderate: '🏃 Moderate',
    active: '💪 Active',
    very_active: '🔥 Very Active'
  }

  const goalLabels = {
    muscle_gain: '💪 Build Muscle',
    fat_loss: '🔥 Burn Fat',
    strength: '🏋️ Get Stronger',
    endurance: '🏅 Endurance'
  }

  // Özet HTML'ini oluştur
  document.getElementById('profile-summary').innerHTML = `
    <div class="summary-item">
      <label>Age</label>
      <span>${age} years old</span>
    </div>
    <div class="summary-item">
      <label>Gender</label>
      <span>${onboardingData.gender}</span>
    </div>
    <div class="summary-item">
      <label>Height</label>
      <span>${height} cm</span>
    </div>
    <div class="summary-item">
      <label>Weight</label>
      <span>${weight} kg</span>
    </div>
    <div class="summary-item">
      <label>Activity</label>
      <span>${activityLabels[onboardingData.activity]}</span>
    </div>
    <div class="summary-item">
      <label>Goal</label>
      <span>${goalLabels[onboardingData.goal]}</span>
    </div>
  `

  // Tahmini kaloriyi hesapla (gösterim amaçlı)
  // Basit BMR tahmini — gerçek hesap backend'de yapılıyor
  const activityMultipliers = {
    sedentary: 1.20, light: 1.375, moderate: 1.55,
    active: 1.725, very_active: 1.90
  }
  const goalAdjustments = {
    muscle_gain: 400, fat_loss: -500, strength: 0, endurance: 0
  }

  const base = (10 * weight) + (6.25 * height) - (5 * age) +
    (onboardingData.gender === 'male' ? 5 : -161)
  const tdee = Math.round(base * activityMultipliers[onboardingData.activity])
  const target = tdee + goalAdjustments[onboardingData.goal]

  document.getElementById('calorie-preview').innerHTML = `
    <p>Estimated Daily Calories</p>
    <div class="big-number">${target}</div>
    <p>kcal / day for <strong>${goalLabels[onboardingData.goal]}</strong></p>
  `
}

// Bitir butonu — profili kaydet
async function obFinish() {
  try {
    document.getElementById('ob-finish').textContent = 'Saving...'
    document.getElementById('ob-finish').disabled = true

    await apiRequest('/calories/profile', 'POST', {
      birth_date: document.getElementById('ob-birthdate').value,
      weight_kg: parseFloat(document.getElementById('ob-weight').value),
      height_cm: parseFloat(document.getElementById('ob-height').value),
      gender: onboardingData.gender,
      activity_level: onboardingData.activity
    })

    // Navbar'ı göster
    document.getElementById('navbar').classList.remove('hidden')
    const username = localStorage.getItem('username')
    document.getElementById('dash-username').textContent = username

    // Dashboard'a git
    showView('dashboard')

  } catch (err) {
    document.getElementById('ob-finish').textContent = 'Start Training! 💪'
    document.getElementById('ob-finish').disabled = false
    showError('onboarding-error', err.message)
  }
}