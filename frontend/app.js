// ============================================
// HIT TRACKER — app.js
// ============================================

const API = 'http://localhost:3000/api'

// Onboarding seçimlerini tut
const ob = {
  gender: null,
  activity: null,
  goal: null
}

// AI Coach seçimlerini tut
const ai = {
  ai_exp: null,
  ai_eq: null
}

// Seçili günler (AI Coach)
let selectedDays = []

// Onboarding adımı
let obStep = 1
const OB_TOTAL = 5

// Aktif antrenman
let activeSessionId = null
let workoutExercises = []
let failureState = {}
let manualFailure = false

// Exercises
let allExercises = []
let activeFilter = 'all'

// Programs
let allPrograms = []

// Calendar
let calDate = new Date()
let allSessions = []

// ============================================
// API YARDIMCI
// ============================================

async function api(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token')
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${API}${endpoint}`, opts)
  const data = await res.json()

  if (!res.ok) {
    const msg = data.errors
      ? data.errors.join(', ')
      : data.error || 'Something went wrong'
    throw new Error(msg)
  }
  return data
}

// ============================================
// VIEW YÖNETİMİ
// ============================================

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'))
  document.getElementById(`${name}-view`).classList.remove('hidden')

  // Navbar aktif buton
  document.querySelectorAll('.nav-links button[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name)
  })

  // View yüklenince veri çek
  if (name === 'dashboard') loadDashboard()
  if (name === 'exercises') loadExercises()
  if (name === 'training') loadTraining()

  // Lucide ikonları yeniden render et
  lucide.createIcons()
}

function toggleForm(id) {
  document.getElementById(id).classList.toggle('hidden')
  lucide.createIcons()
}

function showErr(id, msg) {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = msg
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 5000)
}

function hideErr(id) {
  document.getElementById(id)?.classList.add('hidden')
}

// ============================================
// BAŞLANGIÇ
// ============================================

async function init() {
  const token = localStorage.getItem('token')

  if (!token) {
    showView('auth')
    return
  }

  try {
    await api('/calories/profile')
    document.getElementById('navbar').classList.remove('hidden')
    const username = localStorage.getItem('username')
    if (username) {
      document.getElementById('dash-username').textContent = username
    }
    showView('dashboard')
  } catch (err) {
    if (err.message.includes('Profile not found')) {
      showView('onboarding')
    } else {
      localStorage.clear()
      showView('auth')
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init()
  lucide.createIcons()
})

// ============================================
// AUTH
// ============================================

function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login')
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register')
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0) === (tab === 'login'))
  })
}

async function login() {
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value

  if (!email || !password) {
    showErr('login-error', 'Please fill in all fields')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showErr('login-error', 'Please enter a valid email')
    return
  }

  try {
    const data = await api('/auth/login', 'POST', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', data.user.username)
    localStorage.setItem('userId', data.user.id)

    document.getElementById('navbar').classList.remove('hidden')
    document.getElementById('dash-username').textContent = data.user.username

    try {
      await api('/calories/profile')
      showView('dashboard')
    } catch {
      showView('onboarding')
    }
  } catch (err) {
    showErr('login-error', err.message)
  }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim()
  const email = document.getElementById('reg-email').value.trim()
  const password = document.getElementById('reg-password').value

  if (!username || !email || !password) {
    showErr('register-error', 'Please fill in all fields')
    return
  }
  if (username.length < 3) {
    showErr('register-error', 'Username must be at least 3 characters')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showErr('register-error', 'Please enter a valid email')
    return
  }
  if (password.length < 6) {
    showErr('register-error', 'Password must be at least 6 characters')
    return
  }

  try {
    const data = await api('/auth/register', 'POST', { username, email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', data.user.username)
    localStorage.setItem('userId', data.user.id)
    document.getElementById('navbar').classList.add('hidden')
    showView('onboarding')
  } catch (err) {
    showErr('register-error', err.message)
  }
}

function logout() {
  localStorage.clear()
  document.getElementById('navbar').classList.add('hidden')
  showView('auth')
}

// ============================================
// ONBOARDING
// ============================================

function selectChoice(group, value, el) {
  // Aynı gruptaki seçimleri kaldır
  el.parentElement.querySelectorAll('.choice-card, .activity-card, .goal-card')
    .forEach(e => e.classList.remove('selected'))
  el.classList.add('selected')

  // Doğru objeye kaydet
  if (group in ob) ob[group] = value
  else if (group in ai) ai[group] = value
}

async function obNext() {
  const err = validateObStep(obStep)
  if (err) { showErr('onboarding-error', err); return }
  hideErr('onboarding-error')

  // Son adımdan önce özeti hazırla
  if (obStep === 4) buildSummary()

  document.getElementById(`step-${obStep}`).classList.add('hidden')
  obStep++
  document.getElementById(`step-${obStep}`).classList.remove('hidden')

  updateObProgress()
  lucide.createIcons()

  // Son adımda butonları değiştir
  if (obStep === OB_TOTAL) {
    document.getElementById('ob-next').classList.add('hidden')
    document.getElementById('ob-finish').classList.remove('hidden')
  }
  document.getElementById('ob-back').classList.remove('hidden')
}

function obBack() {
  hideErr('onboarding-error')
  document.getElementById(`step-${obStep}`).classList.add('hidden')
  obStep--
  document.getElementById(`step-${obStep}`).classList.remove('hidden')

  updateObProgress()
  lucide.createIcons()

  document.getElementById('ob-next').classList.remove('hidden')
  document.getElementById('ob-finish').classList.add('hidden')

  if (obStep === 1) {
    document.getElementById('ob-back').classList.add('hidden')
  }
}

function updateObProgress() {
  const pct = (obStep / OB_TOTAL) * 100
  document.getElementById('progress-fill').style.width = `${pct}%`
  document.getElementById('step-current').textContent = obStep
}

function validateObStep(step) {
  if (step === 1) {
    const val = document.getElementById('ob-birthdate').value
    if (!val) return 'Please enter your date of birth'

    const birth = new Date(val)
    const today = new Date()
    if (birth > today) return 'Birth date cannot be in the future'
    if (birth.getFullYear() < 1900) return 'Please enter a valid birth year'

    let age = today.getFullYear() - birth.getFullYear()
    const passed = today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
    if (!passed) age--

    if (age < 13) return 'You must be at least 13 years old'
    if (age > 100) return 'Please enter a valid birth date'
    if (!ob.gender) return 'Please select your gender'
  }

  if (step === 2) {
    const h = document.getElementById('ob-height').value
    const w = document.getElementById('ob-weight').value
    if (!h) return 'Please enter your height'
    if (!w) return 'Please enter your weight'
    if (h < 100 || h > 250) return 'Height must be between 100-250 cm'
    if (w < 30 || w > 300) return 'Weight must be between 30-300 kg'
  }

  if (step === 3 && !ob.activity) return 'Please select your activity level'
  if (step === 4 && !ob.goal) return 'Please select your goal'

  return null
}

function buildSummary() {
  const birth = document.getElementById('ob-birthdate').value
  const height = document.getElementById('ob-height').value
  const weight = document.getElementById('ob-weight').value

  const birthDate = new Date(birth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const passed = today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())
  if (!passed) age--

  const actLabels = {
    sedentary: 'Sedentary', light: 'Light',
    moderate: 'Moderate', active: 'Active', very_active: 'Very Active'
  }
  const goalLabels = {
    muscle_gain: 'Build Muscle', fat_loss: 'Burn Fat',
    strength: 'Get Stronger', endurance: 'Endurance'
  }

  // Özet grid
  document.getElementById('profile-summary').innerHTML = `
    <div class="summary-item">
      <label>Age</label>
      <span>${age} years</span>
    </div>
    <div class="summary-item">
      <label>Gender</label>
      <span>${ob.gender}</span>
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
      <span>${actLabels[ob.activity]}</span>
    </div>
    <div class="summary-item">
      <label>Goal</label>
      <span>${goalLabels[ob.goal]}</span>
    </div>
  `

  // Tahmini kalori hesapla
  const base = (10 * weight) + (6.25 * height) - (5 * age) +
    (ob.gender === 'male' ? 5 : -161)
  const multipliers = {
    sedentary: 1.20, light: 1.375, moderate: 1.55,
    active: 1.725, very_active: 1.90
  }
  const adjustments = {
    muscle_gain: 400, fat_loss: -500, strength: 0, endurance: 0
  }
  const tdee = Math.round(base * multipliers[ob.activity])
  const target = tdee + adjustments[ob.goal]

  document.getElementById('calorie-preview').innerHTML = `
    <div class="big-num">${target}</div>
    <p>kcal / day for <strong>${goalLabels[ob.goal]}</strong></p>
  `
}

async function obFinish() {
  const btn = document.getElementById('ob-finish')
  btn.textContent = 'Saving...'
  btn.disabled = true

  try {
    await api('/calories/profile', 'POST', {
      birth_date: document.getElementById('ob-birthdate').value,
      weight_kg: parseFloat(document.getElementById('ob-weight').value),
      height_cm: parseFloat(document.getElementById('ob-height').value),
      gender: ob.gender,
      activity_level: ob.activity
    })

    document.getElementById('navbar').classList.remove('hidden')
    document.getElementById('dash-username').textContent =
      localStorage.getItem('username')

    showView('dashboard')
  } catch (err) {
    btn.textContent = 'Start Training'
    btn.disabled = false
    showErr('onboarding-error', err.message)
  }
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
  const username = localStorage.getItem('username')
  if (username) {
    document.getElementById('dash-username').textContent = username
  }

  // 5 isteği paralel at — biri hata verse diğerleri etkilenmesin
  const [quoteRes, sessionsRes, exercisesRes, programsRes, profileRes] =
    await Promise.allSettled([
      api('/quotes/random'),
      api('/sessions'),
      api('/exercises'),
      api('/programs'),
      api('/calories/profile')
    ])

  // Motivasyon sözü
  if (quoteRes.status === 'fulfilled') {
    const q = quoteRes.value
    document.getElementById('daily-quote').innerHTML =
      `<em>"${q.quote}"</em> <strong>— ${q.author}</strong>`
  }

  // Session sayısı + son 3 seans
  if (sessionsRes.status === 'fulfilled') {
    const sessions = sessionsRes.value
    document.getElementById('stat-sessions').textContent = sessions.length
    renderRecentSessions(sessions.slice(0, 3))
  }

  // Egzersiz sayısı
  if (exercisesRes.status === 'fulfilled') {
    document.getElementById('stat-exercises').textContent =
      exercisesRes.value.length
  }

  // Program sayısı + aktif program
  if (programsRes.status === 'fulfilled') {
    const programs = programsRes.value
    document.getElementById('stat-programs').textContent = programs.length
    const active = programs.find(p => p.is_active)
    renderActiveProgram(active)
  }

  // Günlük kalori
  if (profileRes.status === 'fulfilled') {
    const calories = profileRes.value.report?.target_calories
    if (calories) {
      document.getElementById('stat-calories').textContent = calories
    }
  }
}

function renderRecentSessions(sessions) {
  const el = document.getElementById('recent-sessions')

  if (!sessions?.length) {
    el.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 4v16M18 4v16M4 8h4M16 8h4M4 16h4M16 16h4"/>
        </svg>
        <p>No sessions yet</p>
      </div>
    `
    return
  }

  el.innerHTML = sessions.map(s => `
    <div style="display:flex; justify-content:space-between;
      align-items:center; padding:10px 0;
      border-bottom:1px solid var(--border)">
      <div>
        <p style="font-weight:500; font-size:0.9rem">
          ${formatDate(s.session_date)}
        </p>
        <p style="color:var(--text-3); font-size:0.8rem">
          ${s.exercise_count || 0} exercises
          ${s.duration_minutes ? `· ${s.duration_minutes} min` : ''}
        </p>
      </div>
    </div>
  `).join('')
}

function renderActiveProgram(program) {
  const el = document.getElementById('active-program')

  if (!program) {
    el.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
            M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>No active program</p>
        <button class="btn-primary" style="margin-top:12px"
          onclick="showView('training')">
          Create Program
        </button>
      </div>
    `
    return
  }

  const goalLabels = {
    muscle_gain: 'Build Muscle', fat_loss: 'Burn Fat',
    strength: 'Strength', endurance: 'Endurance'
  }

  el.innerHTML = `
    <div style="padding:14px; background:var(--bg-3);
      border-radius:var(--radius-sm); border:1px solid var(--gold-border)">
      <div style="display:flex; justify-content:space-between;
        align-items:center; margin-bottom:8px">
        <h4 style="font-size:0.95rem">${program.name}</h4>
        <span class="badge badge-active">Active</span>
      </div>
      <p style="color:var(--text-3); font-size:0.82rem">
        ${goalLabels[program.goal] || ''} ·
        ${program.days_per_week} days/week ·
        ${program.exercise_count || 0} exercises
      </p>
      <button class="btn-primary" style="margin-top:12px; font-size:0.82rem"
        onclick="showView('training');
          setTimeout(() => switchTrainingTab('workout',
            document.querySelector('.t-tab:nth-child(2)')), 100)">
        Start Workout
      </button>
    </div>
  `
}

// Tarihi okunabilir yap: "2026-05-15" → "May 15, 2026"
function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

// ============================================
// EXERCISES
// ============================================

async function loadExercises() {
  const container = document.getElementById('exercise-list')
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  try {
    allExercises = await api('/exercises')
    buildFilterButtons()
    applyFilters()
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`
  }
}

function buildFilterButtons() {
  // Kas gruplarını DB'den gelen veriye göre dinamik oluştur
  const muscles = [...new Set(allExercises.map(e => e.muscle_group))].sort()

  const container = document.getElementById('muscle-filters')
  container.innerHTML = `
    <button class="filter-btn active" onclick="filterBy('all', this)">
      All (${allExercises.length})
    </button>
    ${muscles.map(m => `
      <button class="filter-btn" onclick="filterBy('${m}', this)">
        ${m} (${allExercises.filter(e => e.muscle_group === m).length})
      </button>
    `).join('')}
    <button class="filter-btn" onclick="filterBy('custom', this)">
      My Exercises
    </button>
  `
}

function filterBy(filter, btn) {
  activeFilter = filter
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  applyFilters()
}

function applyFilters() {
  const query = document.getElementById('exercise-search')?.value.toLowerCase().trim() || ''
  let list = allExercises

  if (activeFilter === 'custom') {
    list = list.filter(e => e.is_custom)
  } else if (activeFilter !== 'all') {
    list = list.filter(e => e.muscle_group === activeFilter)
  }

  if (query) {
    list = list.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.muscle_group.toLowerCase().includes(query)
    )
  }

  renderExercises(list)
}

function renderExercises(list) {
  const container = document.getElementById('exercise-list')

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <p>No exercises found.</p>
      </div>
    `
    return
  }

  container.innerHTML = list.map(ex => `
    <div class="ex-card" onclick="openExModal(${ex.id})">
      <div class="ex-card-img">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 4v16M18 4v16M4 8h4M16 8h4M4 16h4M16 16h4"/>
        </svg>
      </div>
      <div class="ex-card-body">
        <h4>${ex.name}</h4>
        <div class="ex-card-meta">
          <span class="badge badge-gold">${ex.muscle_group}</span>
          ${ex.is_custom
            ? '<span class="badge badge-green">Custom</span>'
            : ''}
        </div>
      </div>
    </div>
  `).join('')
}

function openExModal(id) {
  const ex = allExercises.find(e => e.id === id)
  if (!ex) return

  const tips = {
    'Chest': 'One set to failure on pressing is worth more than ten half-hearted sets.',
    'Back': 'The back responds incredibly well to HIT — one all-out set is all you need.',
    'Shoulders': 'Overhead pressing to failure — brief, intense, infrequent.',
    'Biceps': 'Curls taken to absolute failure — your biceps will have no choice but to grow.',
    'Triceps': 'The tricep is 2/3 of your arm. One set to failure is your ticket to growth.',
    'Quadriceps': 'Squats to failure are brutally hard. That is exactly why they work.',
    'Hamstrings': 'Romanian deadlifts to failure — feel every fiber working.',
    'Glutes': 'Hip thrusts to failure build the most powerful muscles in your body.',
    'Abs': 'Brief, intense work and adequate rest — same rules apply.',
    'Calves': 'Take them to absolute failure — no mercy.',
    'Traps': 'Heavy shrugs to failure. Simple, brutal, effective.',
    'Forearms': 'Wrist curls to failure — often neglected, always rewarded.'
  }

  const tip = tips[ex.muscle_group] ||
    'Train with maximum intensity. One set to failure. Then rest and grow.'

  const secondaryHtml = ex.secondary_muscles?.length
    ? `<div class="modal-section" style="margin-bottom:16px">
        <p style="font-size:0.75rem; color:var(--text-3);
          text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px">
          Secondary Muscles
        </p>
        <div style="display:flex; gap:6px; flex-wrap:wrap">
          ${ex.secondary_muscles.map(m =>
            `<span class="badge" style="background:var(--bg-3);
              color:var(--text-2); border:1px solid var(--border-2)">
              ${m}
            </span>`
          ).join('')}
        </div>
      </div>`
    : ''

  const instructionsHtml = ex.instructions?.length
    ? `<div style="margin-bottom:16px">
        <p style="font-size:0.75rem; color:var(--text-3);
          text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px">
          How to Perform
        </p>
        <ol class="instructions-list">
          ${ex.instructions.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </div>`
    : ''

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-content-body">
      <h2 class="modal-title">${ex.name}</h2>

      <div class="modal-badges">
        <span class="badge badge-gold">${ex.muscle_group}</span>
        ${ex.equipment
          ? `<span class="badge badge-gold">${ex.equipment}</span>`
          : ''}
        ${ex.level
          ? `<span class="badge badge-gold">${ex.level}</span>`
          : ''}
        ${ex.is_custom
          ? '<span class="badge badge-green">Custom</span>'
          : ''}
      </div>

      <div class="modal-stats">
        <div class="modal-stat">
          <label>Equipment</label>
          <span>${ex.equipment || 'Bodyweight'}</span>
        </div>
        <div class="modal-stat">
          <label>Level</label>
          <span>${ex.level || 'All'}</span>
        </div>
        <div class="modal-stat">
          <label>Rest Days</label>
          <span>${ex.required_rest_days}d</span>
        </div>
      </div>

      <div class="mentzer-tip">
        ⚡ <strong>Mentzer:</strong> "${tip}"
      </div>

      ${secondaryHtml}
      ${instructionsHtml}

      ${ex.is_custom ? `
        <div style="display:flex; gap:10px; margin-top:20px;
          padding-top:20px; border-top:1px solid var(--border)">
          <button class="btn-secondary"
            onclick="editExercise(${ex.id}); closeModal()">
            Edit
          </button>
          <button class="btn-ghost-danger"
            onclick="deleteExercise(${ex.id}, '${ex.name}'); closeModal()">
            Delete
          </button>
        </div>
      ` : ''}
    </div>
  `

  document.getElementById('exercise-modal').classList.remove('hidden')
  lucide.createIcons()
}

function closeModal() {
  document.getElementById('exercise-modal').classList.add('hidden')
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal()
})

async function createExercise() {
  const name = document.getElementById('ex-name').value.trim()
  const muscle_group = document.getElementById('ex-muscle').value
  const description = document.getElementById('ex-desc').value.trim()
  const required_rest_days = parseInt(document.getElementById('ex-rest').value)

  if (!name || name.length < 2) {
    showErr('exercise-form-error', 'Name must be at least 2 characters')
    return
  }
  if (!muscle_group) {
    showErr('exercise-form-error', 'Please select a muscle group')
    return
  }
  if (!required_rest_days || required_rest_days < 3) {
    showErr('exercise-form-error', 'Rest days must be at least 3 (Mentzer rule!)')
    return
  }

  try {
    await api('/exercises', 'POST', {
      name, muscle_group, description, required_rest_days
    })
    clearExForm()
    toggleForm('exercise-form')
    await loadExercises()
  } catch (err) {
    showErr('exercise-form-error', err.message)
  }
}

function editExercise(id) {
  const ex = allExercises.find(e => e.id === id)
  if (!ex) return

  document.getElementById('exercise-form').classList.remove('hidden')
  document.getElementById('ex-name').value = ex.name
  document.getElementById('ex-muscle').value = ex.muscle_group
  document.getElementById('ex-desc').value = ex.description || ''
  document.getElementById('ex-rest').value = ex.required_rest_days

  document.querySelector('#exercise-form h3').textContent = 'Edit Exercise'
  const btn = document.querySelector('#exercise-form .btn-primary')
  btn.setAttribute('onclick', `updateExercise(${id})`)
  btn.innerHTML = 'Update'

  document.getElementById('exercise-form').scrollIntoView({ behavior: 'smooth' })
}

async function updateExercise(id) {
  const name = document.getElementById('ex-name').value.trim()
  const muscle_group = document.getElementById('ex-muscle').value
  const description = document.getElementById('ex-desc').value.trim()
  const required_rest_days = parseInt(document.getElementById('ex-rest').value)

  if (!name || !muscle_group || required_rest_days < 3) {
    showErr('exercise-form-error', 'Please fill all fields correctly')
    return
  }

  try {
    await api(`/exercises/${id}`, 'PUT', {
      name, muscle_group, description, required_rest_days
    })
    clearExForm()
    toggleForm('exercise-form')
    await loadExercises()
  } catch (err) {
    showErr('exercise-form-error', err.message)
  }
}

async function deleteExercise(id, name) {
  if (!confirm(`Delete "${name}"?`)) return
  try {
    await api(`/exercises/${id}`, 'DELETE')
    await loadExercises()
  } catch (err) {
    alert(err.message)
  }
}

function clearExForm() {
  document.getElementById('ex-name').value = ''
  document.getElementById('ex-muscle').value = ''
  document.getElementById('ex-desc').value = ''
  document.getElementById('ex-rest').value = '5'
  document.querySelector('#exercise-form h3').textContent = 'Add Custom Exercise'
  const btn = document.querySelector('#exercise-form .btn-primary')
  btn.setAttribute('onclick', 'createExercise()')
  btn.innerHTML = '<i data-lucide="save"></i> Save'
  hideErr('exercise-form-error')
  lucide.createIcons()
}

// Program ve session dropdown'ları için ortak fonksiyon
function fillExDropdown(selectId) {
  const select = document.getElementById(selectId)
  if (!select) return
  select.innerHTML = '<option value="">Select exercise...</option>'
  allExercises.forEach(ex => {
    const opt = document.createElement('option')
    opt.value = ex.id
    opt.textContent = `${ex.name} (${ex.muscle_group})`
    select.appendChild(opt)
  })
}


function filterProgExDropdown(progId) {
  const query = document.getElementById(`padd-search-${progId}`)
    .value.toLowerCase()
  const select = document.getElementById(`padd-ex-${progId}`)

  select.innerHTML = '<option value="">Select...</option>'

  allExercises
    .filter(ex =>
      ex.name.toLowerCase().includes(query) ||
      ex.muscle_group.toLowerCase().includes(query)
    )
    .forEach(ex => {
      const opt = document.createElement('option')
      opt.value = ex.id
      opt.textContent = `${ex.name} (${ex.muscle_group})`
      select.appendChild(opt)
    })
}

// ============================================
// TRAINING
// ============================================

async function loadTraining() {
  await loadPrograms()
}

function switchTrainingTab(tabName, btn) {
  // Tab içeriklerini gizle
  document.querySelectorAll('.t-content').forEach(t => t.classList.add('hidden'))
  // Tab butonlarından active kaldır
  document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'))

  // Seçileni göster
  document.getElementById(`tab-${tabName}`).classList.remove('hidden')
  if (btn) btn.classList.add('active')

  if (tabName === 'programs') loadPrograms()
  if (tabName === 'workout') loadWorkoutTab()
  if (tabName === 'calendar') loadCalendar()
}

// ============================================
// PROGRAMS
// ============================================

async function loadPrograms() {
  const container = document.getElementById('program-list')
  if (!container) return
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  try {
    allPrograms = await api('/programs')
    renderPrograms(allPrograms)
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`
  }
}

function renderPrograms(programs) {
  const container = document.getElementById('program-list')

  if (!programs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No programs yet. Create your first HIT program!</p>
      </div>
    `
    return
  }

  const goalLabels = {
    muscle_gain: 'Build Muscle', fat_loss: 'Burn Fat',
    strength: 'Strength', endurance: 'Endurance'
  }

  container.innerHTML = programs.map(p => `
    <div class="program-card ${p.is_active ? 'is-active' : ''}">
      <div class="program-card-header">
        <div>
          <h3>
            ${p.name}
            ${p.is_active
              ? '<span class="badge badge-active" style="margin-left:8px">Active</span>'
              : ''}
          </h3>
          <p style="color:var(--text-3); font-size:0.82rem; margin-top:4px">
            ${goalLabels[p.goal] || ''} ·
            ${p.days_per_week} days/week ·
            ${p.exercise_count || 0} exercises
          </p>
        </div>
        <div style="display:flex; gap:8px; align-items:center">
          ${!p.is_active
            ? `<button class="btn-secondary"
                onclick="activateProgram(${p.id})"
                style="font-size:0.8rem; padding:6px 12px">
                Set Active
              </button>`
            : ''}
          <button class="btn-icon edit"
            onclick="toggleProgDetail(${p.id})">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-icon"
            onclick="deleteProgram(${p.id}, '${p.name}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>

      <!-- Detay paneli -->
      <div id="prog-detail-${p.id}" class="hidden">
        <div class="program-card-body">
          <h4 style="color:var(--gold); margin-bottom:14px; font-size:0.88rem;
            text-transform:uppercase; letter-spacing:0.5px">
            Add Exercise
          </h4>

          <div class="two-col">
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

          <div class="two-col">
            <div class="form-group">
              <label>Sets</label>
              <input type="number" id="padd-sets-${p.id}"
                value="1" min="1" max="10">
            </div>
            <div class="form-group">
              <label>Target Reps</label>
              <input type="number" id="padd-reps-${p.id}"
                placeholder="8" min="1">
            </div>
          </div>

          <div id="padd-err-${p.id}" class="error-msg hidden"></div>

          <button class="btn-primary" onclick="addExToProgram(${p.id})">
            <i data-lucide="plus"></i> Add
          </button>

          <div id="padd-list-${p.id}" style="margin-top:20px"></div>
        </div>
      </div>
    </div>
  `).join('')

  lucide.createIcons()
}

async function toggleProgDetail(id) {
  const detail = document.getElementById(`prog-detail-${id}`)
  const isHidden = detail.classList.contains('hidden')

  document.querySelectorAll('[id^="prog-detail-"]').forEach(d => {
    d.classList.add('hidden')
  })

  if (isHidden) {
    detail.classList.remove('hidden')

    if (!allExercises.length) {
      allExercises = await api('/exercises')
    }

    // Arama inputu ekle — yoksa ekle, varsa atlat
    const searchId = `padd-search-${id}`
    if (!document.getElementById(searchId)) {
      const selectEl = document.getElementById(`padd-ex-${id}`)
      const searchInput = document.createElement('input')
      searchInput.type = 'text'
      searchInput.id = searchId
      searchInput.placeholder = 'Search exercise...'
      searchInput.style.cssText = 'width:100%; margin-bottom:6px;'
      searchInput.className = 'form-group input'
      searchInput.setAttribute('oninput', `filterProgExDropdown('${id}')`)
      selectEl.parentNode.insertBefore(searchInput, selectEl)
    }

    fillExDropdown(`padd-ex-${id}`)
    await loadProgExList(id)
    lucide.createIcons()
  }
}

async function loadProgExList(progId) {
  const container = document.getElementById(`padd-list-${progId}`)
  try {
    const prog = await api(`/programs/${progId}`)

    if (!prog.exercises?.length) {
      container.innerHTML = `
        <p style="color:var(--text-3); font-size:0.88rem">
          No exercises yet. Add some above!
        </p>
      `
      return
    }

    const dayNames = {
      1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
    }

    // Güne göre grupla
    const byDay = {}
    prog.exercises.forEach(ex => {
      if (!byDay[ex.day_of_week]) byDay[ex.day_of_week] = []
      byDay[ex.day_of_week].push(ex)
    })

    container.innerHTML = Object.keys(byDay).sort().map(day => `
      <div class="day-col" style="margin-bottom:16px">
        <h4>${dayNames[day]}</h4>
        ${byDay[day].map(ex => `
          <div class="day-ex-item">
            <div>
              <strong style="font-size:0.88rem">${ex.exercise_name}</strong>
              <span style="margin-left:8px; color:var(--text-3); font-size:0.78rem">
                ${ex.sets}×${ex.target_reps}
              </span>
            </div>
            <button class="btn-icon"
              onclick="removeExFromProgram(${progId}, ${ex.id})">
              <i data-lucide="x"></i>
            </button>
          </div>
        `).join('')}
      </div>
    `).join('')

    lucide.createIcons()
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red)">${err.message}</p>`
  }
}

async function createProgram() {
  const name = document.getElementById('prog-name').value.trim()
  const goal = document.getElementById('prog-goal').value
  const days_per_week = parseInt(document.getElementById('prog-days').value)
  const description = document.getElementById('prog-desc').value.trim()

  if (!name || name.length < 3) {
    showErr('program-form-error', 'Name must be at least 3 characters')
    return
  }
  if (!days_per_week || days_per_week < 1 || days_per_week > 7) {
    showErr('program-form-error', 'Days per week must be 1-7')
    return
  }

  try {
    await api('/programs', 'POST', {
      name, goal, days_per_week,
      description: description || null
    })
    document.getElementById('prog-name').value = ''
    document.getElementById('prog-days').value = '3'
    document.getElementById('prog-desc').value = ''
    toggleForm('program-form')
    await loadPrograms()
  } catch (err) {
    showErr('program-form-error', err.message)
  }
}

async function activateProgram(id) {
  try {
    await api(`/programs/${id}/activate`, 'PATCH')
    await loadPrograms()
  } catch (err) {
    alert(err.message)
  }
}

async function addExToProgram(progId) {
  const exId = document.getElementById(`padd-ex-${progId}`).value
  const day = parseInt(document.getElementById(`padd-day-${progId}`).value)
  const sets = parseInt(document.getElementById(`padd-sets-${progId}`).value)
  const reps = parseInt(document.getElementById(`padd-reps-${progId}`).value)

  if (!exId) {
    showErr(`padd-err-${progId}`, 'Please select an exercise')
    return
  }
  if (!reps || reps < 1) {
    showErr(`padd-err-${progId}`, 'Please enter target reps')
    return
  }

  try {
    await api(`/programs/${progId}/exercises`, 'POST', {
      exercise_id: parseInt(exId),
      day_of_week: day, sets, target_reps: reps
    })
    document.getElementById(`padd-reps-${progId}`).value = ''
    hideErr(`padd-err-${progId}`)
    await loadProgExList(progId)
    // Program listesini de güncelle (egzersiz sayısı değişti)
    allPrograms = await api('/programs')
  } catch (err) {
    showErr(`padd-err-${progId}`, err.message)
  }
}

async function removeExFromProgram(progId, entryId) {
  if (!confirm('Remove this exercise?')) return
  try {
    await api(`/programs/${progId}/exercises/${entryId}`, 'DELETE')
    await loadProgExList(progId)
  } catch (err) {
    alert(err.message)
  }
}

async function deleteProgram(id, name) {
  if (!confirm(`Delete "${name}"?`)) return
  try {
    await api(`/programs/${id}`, 'DELETE')
    await loadPrograms()
  } catch (err) {
    alert(err.message)
  }
}

// ============================================
// WORKOUT
// ============================================

async function loadWorkoutTab() {
  if (activeSessionId) {
    document.getElementById('workout-select-program').classList.add('hidden')
    document.getElementById('active-workout').classList.remove('hidden')
    return
  }

  document.getElementById('workout-select-program').classList.remove('hidden')
  document.getElementById('active-workout').classList.add('hidden')

  const container = document.getElementById('workout-program-cards')

  try {
    const programs = await api('/programs')

    if (!programs.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No programs yet.</p>
          <button class="btn-primary" style="margin-top:12px"
            onclick="switchTrainingTab('programs',
              document.querySelector('.t-tab:first-child'))">
            Create Program
          </button>
        </div>
      `
      return
    }

    const goalLabels = {
      muscle_gain: 'Build Muscle', fat_loss: 'Burn Fat',
      strength: 'Strength', endurance: 'Endurance'
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
          <p style="color:var(--text-3); font-size:0.82rem">
            ${goalLabels[p.goal] || ''} ·
            ${p.days_per_week} days/week ·
            ${p.exercise_count || 0} exercises
          </p>
        </div>
        <i data-lucide="play-circle"></i>
      </div>
    `).join('')

    lucide.createIcons()
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`
  }
}

async function startWorkout(progId) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const session = await api('/sessions', 'POST', { session_date: today })
    activeSessionId = session.id

    const prog = await api(`/programs/${progId}`)

    document.getElementById('workout-select-program').classList.add('hidden')
    document.getElementById('active-workout').classList.remove('hidden')
    document.getElementById('workout-title').textContent = `💪 ${prog.name}`
    document.getElementById('workout-subtitle').textContent =
      new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      })

    workoutExercises = prog.exercises || []
    failureState = {}
    renderWorkoutExercises(workoutExercises)

    // Exercises yüklü değilse yükle (dropdown için)
    if (!allExercises.length) {
      allExercises = await api('/exercises')
    }
    fillExDropdown('manual-ex-select')
    lucide.createIcons()
  } catch (err) {
    alert(`Error: ${err.message}`)
  }
}

function renderWorkoutExercises(exercises) {
  const container = document.getElementById('workout-exercises')

  if (!exercises?.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No exercises in this program.</p>
        <button class="btn-secondary" style="margin-top:12px"
          onclick="switchTrainingTab('programs',
            document.querySelector('.t-tab:first-child'))">
          Add Exercises
        </button>
      </div>
    `
    return
  }

  container.innerHTML = exercises.map((ex, i) => `
    <div class="workout-ex-card">
      <h4>${ex.exercise_name}</h4>
      <div class="workout-ex-meta">
        <span class="badge badge-gold">${ex.muscle_group}</span>
        <span>${ex.sets} set · ${ex.target_reps} target reps</span>
      </div>

      <div class="workout-inputs">
        <div class="form-group">
          <label>Weight (kg)</label>
          <input type="number" id="w-kg-${i}"
            placeholder="0" step="0.5" min="0"
            oninput="checkOverload(${i})">
        </div>
        <div class="form-group">
          <label>Reps</label>
          <input type="number" id="w-rep-${i}"
            placeholder="${ex.target_reps}" min="1">
        </div>
        <div class="form-group">
          <label>Failure?</label>
          <div class="fail-toggle">
            <button class="fail-btn" id="fy-${i}"
              onclick="setFailure(${i}, true)">
              <i data-lucide="check-circle"></i> Yes
            </button>
            <button class="fail-btn" id="fn-${i}"
              onclick="setFailure(${i}, false)">
              <i data-lucide="x-circle"></i> No
            </button>
          </div>
        </div>
      </div>

      <div id="overload-${i}" class="overload-msg hidden"></div>
    </div>
  `).join('')

  // Önceki performansları yükle
  exercises.forEach((ex, i) => loadPrevPerf(i, ex.exercise_id))
  lucide.createIcons()
}

async function loadPrevPerf(index, exId) {
  try {
    const sessions = await api('/sessions')
    for (const s of sessions) {
      if (s.id === activeSessionId) continue
      const detail = await api(`/sessions/${s.id}`)
      const prev = detail.exercises?.find(e => e.exercise_id === exId)
      if (prev) {
        const input = document.getElementById(`w-kg-${index}`)
        if (input && !input.value) {
          input.value = prev.weight_kg
          input.dataset.prev = prev.weight_kg
          input.placeholder = `Prev: ${prev.weight_kg}kg`
        }
        return
      }
    }
  } catch {}
}

function setFailure(i, val) {
  failureState[i] = val
  document.getElementById(`fy-${i}`)
    .classList.toggle('yes-active', val)
  document.getElementById(`fn-${i}`)
    .classList.toggle('no-active', !val)
}

function checkOverload(i) {
  const input = document.getElementById(`w-kg-${i}`)
  const prev = parseFloat(input.dataset.prev)
  const curr = parseFloat(input.value)
  const msg = document.getElementById(`overload-${i}`)

  if (isNaN(prev) || isNaN(curr)) {
    msg.classList.add('hidden')
    return
  }

  if (curr > prev) {
    msg.className = 'overload-msg overload-up'
    msg.textContent = `⚡ +${(curr - prev).toFixed(1)}kg — Progressive overload!`
    msg.classList.remove('hidden')
  } else if (curr < prev) {
    msg.className = 'overload-msg overload-down'
    msg.textContent = `⚠️ Decreased from ${prev}kg — Push harder!`
    msg.classList.remove('hidden')
  } else {
    msg.classList.add('hidden')
  }
}

function setManualFailure(val, btn) {
  manualFailure = val
  document.querySelectorAll('#manual-ex-form .fail-btn')
    .forEach(b => b.classList.remove('yes-active', 'no-active'))
  btn.classList.add(val ? 'yes-active' : 'no-active')
}

async function addManualExercise() {
  const exId = document.getElementById('manual-ex-select').value
  const weight = parseFloat(document.getElementById('manual-weight').value)
  const reps = parseInt(document.getElementById('manual-reps').value)

  if (!exId) {
    showErr('manual-ex-error', 'Please select an exercise')
    return
  }
  if (!weight || weight <= 0) {
    showErr('manual-ex-error', 'Please enter valid weight')
    return
  }
  if (!reps || reps < 1) {
    showErr('manual-ex-error', 'Please enter valid reps')
    return
  }

  try {
    await api(`/sessions/${activeSessionId}/exercises`, 'POST', {
      exercise_id: parseInt(exId),
      weight_kg: weight,
      reps,
      reached_failure: manualFailure
    })

    document.getElementById('manual-ex-select').value = ''
    document.getElementById('manual-weight').value = ''
    document.getElementById('manual-reps').value = ''
    manualFailure = false
    document.querySelectorAll('#manual-ex-form .fail-btn')
      .forEach(b => b.classList.remove('yes-active', 'no-active'))
    toggleForm('manual-ex-form')
    alert('✅ Exercise added!')
  } catch (err) {
    showErr('manual-ex-error', err.message)
  }
}

async function finishWorkout() {
  if (!activeSessionId) return

  let logged = 0
  let skipped = 0

  for (let i = 0; i < workoutExercises.length; i++) {
    const ex = workoutExercises[i]
    const weight = parseFloat(document.getElementById(`w-kg-${i}`)?.value)
    const reps = parseInt(document.getElementById(`w-rep-${i}`)?.value)
    const failure = failureState[i] ?? false

    if (!weight || !reps) { skipped++; continue }

    try {
      await api(`/sessions/${activeSessionId}/exercises`, 'POST', {
        exercise_id: ex.exercise_id,
        weight_kg: weight,
        reps,
        reached_failure: failure
      })
      logged++
    } catch {}
  }

  activeSessionId = null
  workoutExercises = []
  failureState = {}

  document.getElementById('active-workout').classList.add('hidden')
  document.getElementById('workout-select-program').classList.remove('hidden')

  alert(`✅ Workout done!\n${logged} logged${skipped ? `, ${skipped} skipped` : ''}.`)
  lucide.createIcons()
}

async function cancelWorkout() {
  if (!confirm('Cancel workout? Session will be deleted.')) return
  try {
    if (activeSessionId) await api(`/sessions/${activeSessionId}`, 'DELETE')
  } catch {}

  activeSessionId = null
  workoutExercises = []
  failureState = {}

  document.getElementById('active-workout').classList.add('hidden')
  document.getElementById('workout-select-program').classList.remove('hidden')
  lucide.createIcons()
}

// ============================================
// CALENDAR
// ============================================

async function loadCalendar() {
  try {
    allSessions = await api('/sessions')
    renderCalendar()
  } catch (err) {
    console.error(err)
  }
}

function changeMonth(dir) {
  calDate = new Date(calDate.getFullYear(), calDate.getMonth() + dir, 1)
  renderCalendar()
}

function renderCalendar() {
  const year = calDate.getFullYear()
  const month = calDate.getMonth()

  document.getElementById('calendar-title').textContent =
    calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

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
    <div class="cal-grid">
      <div class="cal-day-name">Mon</div>
      <div class="cal-day-name">Tue</div>
      <div class="cal-day-name">Wed</div>
      <div class="cal-day-name">Thu</div>
      <div class="cal-day-name">Fri</div>
      <div class="cal-day-name">Sat</div>
      <div class="cal-day-name">Sun</div>
  `

  for (let i = 1; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    const hasWorkout = sessionDays.has(d)

    const cls = hasWorkout
      ? 'cal-day has-workout'
      : isToday ? 'cal-day today' : 'cal-day normal'

    html += `
      <div class="${cls}"
        ${hasWorkout
          ? `onclick="showDayDetail(${year},${month + 1},${d})"`
          : ''}>
        ${d}
        ${hasWorkout ? '<div class="cal-dot"></div>' : ''}
      </div>
    `
  }

  html += '</div>'
  document.getElementById('calendar-grid').innerHTML = html
}

async function showDayDetail(year, month, day) {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const container = document.getElementById('calendar-detail')

  const daySessions = allSessions.filter(s => s.session_date?.startsWith(dateStr))
  if (!daySessions.length) { container.innerHTML = ''; return }

  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

  try {
    const detail = await api(`/sessions/${daySessions[0].id}`)

    container.innerHTML = `
      <div class="form-card" style="margin-top:16px">
        <h3 style="margin-bottom:16px">
          ${new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
          })}
        </h3>
        ${detail.exercises?.length
          ? detail.exercises.map(ex => `
              <div style="display:flex; justify-content:space-between;
                align-items:center; padding:10px 0;
                border-bottom:1px solid var(--border)">
                <div>
                  <p style="font-weight:500; font-size:0.9rem">
                    ${ex.exercise_name}
                  </p>
                  <p style="color:var(--text-3); font-size:0.8rem">
                    ${ex.weight_kg}kg × ${ex.reps} reps
                  </p>
                </div>
                <span class="badge ${ex.reached_failure ? 'badge-green' : ''}">
                  ${ex.reached_failure ? 'Failure ✓' : 'No failure'}
                </span>
              </div>
            `).join('')
          : '<p style="color:var(--text-3)">No exercises logged.</p>'
        }
      </div>
    `
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red)">${err.message}</p>`
  }
}

// ============================================
// AI COACH
// ============================================

function toggleDay(btn) {
  const day = parseInt(btn.dataset.day)
  if (selectedDays.includes(day)) {
    selectedDays = selectedDays.filter(d => d !== day)
    btn.classList.remove('selected')
  } else {
    selectedDays.push(day)
    btn.classList.add('selected')
  }
}

async function getAISuggestion() {
  const days_per_week = parseInt(document.getElementById('ai-days').value)
  const goal = document.getElementById('ai-goal').value
  const experience_level = ai.ai_exp
  const equipment = ai.ai_eq
  const injuries = document.getElementById('ai-injuries').value.trim()

  // Validasyon
  if (!days_per_week || days_per_week < 1 || days_per_week > 7) {
    showErr('ai-error', 'Please enter valid days per week (1-7)')
    return
  }
  if (!experience_level) {
    showErr('ai-error', 'Please select your experience level')
    return
  }
  if (!equipment) {
    showErr('ai-error', 'Please select available equipment')
    return
  }

  const btn = document.getElementById('ai-generate-btn')
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>'
  btn.disabled = true
  hideErr('ai-error')
  document.getElementById('ai-result').classList.add('hidden')

  try {
    const result = await api('/ai/workout-suggestion', 'POST', {
      days_per_week,
      available_days: selectedDays.length > 0 ? selectedDays : null,
      goal,
      experience_level,
      equipment,
      injuries: injuries || null
    })

    // Sonucu göster
    // \n karakterlerini <br> yap, okunabilir olsun
    document.getElementById('ai-response-text').innerHTML =
      result.suggestion
        .replace(/\n/g, '<br>')
        .replace(/═+/g, '<hr style="border-color:var(--border);margin:12px 0">')

    // Program adı öner
    const goalLabels = {
      muscle_gain: 'Muscle Gain', fat_loss: 'Fat Loss',
      weight_loss: 'Weight Loss', strength: 'Strength',
      endurance: 'Endurance'
    }
    document.getElementById('ai-save-name').value =
      `AI ${goalLabels[goal] || goal} Program`

    document.getElementById('ai-result').classList.remove('hidden')
    document.getElementById('ai-result').scrollIntoView({ behavior: 'smooth' })

  } catch (err) {
    if (err.message.includes('Profile not found')) {
      showErr('ai-error',
        'Please create your profile first. Go to Dashboard and complete onboarding.'
      )
    } else {
      showErr('ai-error', err.message)
    }
  } finally {
    btn.innerHTML = '<i data-lucide="sparkles"></i> Generate My Plan'
    btn.disabled = false
    lucide.createIcons()
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

  const btn = document.getElementById('ai-save-btn')
  btn.textContent = 'Saving...'
  btn.disabled = true

  try {
    await api('/ai/workout-suggestion/save', 'POST', {
      name,
      days_per_week,
      goal,
      description: 'Generated by Gemini AI — HIT style'
    })

    btn.innerHTML = '<i data-lucide="check"></i> Saved!'
    btn.style.background = 'var(--green)'

    // 2 saniye sonra Training'e git
    setTimeout(() => {
      showView('training')
      btn.innerHTML = '<i data-lucide="save"></i> Save Program'
      btn.disabled = false
      btn.style.background = ''
      lucide.createIcons()
    }, 2000)

  } catch (err) {
    alert(`Error: ${err.message}`)
    btn.innerHTML = '<i data-lucide="save"></i> Save Program'
    btn.disabled = false
    lucide.createIcons()
  }
}