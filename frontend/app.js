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
// ============================================
// KISIM 3: VIEW YÖNETİMİ
// ============================================

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
  if (viewName === 'training') loadTraining()
  if (viewName === 'sessions') loadSessionHistory()
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
    sedentary: '<i class="fa-solid fa-chair"></i> Sedentary',
    light: '<i class="fa-solid fa-person-walking"></i> Light',
    moderate: '<i class="fa-solid fa-person-running"></i> Moderate',
    active: '<i class="fa-solid fa-dumbbell"></i> Active',
    very_active: '<i class="fa-solid fa-fire"></i> Very Active'
  }

  const goalLabels = {
    muscle_gain: '<i class="fa-solid fa-dumbbell"></i> Build Muscle',
    fat_loss: '<i class="fa-solid fa-fire"></i> Burn Fat',
    strength: '<i class="fa-solid fa-weight-hanging"></i> Get Stronger',
    endurance: '<i class="fa-solid fa-heart-pulse"></i> Endurance'
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
    document.getElementById('ob-finish').innerHTML = '<i class="fa-solid fa-dumbbell"></i> Start Training!'
    document.getElementById('ob-finish').disabled = false
    showError('onboarding-error', err.message)
  }
}

// ============================================
// KISIM 7: DASHBOARD
// ============================================

async function loadDashboard() {
  // Aynı anda birden fazla isteği paralel at
  // Promise.allSettled → biri hata verse bile diğerleri çalışır
  const [quoteRes, sessionsRes, exercisesRes, programsRes, profileRes] =
    await Promise.allSettled([
      apiRequest('/quotes/random'),
      apiRequest('/sessions'),
      apiRequest('/exercises'),
      apiRequest('/programs'),
      apiRequest('/calories/profile?goal=muscle_gain')
    ])

  // Motivasyon sözü
  if (quoteRes.status === 'fulfilled') {
    const q = quoteRes.value
    document.getElementById('daily-quote').innerHTML = `
      <em>"${q.quote}"</em>
      <strong> — ${q.author}</strong>
    `
  }

  // İstatistikler
  if (sessionsRes.status === 'fulfilled') {
    document.getElementById('stat-sessions').textContent =
      sessionsRes.value.length

    // Son 3 seansı göster
    renderRecentSessions(sessionsRes.value.slice(0, 3))
  }

  if (exercisesRes.status === 'fulfilled') {
    document.getElementById('stat-exercises').textContent =
      exercisesRes.value.length
  }

  if (programsRes.status === 'fulfilled') {
    const programs = programsRes.value
    document.getElementById('stat-programs').textContent = programs.length

    // Aktif programı göster
    const active = programs.find(p => p.is_active)
    renderActiveProgram(active)
  }

  // Kalori hedefi
  if (profileRes.status === 'fulfilled') {
    const calories = profileRes.value.report?.target_calories
    if (calories) {
      document.getElementById('stat-calories').textContent = calories
    }
  }
}

function renderRecentSessions(sessions) {
  const container = document.getElementById('recent-sessions')

  if (!sessions || sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon"><i class="fa-solid fa-dumbbell"></i></span>
        <p>No sessions yet. Start training!</p>
      </div>
    `
    return
  }

  container.innerHTML = sessions.map(s => `
    <div class="list-card" style="margin-bottom: 8px">
      <div class="list-card-info">
        <h4>${formatDate(s.session_date)}</h4>
        <p>
          ${s.exercise_count || 0} exercises
          ${s.duration_minutes ? `· ${s.duration_minutes} min` : ''}
        </p>
      </div>
    </div>
  `).join('')
}

function renderActiveProgram(program) {
  const container = document.getElementById('active-program')

  if (!program) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon"><i class="fa-solid fa-clipboard-list"></i></span>
        <p>No active program. Create one!</p>
      </div>
    `
    return
  }

  const goalLabels = {
    muscle_gain: '<i class="fa-solid fa-dumbbell"></i> Build Muscle',
    fat_loss: '<i class="fa-solid fa-fire"></i> Burn Fat',
    strength: '<i class="fa-solid fa-weight-hanging"></i> Strength',
    endurance: '<i class="fa-solid fa-heart-pulse"></i> Endurance'
  }

  container.innerHTML = `
    <div class="list-card">
      <div class="list-card-info">
        <h4>${program.name}</h4>
        <p>
          ${goalLabels[program.goal] || program.goal} · 
          ${program.days_per_week} days/week ·
          ${program.exercise_count || 0} exercises
        </p>
      </div>
      <span class="badge badge-active">Active</span>
    </div>
  `
}

// Tarihi okunabilir formata çevir
// "2026-05-15" → "May 15, 2026"
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// ============================================
// KISIM 8: EXERCISES (YENİ ARAYÜZ + CRUD İŞLEMLERİ)
// ============================================

let allExercises = []
let currentFilter = 'all'

async function loadExercises() {
  const container = document.getElementById('exercise-list')
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading exercises...</p></div>'

  try {
    allExercises = await apiRequest('/exercises')
    applyFilters() // Ekrana çizerken mevcut filtreyi korur
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`
  }
}

function filterExercises(filter, btn) {
  currentFilter = filter

  // Aktif butonu güncelle
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')

  applyFilters()
}

// Arama — her harf girişinde çalışır
function searchExercises() {
  applyFilters()
}

// Hem filtre hem aramayı birlikte uygula
function applyFilters() {
  const query = document.getElementById('exercise-search').value.toLowerCase().trim()

  let filtered = allExercises

  // Kas grubu filtresi
  if (currentFilter === 'custom') {
    filtered = filtered.filter(ex => ex.is_custom)
  } else if (currentFilter !== 'all') {
    filtered = filtered.filter(ex => ex.muscle_group === currentFilter)
  }

  // Arama filtresi
  if (query) {
    filtered = filtered.filter(ex =>
      ex.name.toLowerCase().includes(query) ||
      ex.muscle_group.toLowerCase().includes(query)
    )
  }

  renderExercises(filtered)
}

function renderExercises(exercises) {
  const container = document.getElementById('exercise-list')
  
  if (exercises.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <span class="empty-icon"><i class="fa-solid fa-dumbbell"></i></span>
        <p>No exercises found.</p>
      </div>
    `
    return
  }
  
  container.innerHTML = exercises.map(ex => `
    <div class="exercise-card ${ex.is_custom ? 'custom-exercise' : ''}"
         onclick="openExerciseModal(${ex.id})">
      ${ex.image_url ? `
        <div class="card-img-wrap">
          <img class="img-start" src="${ex.image_url}"
                alt="${ex.name}" loading="lazy">
          ${ex.image_url_2
            ? `<img class="img-end" src="${ex.image_url_2}"
                     alt="${ex.name}" loading="lazy">`
            : `<img class="img-end" src="${ex.image_url}"
                     alt="${ex.name}" loading="lazy">`
          }
        </div>
      ` : `
        <div class="no-image"><i class="fa-solid fa-dumbbell"></i></div>
      `}
      <div class="exercise-card-info">
        <h4>${ex.name}</h4>
        <p>
          <span class="badge badge-gold">${ex.muscle_group}</span>
          ${ex.is_custom
            ? '<span class="badge badge-green">Custom</span>'
            : ''
          }
        </p>
      </div>
    </div>
  `).join('')
}

function openExerciseModal(id) {
  const ex = allExercises.find(e => e.id === id)
  if (!ex) return

  // Mentzer'e özgü ipuçları — kas grubuna göre
  const mentzerTips = {
    'Chest': 'One set to failure on bench press produces more growth than 10 half-hearted sets.',
    'Back': 'The back responds incredibly well to HIT. One all-out set of rows or pulldowns is all you need.',
    'Shoulders': 'Overhead pressing to failure — brief, intense, infrequent. That is the Mentzer way.',
    'Biceps': 'Curls taken to absolute failure — your biceps will have no choice but to grow.',
    'Triceps': 'The tricep makes up 2/3 of your arm. One set to failure is your ticket to growth.',
    'Quadriceps': 'Squats to failure are brutally hard. That is exactly why they work.',
    'Hamstrings': 'Romanian deadlifts to failure — feel every fiber working.',
    'Glutes': 'Hip thrusts taken to failure will build the most powerful muscles in your body.',
    'Abs': 'The abs are like any other muscle — brief, intense work and adequate rest.',
    'Calves': 'Calves are stubborn. Take them to absolute failure — no mercy.',
    'Traps': 'Heavy shrugs to failure. Simple, brutal, effective.',
    'Back': 'One intense set of deadlifts is worth more than an hour of half-effort work.'
  }
  
  const tip = mentzerTips[ex.muscle_group] || 'Train with maximum intensity. One set to failure. Then rest and grow.'
  
  // Resim alanı
  let heroHtml = ''
  if (ex.image_url && ex.image_url_2) {
    heroHtml = `
      <div class="modal-hero">
        <img src="${ex.image_url}" alt="Start position">
        <img src="${ex.image_url_2}" alt="End position">
      </div>
    `
  } else if (ex.image_url) {
    heroHtml = `
      <div class="modal-hero-single">
        <img src="${ex.image_url}" alt="${ex.name}">
      </div>
    `
  } else {
    heroHtml = `<div class="modal-hero-placeholder"><i class="fa-solid fa-dumbbell"></i></div>`
  }
  
  // Secondary muscles
  const secondaryHtml = ex.secondary_muscles?.length > 0
    ? ex.secondary_muscles.map(m =>
        `<span class="muscle-secondary">${m}</span>`
      ).join('')
    : ''
    
  // Instructions
  const instructionsHtml = ex.instructions?.length > 0
    ? `<div class="modal-section">
        <h4>How to perform</h4>
        <ol class="instructions-list">
          ${ex.instructions.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>`
    : ''
    
  document.getElementById('modal-body').innerHTML = `
    ${heroHtml}
    <div class="modal-body-content">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
        <h2 class="modal-title">${ex.name}</h2>
        <button class="modal-close" onclick="closeModal()"
           style="position:static; margin-left:12px"><i class="fa-solid fa-xmark"></i></button>
      </div>
      
      <div class="modal-muscle-bar">
        <span class="muscle-primary"><i class="fa-solid fa-bullseye"></i> ${ex.muscle_group}</span>
        ${secondaryHtml}
      </div>
      
      <div class="modal-stats">
        <div class="modal-stat">
          <label>Equipment</label>
          <span>${ex.equipment || 'Bodyweight'}</span>
        </div>
        <div class="modal-stat">
          <label>Level</label>
          <span>${ex.level || 'All levels'}</span>
        </div>
        <div class="modal-stat">
          <label>Rest Days</label>
          <span>${ex.required_rest_days} days</span>
        </div>
      </div>
      
      <div class="mentzer-tip">
        <i class="fa-solid fa-bolt"></i> <strong>Mentzer says:</strong> "${tip}"
      </div>
      
      ${instructionsHtml}
      
      ${ex.is_custom ? `
        <div style="display:flex; gap:12px; margin-top:20px;
           padding-top:20px; border-top: 1px solid var(--border)">
          <button class="btn-secondary"
             onclick="editExercise(${ex.id}); closeModal()">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="btn-danger"
             onclick="deleteExercise(${ex.id}, '${ex.name}'); closeModal()">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      ` : ''}
    </div>
  `
  document.getElementById('exercise-modal').classList.remove('hidden')
}

function closeModal() {
  document.getElementById('exercise-modal').classList.add('hidden')
}

// ESC tuşu ile modal kapat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal()
})

async function createExercise() {
  const name = document.getElementById('ex-name').value.trim()
  const muscle_group = document.getElementById('ex-muscle').value.trim()
  const description = document.getElementById('ex-desc').value.trim()
  const required_rest_days = parseInt(document.getElementById('ex-rest').value)

  // Frontend validasyon
  if (!name || name.length < 2) {
    showError('exercise-form-error', 'Name must be at least 2 characters')
    return
  }
  if (!muscle_group) {
    showError('exercise-form-error', 'Muscle group is required')
    return
  }
  if (!required_rest_days || required_rest_days < 3) {
    showError('exercise-form-error', 'Rest days must be at least 3 (Mentzer rule!)')
    return
  }
  if (required_rest_days > 14) {
    showError('exercise-form-error', 'Rest days cannot exceed 14')
    return
  }

  try {
    await apiRequest('/exercises', 'POST', {
      name, muscle_group, description, required_rest_days
    })

    // Formu temizle ve kapat
    clearExerciseForm()
    toggleForm('exercise-form')

    // Listeyi yenile
    await loadExercises()

  } catch (err) {
    showError('exercise-form-error', err.message)
  }
}

// Düzenleme moduna geç
function editExercise(id) {
  const ex = allExercises.find(e => e.id === id)
  if (!ex) return

  // Formu aç ve doldur
  document.getElementById('exercise-form').classList.remove('hidden')
  document.getElementById('ex-name').value = ex.name
  document.getElementById('ex-muscle').value = ex.muscle_group
  document.getElementById('ex-desc').value = ex.description || ''
  document.getElementById('ex-rest').value = ex.required_rest_days

  // Başlığı değiştir
  document.querySelector('#exercise-form h3').textContent = 'Edit Custom Exercise'

  // Save butonunu güncelleme moduna al
  const saveBtn = document.querySelector('#exercise-form .btn-primary')
  saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update'
  saveBtn.setAttribute('onclick', `updateExercise(${id})`)

  // Sayfayı forma kaydır
  document.getElementById('exercise-form').scrollIntoView({ behavior: 'smooth' })
}

async function updateExercise(id) {
  const name = document.getElementById('ex-name').value.trim()
  const muscle_group = document.getElementById('ex-muscle').value.trim()
  const description = document.getElementById('ex-desc').value.trim()
  const required_rest_days = parseInt(document.getElementById('ex-rest').value)

  // Frontend validasyon
  if (!name || name.length < 2) {
    showError('exercise-form-error', 'Name must be at least 2 characters')
    return
  }
  if (!muscle_group) {
    showError('exercise-form-error', 'Muscle group is required')
    return
  }
  if (required_rest_days < 3 || required_rest_days > 14) {
    showError('exercise-form-error', 'Rest days must be between 3-14')
    return
  }

  try {
    await apiRequest(`/exercises/${id}`, 'PUT', {
      name, muscle_group, description, required_rest_days
    })

    // Formu sıfırla
    clearExerciseForm()
    toggleForm('exercise-form')
    await loadExercises()

  } catch (err) {
    showError('exercise-form-error', err.message)
  }
}

async function deleteExercise(id, name) {
  // Silmeden önce onay al (alert/confirm içinde HTML ikon çalışmaz, bu yüzden düz metin kullanıyoruz)
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return

  try {
    await apiRequest(`/exercises/${id}`, 'DELETE')
    await loadExercises()
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

// Formu sıfırla — create moduna geri dön
function clearExerciseForm() {
  document.getElementById('ex-name').value = ''
  document.getElementById('ex-muscle').value = ''
  document.getElementById('ex-desc').value = ''
  document.getElementById('ex-rest').value = '5'
  document.querySelector('#exercise-form h3').textContent = 'Add Custom Exercise'
  const saveBtn = document.querySelector('#exercise-form .btn-primary')
  saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'
  saveBtn.setAttribute('onclick', 'createExercise()')
  hideError('exercise-form-error')
}
// ============================================
// TRAINING — Programs + Workout + Calendar
// ============================================

let allPrograms = []
let allSessions = []
let activeSessionId = null
let currentWorkoutExercises = []
let failureState = {}
let manualFailure = false
let calendarDate = new Date()

async function loadTraining() {
  await loadPrograms()
}

async function loadSessionHistory() {
  const container = document.getElementById('session-list')
  if (!container) return
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  try {
    const sessions = await apiRequest('/sessions')
    if (!sessions.length) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>No sessions yet.</p></div>'
      return
    }
    container.innerHTML = sessions.map(s => `
      <div class="list-card" style="margin-bottom:8px">
        <div class="list-card-info">
          <h4>${formatDate(s.session_date)}</h4>
          <p>${s.exercise_count || 0} exercises${s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}</p>
        </div>
      </div>
    `).join('')
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`
  }
}


function switchTrainingTab(tab) {
  document.querySelectorAll('.training-tab-content').forEach(t => {
    t.classList.add('hidden')
  })
  document.querySelectorAll('.training-tab').forEach(t => {
    t.classList.remove('active')
  })

  document.getElementById(`tab-${tab}`).classList.remove('hidden')
  event.target.closest('.training-tab').classList.add('active')

  if (tab === 'programs') loadPrograms()
  if (tab === 'workout') loadWorkoutTab()
  if (tab === 'calendar') loadCalendar()
}

// ============================================
// PROGRAMS
// ============================================

async function loadPrograms() {
  const container = document.getElementById('program-list')
  if (!container) return
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  try {
    allPrograms = await apiRequest('/programs')
    renderPrograms(allPrograms)
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`
  }
}

function renderPrograms(programs) {
  const container = document.getElementById('program-list')
  if (!container) return

  if (programs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>No programs yet. Create your first HIT program!</p>
      </div>
    `
    return
  }

  const goalLabels = {
    muscle_gain: '💪 Muscle', fat_loss: '🔥 Fat Loss',
    strength: '🏋️ Strength', endurance: '🏅 Endurance'
  }

  container.innerHTML = programs.map(p => `
    <div class="program-card ${p.is_active ? 'is-active' : ''}">
      <div class="program-card-header">
        <div>
          <h3 style="margin-bottom:4px">
            ${p.name}
            ${p.is_active
              ? '<span class="badge badge-active" style="margin-left:8px">Active</span>'
              : ''}
          </h3>
          <p style="color:var(--text-dim); font-size:0.85rem">
            ${goalLabels[p.goal] || ''} · 
            ${p.days_per_week} days/week · 
            ${p.exercise_count || 0} exercises
          </p>
        </div>
        <div style="display:flex; gap:8px">
          ${!p.is_active
            ? `<button class="btn-secondary"
                onclick="activateProgram(${p.id})"
                style="font-size:0.82rem; padding:6px 12px">
                Set Active
              </button>`
            : ''}
          <button class="btn-icon edit"
            onclick="toggleProgramDetail(${p.id})"
            title="Edit">📝</button>
          <button class="btn-icon"
            onclick="deleteProgram(${p.id}, '${p.name}')"
            title="Delete">🗑️</button>
        </div>
      </div>

      <div id="prog-detail-${p.id}" class="hidden">
        <div class="program-card-body">
          <h4 style="margin-bottom:12px; color:var(--accent)">Add Exercise</h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <div class="form-group">
              <label>Exercise</label>
              <select id="padd-ex-${p.id}"></select>
            </div>
            <div class="form-group">
              <label>Day</label>
              <select id="padd-day-${p.id}">
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="7">Sunday</option>
              </select>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <div class="form-group">
              <label>Sets</label>
              <input type="number" id="padd-sets-${p.id}" value="1" min="1" max="10">
            </div>
            <div class="form-group">
              <label>Target Reps</label>
              <input type="number" id="padd-reps-${p.id}" placeholder="8" min="1">
            </div>
          </div>
          <div id="padd-error-${p.id}" class="error-msg hidden"></div>
          <button class="btn-primary" onclick="addExerciseToProgram(${p.id})">
            Add Exercise
          </button>
          <div id="padd-list-${p.id}" style="margin-top:20px"></div>
        </div>
      </div>
    </div>
  `).join('')
}

async function toggleProgramDetail(programId) {
  const detail = document.getElementById(`prog-detail-${programId}`)
  const isHidden = detail.classList.contains('hidden')

  document.querySelectorAll('[id^="prog-detail-"]').forEach(d => {
    d.classList.add('hidden')
  })

  if (isHidden) {
    detail.classList.remove('hidden')
    fillExerciseDropdown(`padd-ex-${programId}`)
    await loadProgramExerciseList(programId)
  }
}

async function loadProgramExerciseList(programId) {
  const container = document.getElementById(`padd-list-${programId}`)
  try {
    const program = await apiRequest(`/programs/${programId}`)

    if (!program.exercises?.length) {
      container.innerHTML = `
        <p style="color:var(--text-dim); font-size:0.9rem">
          No exercises yet. Add some above!
        </p>
      `
      return
    }

    const dayNames = {
      1:'Monday', 2:'Tuesday', 3:'Wednesday',
      4:'Thursday', 5:'Friday', 6:'Saturday', 7:'Sunday'
    }

    const byDay = {}
    program.exercises.forEach(ex => {
      if (!byDay[ex.day_of_week]) byDay[ex.day_of_week] = []
      byDay[ex.day_of_week].push(ex)
    })

    container.innerHTML = Object.keys(byDay).sort().map(day => `
      <div class="day-column">
        <h4>${dayNames[day]}</h4>
        ${byDay[day].map(ex => `
          <div class="day-exercise-item">
            <div>
              <strong>${ex.exercise_name}</strong>
              <span style="color:var(--text-dim); font-size:0.82rem; margin-left:8px">
                ${ex.sets} set · ${ex.target_reps} reps
              </span>
            </div>
            <button class="btn-icon"
              onclick="removeExerciseFromProgram(${programId}, ${ex.id})"
              title="Remove">🗑️</button>
          </div>
        `).join('')}
      </div>
    `).join('')
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`
  }
}

async function createProgram() {
  const name = document.getElementById('prog-name').value.trim()
  const goal = document.getElementById('prog-goal').value
  const days_per_week = parseInt(document.getElementById('prog-days').value)
  const description = document.getElementById('prog-desc').value.trim()

  if (!name || name.length < 3) {
    showError('program-form-error', 'Name must be at least 3 characters')
    return
  }
  if (!days_per_week || days_per_week < 1 || days_per_week > 7) {
    showError('program-form-error', 'Days per week must be 1-7')
    return
  }

  try {
    await apiRequest('/programs', 'POST', {
      name, goal, days_per_week,
      description: description || null
    })

    document.getElementById('prog-name').value = ''
    document.getElementById('prog-days').value = '3'
    document.getElementById('prog-desc').value = ''
    toggleForm('program-form')
    await loadPrograms()
  } catch (err) {
    showError('program-form-error', err.message)
  }
}

async function activateProgram(id) {
  try {
    await apiRequest(`/programs/${id}/activate`, 'PATCH')
    await loadPrograms()
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

async function addExerciseToProgram(programId) {
  const exerciseId = document.getElementById(`padd-ex-${programId}`).value
  const day_of_week = parseInt(document.getElementById(`padd-day-${programId}`).value)
  const sets = parseInt(document.getElementById(`padd-sets-${programId}`).value)
  const target_reps = parseInt(document.getElementById(`padd-reps-${programId}`).value)

  if (!exerciseId) {
    showError(`padd-error-${programId}`, 'Please select an exercise')
    return
  }
  if (!target_reps || target_reps < 1) {
    showError(`padd-error-${programId}`, 'Please enter target reps')
    return
  }

  try {
    await apiRequest(`/programs/${programId}/exercises`, 'POST', {
      exercise_id: parseInt(exerciseId),
      day_of_week, sets, target_reps
    })

    document.getElementById(`padd-reps-${programId}`).value = ''
    hideError(`padd-error-${programId}`)
    await loadProgramExerciseList(programId)
  } catch (err) {
    showError(`padd-error-${programId}`, err.message)
  }
}

async function removeExerciseFromProgram(programId, entryId) {
  if (!confirm('Remove this exercise?')) return
  try {
    await apiRequest(`/programs/${programId}/exercises/${entryId}`, 'DELETE')
    await loadProgramExerciseList(programId)
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

async function deleteProgram(id, name) {
  if (!confirm(`Delete "${name}"?`)) return
  try {
    await apiRequest(`/programs/${id}`, 'DELETE')
    await loadPrograms()
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

// ============================================
// WORKOUT
// ============================================

async function loadWorkoutTab() {
  const container = document.getElementById('workout-program-cards')

  if (activeSessionId) {
    document.getElementById('workout-select-program').classList.add('hidden')
    document.getElementById('active-workout').classList.remove('hidden')
    return
  }

  document.getElementById('workout-select-program').classList.remove('hidden')
  document.getElementById('active-workout').classList.add('hidden')

  try {
    const programs = await apiRequest('/programs')

    if (programs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📋</span>
          <p>No programs yet.</p>
          <button class="btn-primary" style="margin-top:16px"
            onclick="switchTrainingTab('programs')">
            Create Program
          </button>
        </div>
      `
      return
    }

    const goalLabels = {
      muscle_gain: '💪 Muscle', fat_loss: '🔥 Fat Loss',
      strength: '🏋️ Strength', endurance: '🏅 Endurance'
    }

    container.innerHTML = programs.map(p => `
      <div class="workout-program-card ${p.is_active ? 'active-prog' : ''}"
        onclick="startWorkout(${p.id})">
        <div>
          <h3 style="margin-bottom:4px">
            ${p.name}
            ${p.is_active
              ? '<span class="badge badge-active" style="margin-left:8px">Active</span>'
              : ''}
          </h3>
          <p style="color:var(--text-dim); font-size:0.85rem">
            ${goalLabels[p.goal] || ''} · 
            ${p.days_per_week} days/week · 
            ${p.exercise_count || 0} exercises
          </p>
        </div>
        <span style="font-size:1.5rem; color:var(--accent)">▶</span>
      </div>
    `).join('')
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`
  }
}

async function startWorkout(programId) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const session = await apiRequest('/sessions', 'POST', {
      session_date: today
    })
    activeSessionId = session.id

    const program = await apiRequest(`/programs/${programId}`)

    document.getElementById('workout-select-program').classList.add('hidden')
    document.getElementById('active-workout').classList.remove('hidden')
    document.getElementById('workout-title').textContent = `💪 ${program.name}`
    document.getElementById('workout-subtitle').textContent =
      new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      })

    currentWorkoutExercises = program.exercises || []
    failureState = {}
    renderWorkoutExercises(currentWorkoutExercises)
    fillExerciseDropdown('manual-ex-select')

  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

function renderWorkoutExercises(exercises) {
  const container = document.getElementById('workout-exercises')

  if (!exercises?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No exercises in this program yet!</p>
        <button class="btn-secondary" style="margin-top:12px"
          onclick="switchTrainingTab('programs')">
          Add Exercises
        </button>
      </div>
    `
    return
  }

  container.innerHTML = exercises.map((ex, i) => `
    <div class="workout-ex-item">
      <h4>${ex.exercise_name}</h4>
      <p class="workout-ex-meta">
        <span class="badge badge-gold">${ex.muscle_group}</span>
        · ${ex.sets} set · ${ex.target_reps} target reps
      </p>
      <div class="workout-ex-inputs">
        <div class="form-group">
          <label>Weight (kg)</label>
          <input type="number" id="w-kg-${i}"
            placeholder="0" step="0.5" min="0"
            oninput="checkProgressiveOverload(${i})">
        </div>
        <div class="form-group">
          <label>Reps</label>
          <input type="number" id="w-rep-${i}"
            placeholder="${ex.target_reps}" min="1">
        </div>
        <div class="form-group">
          <label>Failure?</label>
          <div class="failure-toggle">
            <button class="failure-btn" id="fy-${i}"
              onclick="setFailure(${i}, true)">✅</button>
            <button class="failure-btn" id="fn-${i}"
              onclick="setFailure(${i}, false)">❌</button>
          </div>
        </div>
      </div>
      <div id="overload-${i}" class="hidden overload-msg"></div>
    </div>
  `).join('')

  exercises.forEach((ex, i) => fetchPrevPerformance(i, ex.exercise_id))
}

async function fetchPrevPerformance(index, exerciseId) {
  try {
    const sessions = await apiRequest('/sessions')
    for (const s of sessions) {
      if (s.id === activeSessionId) continue
      const detail = await apiRequest(`/sessions/${s.id}`)
      const prev = detail.exercises?.find(e => e.exercise_id === exerciseId)
      if (prev) {
        const input = document.getElementById(`w-kg-${index}`)
        if (input && !input.value) {
          input.value = prev.weight_kg
          input.setAttribute('data-prev', prev.weight_kg)
        }
        return
      }
    }
  } catch {}
}

function setFailure(index, value) {
  failureState[index] = value
  document.getElementById(`fy-${index}`)
    .classList.toggle('yes-active', value)
  document.getElementById(`fn-${index}`)
    .classList.toggle('no-active', !value)
}

function checkProgressiveOverload(index) {
  const input = document.getElementById(`w-kg-${index}`)
  const prev = parseFloat(input.getAttribute('data-prev'))
  const curr = parseFloat(input.value)
  const msg = document.getElementById(`overload-${index}`)

  if (isNaN(prev) || isNaN(curr)) return

  if (curr > prev) {
    msg.className = 'overload-msg overload-up'
    msg.textContent = `⚡ +${(curr-prev).toFixed(1)}kg — Progressive overload!`
    msg.classList.remove('hidden')
  } else if (curr < prev) {
    msg.className = 'overload-msg overload-down'
    msg.textContent = `⚠️ Decreased from ${prev}kg — Push harder!`
    msg.classList.remove('hidden')
  } else {
    msg.classList.add('hidden')
  }
}

function setManualFailure(value, btn) {
  manualFailure = value
  document.querySelectorAll('#manual-ex-form .failure-btn')
    .forEach(b => b.classList.remove('yes-active', 'no-active'))
  btn.classList.add(value ? 'yes-active' : 'no-active')
}

async function addManualExercise() {
  const exerciseId = document.getElementById('manual-ex-select').value
  const weight = parseFloat(document.getElementById('manual-weight').value)
  const reps = parseInt(document.getElementById('manual-reps').value)

  if (!exerciseId) {
    showError('manual-ex-error', 'Please select an exercise'); return
  }
  if (!weight || weight <= 0) {
    showError('manual-ex-error', 'Please enter valid weight'); return
  }
  if (!reps || reps < 1) {
    showError('manual-ex-error', 'Please enter valid reps'); return
  }

  try {
    await apiRequest(`/sessions/${activeSessionId}/exercises`, 'POST', {
      exercise_id: parseInt(exerciseId),
      weight_kg: weight, reps,
      reached_failure: manualFailure
    })

    document.getElementById('manual-ex-select').value = ''
    document.getElementById('manual-weight').value = ''
    document.getElementById('manual-reps').value = ''
    manualFailure = false
    document.querySelectorAll('#manual-ex-form .failure-btn')
      .forEach(b => b.classList.remove('yes-active', 'no-active'))
    toggleForm('manual-ex-form')
    alert('✅ Exercise added!')
  } catch (err) {
    showError('manual-ex-error', err.message)
  }
}

async function finishWorkout() {
  if (!activeSessionId) return

  let logged = 0, skipped = 0

  for (let i = 0; i < currentWorkoutExercises.length; i++) {
    const ex = currentWorkoutExercises[i]
    const weight = parseFloat(document.getElementById(`w-kg-${i}`)?.value)
    const reps = parseInt(document.getElementById(`w-rep-${i}`)?.value)
    const failure = failureState[i] ?? false

    if (!weight || !reps) { skipped++; continue }

    try {
      await apiRequest(`/sessions/${activeSessionId}/exercises`, 'POST', {
        exercise_id: ex.exercise_id,
        weight_kg: weight, reps,
        reached_failure: failure
      })
      logged++
    } catch {}
  }

  activeSessionId = null
  currentWorkoutExercises = []
  failureState = {}

  document.getElementById('active-workout').classList.add('hidden')
  document.getElementById('workout-select-program').classList.remove('hidden')

  alert(`✅ Workout done!\n${logged} logged${skipped ? `, ${skipped} skipped` : ''}.`)
  await loadCalendar()
}

async function cancelWorkout() {
  if (!confirm('Cancel workout?')) return
  try {
    if (activeSessionId) {
      await apiRequest(`/sessions/${activeSessionId}`, 'DELETE')
    }
  } catch {}

  activeSessionId = null
  currentWorkoutExercises = []
  failureState = {}

  document.getElementById('active-workout').classList.add('hidden')
  document.getElementById('workout-select-program').classList.remove('hidden')
}

// ============================================
// CALENDAR
// ============================================

async function loadCalendar() {
  try {
    allSessions = await apiRequest('/sessions')
    renderCalendar()
  } catch (err) {
    console.error('Calendar error:', err)
  }
}

function changeMonth(dir) {
  calendarDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + dir,
    1
  )
  renderCalendar()
}

function renderCalendar() {
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()

  document.getElementById('calendar-title').textContent =
    calendarDate.toLocaleDateString('en-US', {
      month: 'long', year: 'numeric'
    })

  const sessionDays = new Set(
    allSessions
      .filter(s => {
        const d = new Date(s.session_date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .map(s => new Date(s.session_date).getDate())
  )

  const today = new Date()
  const firstDay = new Date(year, month, 1).getDay() || 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  let html = `
    <div class="calendar-grid">
      <div class="calendar-day-name">Mon</div>
      <div class="calendar-day-name">Tue</div>
      <div class="calendar-day-name">Wed</div>
      <div class="calendar-day-name">Thu</div>
      <div class="calendar-day-name">Fri</div>
      <div class="calendar-day-name">Sat</div>
      <div class="calendar-day-name">Sun</div>
  `

  for (let i = 1; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    const hasWorkout = sessionDays.has(d)

    let cls = hasWorkout
      ? 'calendar-day has-workout'
      : isToday
        ? 'calendar-day today'
        : 'calendar-day normal'

    html += `
      <div class="${cls}"
        ${hasWorkout
          ? `onclick="showDayDetail(${year}, ${month+1}, ${d})"`
          : ''}>
        ${d}
        ${hasWorkout ? '<div class="workout-dot"></div>' : ''}
      </div>
    `
  }

  html += '</div>'
  document.getElementById('calendar-grid').innerHTML = html
}

async function showDayDetail(year, month, day) {
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  const container = document.getElementById('calendar-detail')

  const daySessions = allSessions.filter(s =>
    s.session_date?.startsWith(dateStr)
  )

  if (!daySessions.length) {
    container.classList.add('hidden')
    return
  }

  container.classList.remove('hidden')
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  try {
    const detail = await apiRequest(`/sessions/${daySessions[0].id}`)

    container.innerHTML = `
      <div class="form-card">
        <h3 style="margin-bottom:16px">
          📅 ${new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            weekday:'long', month:'long', day:'numeric'
          })}
        </h3>
        ${detail.exercises?.length
          ? detail.exercises.map(ex => `
              <div style="display:flex; justify-content:space-between;
                padding:10px 0; border-bottom:1px solid var(--border)">
                <div>
                  <strong>${ex.exercise_name}</strong>
                  <p style="color:var(--text-dim); font-size:0.82rem">
                    ${ex.weight_kg}kg × ${ex.reps} reps
                  </p>
                </div>
                <span class="badge ${ex.reached_failure ? 'badge-green' : ''}">
                  ${ex.reached_failure ? '✅ Failure' : '❌ No failure'}
                </span>
              </div>
            `).join('')
          : '<p style="color:var(--text-dim)">No exercises logged.</p>'
        }
      </div>
    `
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger)">${err.message}</p>`
  }
}

// fillExerciseDropdown — exercises sayfasıyla ortak kullanılıyor
function fillExerciseDropdown(selectId) {
  const select = document.getElementById(selectId)
  if (!select) return
  select.innerHTML = '<option value="">Select exercise...</option>'
  allExercises.forEach(ex => {
    const option = document.createElement('option')
    option.value = ex.id
    option.textContent = `${ex.name} (${ex.muscle_group})`
    select.appendChild(option)
  })
}

// ============================================
// KISIM 11: AI COACH
// ============================================

// Seçilen günleri tutan array
// [1, 3, 5] = Pazartesi, Çarşamba, Cuma
let selectedDays = []

// Gün butonuna tıklanınca
function toggleDay(button) {
  const day = parseInt(button.getAttribute('data-day'))

  if (selectedDays.includes(day)) {
    // Zaten seçiliyse kaldır
    selectedDays = selectedDays.filter(d => d !== day)
    button.classList.remove('selected')
  } else {
    // Seçili değilse ekle
    selectedDays.push(day)
    button.classList.add('selected')
  }
}

async function getAISuggestion() {
  // Değerleri topla
  const days_per_week = parseInt(document.getElementById('ai-days').value)
  const goal = document.getElementById('ai-goal').value
  const experience_level = aiData.ai_exp
  const equipment = aiData.ai_eq
  const injuries = document.getElementById('ai-injuries').value.trim()

  // Frontend validasyon
  if (!days_per_week || days_per_week < 1 || days_per_week > 7) {
    showError('ai-error', 'Please enter valid days per week (1-7)')
    return
  }
  if (!experience_level) {
    showError('ai-error', 'Please select your experience level')
    return
  }
  if (!equipment) {
    showError('ai-error', 'Please select available equipment')
    return
  }
  if (injuries && injuries.length > 300) {
    showError('ai-error', 'Injuries description cannot exceed 300 characters')
    return
  }

  // Loading göster
  // Gemini birkaç saniye sürebilir
  const btn = document.querySelector('#ai-suggestion-view .btn-primary')
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating your plan...'
  btn.disabled = true
  hideError('ai-error')

  // Önceki sonucu gizle
  document.getElementById('ai-result').classList.add('hidden')

  try {
    const result = await apiRequest('/ai/workout-suggestion', 'POST', {
      days_per_week,
      available_days: selectedDays.length > 0 ? selectedDays : null,
      goal,
      experience_level,
      equipment,
      injuries: injuries || null
    })

    // Sonucu göster
    // Gemini düz metin döndürüyor — satır sonlarını HTML'e çevir
    document.getElementById('ai-response-text').innerHTML =
      result.suggestion.replace(/\n/g, '<br>')

    // Varsayılan program adı öner
    document.getElementById('ai-save-name').value =
      `AI ${goal.replace('_', ' ')} Program`

    // Sonuç kartını göster
    document.getElementById('ai-result').classList.remove('hidden')

    // Sonuca kaydır
    document.getElementById('ai-result').scrollIntoView({ behavior: 'smooth' })

  } catch (err) {
    // Profil yoksa özel mesaj
    if (err.message.includes('Profile not found')) {
      showError('ai-error',
        '<i class="fa-solid fa-triangle-exclamation"></i> Please create your profile first. Go to Dashboard and complete your profile.'
      )
    } else {
      showError('ai-error', err.message)
    }
  } finally {
    // Her durumda butonu geri getir
    btn.innerHTML = '<i class="fa-solid fa-microchip"></i> Generate My Plan'
    btn.disabled = false
  }
}

async function saveAIProgram() {
  const name = document.getElementById('ai-save-name').value.trim()
  const days_per_week = parseInt(document.getElementById('ai-days').value)
  const goal = document.getElementById('ai-goal').value

  if (!name || name.length < 3) {
    alert('Please enter a program name (at least 3 characters)')
    return
  }

  try {
    const saveBtn = document.querySelector('#ai-result .btn-primary')
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'
    saveBtn.disabled = true

    await apiRequest('/ai/workout-suggestion/save', 'POST', {
      name,
      days_per_week,
      goal,
      description: 'Generated by Gemini AI — HIT style'
    })

    // Başarı mesajı göster
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!'
    saveBtn.style.background = 'var(--success)'
    saveBtn.style.color = '#000'

    // 2 saniye sonra programs sayfasına git
    setTimeout(() => {
      showView('programs')
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Program'
      saveBtn.disabled = false
      saveBtn.style.background = ''
      saveBtn.style.color = ''
    }, 2000)

  } catch (err) {
    alert(`Error: ${err.message}`)
    const saveBtn = document.querySelector('#ai-result .btn-primary')
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Program'
    saveBtn.disabled = false
  }
}
