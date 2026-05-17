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
// KISIM 8: EXERCISES
// ============================================

// Tüm egzersizleri tut — arama için lazım
let allExercises = []

async function loadExercises() {
  const container = document.getElementById('exercise-list')
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>'

  try {
    allExercises = await apiRequest('/exercises')
    renderExercises(allExercises)
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`
  }
}

// Egzersizleri ekrana çiz
function renderExercises(exercises) {
  const container = document.getElementById('exercise-list')

  if (exercises.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon"><i class="fa-solid fa-dumbbell"></i></span>
        <p>No exercises yet. Add your first one!</p>
      </div>
    `
    return
  }

  container.innerHTML = exercises.map(ex => `
    <div class="list-card">
      <div class="list-card-info">
        <h4>${ex.name}</h4>
        <p>
          <span class="badge badge-gold">${ex.muscle_group}</span>
          · Rest: ${ex.required_rest_days} days
          ${ex.description ? `· ${ex.description.substring(0, 60)}...` : ''}
        </p>
      </div>
      <div class="list-card-actions">
        <button class="btn-icon edit" onclick="editExercise(${ex.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-icon" onclick="deleteExercise(${ex.id}, '${ex.name}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('')
}

// Arama — her harf girişinde çalışır
// Backend'e istek atmaz, elimizdeki veriyi filtreler
function searchExercises() {
  const query = document.getElementById('exercise-search').value.toLowerCase().trim()

  if (!query) {
    renderExercises(allExercises)
    return
  }

  const filtered = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(query) ||
    ex.muscle_group.toLowerCase().includes(query)
  )

  renderExercises(filtered)
}

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
  if (!muscle_group || muscle_group.length < 2) {
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
// Formu doldur ve save butonunu güncelle
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
  document.querySelector('#exercise-form h3').textContent = 'Edit Exercise'

  // Save butonunu güncelleme moduna al
  // onclick'i değiştirerek hangi id'yi güncelleyeceğini söylüyoruz
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
  // Silmeden önce onay al
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
  document.querySelector('#exercise-form h3').textContent = 'New Exercise'
  const saveBtn = document.querySelector('#exercise-form .btn-primary')
  saveBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Save'
  saveBtn.setAttribute('onclick', 'createExercise()')
  hideError('exercise-form-error')
}
// ============================================
// KISIM 9: WORKOUT SESSIONS
// ============================================

let allSessions = []

async function loadSessions() {
  const container = document.getElementById('session-list')
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>'

  try {
    allSessions = await apiRequest('/sessions')
    renderSessions(allSessions)
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`
  }
}

function renderSessions(sessions) {
  const container = document.getElementById('session-list')

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon"><i class="fa-solid fa-dumbbell"></i></span>
        <p>No sessions yet. Log your first workout!</p>
      </div>
    `
    return
  }

  container.innerHTML = sessions.map(s => `
    <div class="list-card">
      <div class="list-card-info">
        <h4>${formatDate(s.session_date)}</h4>
        <p>
          ${s.exercise_count || 0} exercises
          ${s.duration_minutes ? `· ${s.duration_minutes} min` : ''}
          ${s.notes ? `· ${s.notes.substring(0, 50)}` : ''}
        </p>
      </div>
      <div class="list-card-actions">
        <button 
          class="btn-secondary" 
          style="font-size:0.8rem; padding: 6px 12px"
          onclick="openSessionDetail(${s.id})">
          Details
        </button>
        <button class="btn-icon" onclick="deleteSession(${s.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>

    <div id="session-detail-${s.id}" class="hidden">
      <div class="form-card" style="margin-top: -12px; border-top: none; border-radius: 0 0 12px 12px">

        <h4 style="margin-bottom: 16px; color: var(--accent)">Add Exercise to Session</h4>
        <div class="form-group">
          <label>Exercise</label>
          <select id="ses-ex-select-${s.id}">
            <option value="">Select exercise...</option>
          </select>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
          <div class="form-group">
            <label>Weight (kg)</label>
            <input type="number" id="ses-weight-${s.id}" placeholder="100" step="0.5" min="0.5">
          </div>
          <div class="form-group">
            <label>Reps</label>
            <input type="number" id="ses-reps-${s.id}" placeholder="8" min="1" max="100">
          </div>
        </div>
        <div class="form-group">
          <label>Reached Failure?</label>
          <div class="choice-buttons">
            <button class="choice-btn" onclick="selectChoice('failure_${s.id}','true',this)">
              <i class="fa-solid fa-check"></i> Yes — Mentzer approved!
            </button>
            <button class="choice-btn" onclick="selectChoice('failure_${s.id}','false',this)">
              <i class="fa-solid fa-xmark"></i> No
            </button>
          </div>
        </div>
        <div id="ses-ex-error-${s.id}" class="error-msg hidden"></div>
        <button class="btn-primary" onclick="addExerciseToSession(${s.id})">
          <i class="fa-solid fa-plus"></i> Add Exercise
        </button>

        <div id="ses-exercises-${s.id}" style="margin-top: 20px"></div>

        <div id="recovery-status-${s.id}" style="margin-top: 12px"></div>
      </div>
    </div>
  `).join('')

  // Her session için egzersiz dropdown'ını doldur
  sessions.forEach(s => {
    fillExerciseDropdown(`ses-ex-select-${s.id}`)
  })
}

// Egzersiz dropdown'ını doldur
// allExercises zaten bellekte — API isteği yapmadan kullan
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

// Session detay panelini aç/kapat
async function openSessionDetail(sessionId) {
  const panel = document.getElementById(`session-detail-${sessionId}`)
  const isHidden = panel.classList.contains('hidden')

  // Tüm panelleri kapat
  document.querySelectorAll('[id^="session-detail-"]').forEach(p => {
    p.classList.add('hidden')
  })

  if (isHidden) {
    panel.classList.remove('hidden')
    // Seansın detaylarını yükle (egzersizleri göster)
    await loadSessionExercises(sessionId)
  }
}

// Seanstaki egzersizleri yükle
async function loadSessionExercises(sessionId) {
  try {
    const session = await apiRequest(`/sessions/${sessionId}`)
    const container = document.getElementById(`ses-exercises-${sessionId}`)

    if (!session.exercises || session.exercises.length === 0) {
      container.innerHTML = `
        <p style="color: var(--text-dim); font-size: 0.9rem">
          No exercises logged yet.
        </p>
      `
      return
    }

    container.innerHTML = `
      <h4 style="margin-bottom: 12px; color: var(--text-secondary)">
        Logged Exercises
      </h4>
      ${session.exercises.map(ex => `
        <div class="list-card" style="margin-bottom: 8px">
          <div class="list-card-info">
            <h4>${ex.exercise_name}</h4>
            <p>
              ${ex.weight_kg}kg · ${ex.reps} reps ·
              <span class="${ex.reached_failure ? 'badge badge-green' : ''}">
                ${ex.reached_failure ? '<i class="fa-solid fa-check"></i> Failure reached' : '<i class="fa-solid fa-xmark"></i> No failure'}
              </span>
            </p>
          </div>
        </div>
      `).join('')}
    `
  } catch (err) {
    console.error('Error loading session exercises:', err)
  }
}

async function createSession() {
  const session_date = document.getElementById('ses-date').value
  const duration_minutes = document.getElementById('ses-duration').value
  const notes = document.getElementById('ses-notes').value.trim()

  // Frontend validasyon
  if (!session_date) {
    showError('session-form-error', 'Please select a date')
    return
  }

  if (duration_minutes && (duration_minutes < 1 || duration_minutes > 300)) {
    showError('session-form-error', 'Duration must be between 1-300 minutes')
    return
  }

  if (notes && notes.length > 500) {
    showError('session-form-error', 'Notes cannot exceed 500 characters')
    return
  }

  try {
    await apiRequest('/sessions', 'POST', {
      session_date,
      duration_minutes: duration_minutes ? parseInt(duration_minutes) : null,
      notes: notes || null
    })

    // Formu temizle ve kapat
    document.getElementById('ses-date').value = ''
    document.getElementById('ses-duration').value = ''
    document.getElementById('ses-notes').value = ''
    toggleForm('session-form')

    await loadSessions()

  } catch (err) {
    showError('session-form-error', err.message)
  }
}

async function addExerciseToSession(sessionId) {
  const exerciseId = document.getElementById(`ses-ex-select-${sessionId}`).value
  const weight = document.getElementById(`ses-weight-${sessionId}`).value
  const reps = document.getElementById(`ses-reps-${sessionId}`).value

  // Failure seçimi — selectChoice ile kaydedilen değer
  // aiData objesini değil, özel bir key kullanıyoruz
  const failureKey = `failure_${sessionId}`
  const reachedFailure = onboardingData[failureKey] === 'true' ||
    aiData[failureKey] === 'true'

  // Frontend validasyon
  if (!exerciseId) {
    showError(`ses-ex-error-${sessionId}`, 'Please select an exercise')
    return
  }
  if (!weight || weight <= 0) {
    showError(`ses-ex-error-${sessionId}`, 'Please enter a valid weight')
    return
  }
  if (!reps || reps < 1) {
    showError(`ses-ex-error-${sessionId}`, 'Please enter valid reps')
    return
  }

  try {
    const result = await apiRequest(`/sessions/${sessionId}/exercises`, 'POST', {
      exercise_id: parseInt(exerciseId),
      weight_kg: parseFloat(weight),
      reps: parseInt(reps),
      reached_failure: reachedFailure
    })

    // Mentzer uyarısı varsa göster
    if (result.progressWarning) {
      const recoveryDiv = document.getElementById(`recovery-status-${sessionId}`)
      recoveryDiv.innerHTML = `
        <div class="error-msg" style="background: rgba(232,197,71,0.1); 
          border-color: rgba(232,197,71,0.3); color: var(--accent)">
          <i class="fa-solid fa-bolt"></i> ${result.progressWarning}
        </div>
      `
    }

    // Egzersiz listesini yenile
    await loadSessionExercises(sessionId)

    // Inputları temizle
    document.getElementById(`ses-ex-select-${sessionId}`).value = ''
    document.getElementById(`ses-weight-${sessionId}`).value = ''
    document.getElementById(`ses-reps-${sessionId}`).value = ''

  } catch (err) {
    showError(`ses-ex-error-${sessionId}`, err.message)
  }
}

async function deleteSession(id) {
  if (!confirm('Delete this session? This cannot be undone.')) return

  try {
    await apiRequest(`/sessions/${id}`, 'DELETE')
    await loadSessions()
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

// ============================================
// KISIM 10: WORKOUT PROGRAMS
// ============================================

let allPrograms = []

async function loadPrograms() {
  const container = document.getElementById('program-list')
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>'

  try {
    allPrograms = await apiRequest('/programs')
    renderPrograms(allPrograms)
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`
  }
}

function renderPrograms(programs) {
  const container = document.getElementById('program-list')

  if (programs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon"><i class="fa-solid fa-clipboard-list"></i></span>
        <p>No programs yet. Create your first HIT program!</p>
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

  container.innerHTML = programs.map(p => `
    <div class="list-card ${p.is_active ? 'active-program' : ''}">
      <div class="list-card-info">
        <h4>
          ${p.name}
          ${p.is_active ? '<span class="badge badge-active">Active</span>' : ''}
        </h4>
        <p>
          ${goalLabels[p.goal] || p.goal || 'No goal set'} · 
          ${p.days_per_week} days/week · 
          ${p.exercise_count || 0} exercises
        </p>
        ${p.description
          ? `<p style="color: var(--text-dim); font-size: 0.82rem; margin-top: 4px">
              ${p.description.substring(0, 80)}
             </p>`
          : ''}
      </div>
      <div class="list-card-actions">
        ${!p.is_active
          ? `<button class="btn-icon edit" onclick="activateProgram(${p.id})" title="Set Active"><i class="fa-solid fa-star"></i></button>`
          : ''}
        <button class="btn-icon edit" onclick="openProgramDetail(${p.id})" title="Manage"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-icon" onclick="deleteProgram(${p.id}, '${p.name}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>

   <div id="program-detail-${p.id}" class="hidden">
      <div class="form-card" style="margin-top: -12px; border-top: none; border-radius: 0 0 12px 12px">

        <h4 style="color: var(--accent); margin-bottom: 16px">
          Add Exercise to Program
        </h4>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
          <div class="form-group">
            <label>Exercise</label>
            <select id="prog-ex-select-${p.id}">
              <option value="">Select exercise...</option>
            </select>
          </div>
          <div class="form-group">
            <label>Day of Week</label>
            <select id="prog-day-${p.id}">
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

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
          <div class="form-group">
            <label>Sets</label>
            <input type="number" id="prog-sets-${p.id}" 
              value="1" min="1" max="20"
              placeholder="1">
          </div>
          <div class="form-group">
            <label>Target Reps</label>
            <input type="number" id="prog-reps-${p.id}" 
              placeholder="8" min="1" max="100">
          </div>
        </div>

        <div class="form-group">
          <label>Notes (optional)</label>
          <input type="text" id="prog-ex-notes-${p.id}" 
            placeholder="e.g. Go to failure" maxlength="300">
        </div>

        <div id="prog-ex-error-${p.id}" class="error-msg hidden"></div>

        <button class="btn-primary" onclick="addExerciseToProgram(${p.id})">
          <i class="fa-solid fa-plus"></i> Add to Program
        </button>

        <div id="prog-exercises-${p.id}" style="margin-top: 20px"></div>
      </div>
    </div>
  `).join('')

  // Her program için dropdown doldur
  programs.forEach(p => {
    fillExerciseDropdown(`prog-ex-select-${p.id}`)
  })
}

async function openProgramDetail(programId) {
  const panel = document.getElementById(`program-detail-${programId}`)
  const isHidden = panel.classList.contains('hidden')

  // Tüm panelleri kapat
  document.querySelectorAll('[id^="program-detail-"]').forEach(p => {
    p.classList.add('hidden')
  })

  if (isHidden) {
    panel.classList.remove('hidden')
    await loadProgramExercises(programId)
  }
}

async function loadProgramExercises(programId) {
  try {
    const program = await apiRequest(`/programs/${programId}`)
    const container = document.getElementById(`prog-exercises-${programId}`)

    if (!program.exercises || program.exercises.length === 0) {
      container.innerHTML = `
        <p style="color: var(--text-dim); font-size: 0.9rem">
          No exercises yet. Add some above!
        </p>
      `
      return
    }

    // Egzersizleri güne göre grupla
    // { 1: [bench press, ...], 3: [squat, ...] }
    const byDay = {}
    program.exercises.forEach(ex => {
      if (!byDay[ex.day_of_week]) byDay[ex.day_of_week] = []
      byDay[ex.day_of_week].push(ex)
    })

    const dayNames = {
      1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
    }

    // Her günü ayrı başlıkla göster
    container.innerHTML = `
      <h4 style="margin-bottom: 12px; color: var(--text-secondary)">
        Program Schedule
      </h4>
      ${Object.keys(byDay).sort().map(day => `
        <div style="margin-bottom: 16px">
          <p style="color: var(--accent); font-weight: 600; 
            font-size: 0.85rem; margin-bottom: 8px; 
            text-transform: uppercase; letter-spacing: 1px">
            ${dayNames[day]}
          </p>
          ${byDay[day].map(ex => `
            <div class="list-card" style="margin-bottom: 6px">
              <div class="list-card-info">
                <h4>${ex.exercise_name}</h4>
                <p>
                  <span class="badge badge-gold">${ex.muscle_group}</span>
                  · ${ex.sets} set · ${ex.target_reps} reps
                  ${ex.notes ? `· ${ex.notes}` : ''}
                </p>
              </div>
              <button class="btn-icon" 
                onclick="removeExerciseFromProgram(${programId}, ${ex.id})" 
                title="Remove"><i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `).join('')}
        </div>
      `).join('')}
    `
  } catch (err) {
    console.error('Error loading program exercises:', err)
  }
}

async function createProgram() {
  const name = document.getElementById('prog-name').value.trim()
  const goal = document.getElementById('prog-goal').value
  const days_per_week = parseInt(document.getElementById('prog-days').value)
  const description = document.getElementById('prog-desc').value.trim()

  // Frontend validasyon
  if (!name || name.length < 3) {
    showError('program-form-error', 'Program name must be at least 3 characters')
    return
  }
  if (!days_per_week || days_per_week < 1 || days_per_week > 7) {
    showError('program-form-error', 'Days per week must be between 1-7')
    return
  }
  if (description && description.length > 1000) {
    showError('program-form-error', 'Description cannot exceed 1000 characters')
    return
  }

  try {
    const result = await apiRequest('/programs', 'POST', {
      name, goal, days_per_week,
      description: description || null
    })

    // Mentzer uyarısı — 3'ten fazla gün seçildiyse
    if (result.warning) {
      alert(`⚡ Mentzer says: ${result.warning}`)
    }

    // Formu temizle
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
  const exerciseId = document.getElementById(`prog-ex-select-${programId}`).value
  const day_of_week = parseInt(document.getElementById(`prog-day-${programId}`).value)
  const sets = parseInt(document.getElementById(`prog-sets-${programId}`).value)
  const target_reps = parseInt(document.getElementById(`prog-reps-${programId}`).value)
  const notes = document.getElementById(`prog-ex-notes-${programId}`).value.trim()

  // Frontend validasyon
  if (!exerciseId) {
    showError(`prog-ex-error-${programId}`, 'Please select an exercise')
    return
  }
  if (!target_reps || target_reps < 1) {
    showError(`prog-ex-error-${programId}`, 'Please enter target reps')
    return
  }
  if (!sets || sets < 1 || sets > 20) {
    showError(`prog-ex-error-${programId}`, 'Sets must be between 1-20')
    return
  }

  try {
    const result = await apiRequest(`/programs/${programId}/exercises`, 'POST', {
      exercise_id: parseInt(exerciseId),
      day_of_week,
      sets,
      target_reps,
      notes: notes || null
    })

    // Mentzer uyarısı
    if (result.warning) {
      const errorDiv = document.getElementById(`prog-ex-error-${programId}`)
      errorDiv.style.background = 'rgba(232,197,71,0.1)'
      errorDiv.style.borderColor = 'rgba(232,197,71,0.3)'
      errorDiv.style.color = 'var(--accent)'
      errorDiv.innerHTML = `<i class="fa-solid fa-bolt"></i> ${result.warning}`
      errorDiv.classList.remove('hidden')
    }

    // Formu temizle
    document.getElementById(`prog-ex-select-${programId}`).value = ''
    document.getElementById(`prog-reps-${programId}`).value = ''
    document.getElementById(`prog-ex-notes-${programId}`).value = ''

    await loadProgramExercises(programId)

  } catch (err) {
    showError(`prog-ex-error-${programId}`, err.message)
  }
}

async function removeExerciseFromProgram(programId, exerciseEntryId) {
  if (!confirm('Remove this exercise from the program?')) return

  try {
    await apiRequest(`/programs/${programId}/exercises/${exerciseEntryId}`, 'DELETE')
    await loadProgramExercises(programId)
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

async function deleteProgram(id, name) {
  if (!confirm(`Delete program "${name}"? This cannot be undone.`)) return

  try {
    await apiRequest(`/programs/${id}`, 'DELETE')
    await loadPrograms()
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
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
