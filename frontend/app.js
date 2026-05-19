// ============================================================
// HIT TRACKER — app.js
// ============================================================

const API = 'http://localhost:3000/api'

// ── STATE ────────────────────────────────────────────────────
const obChoices = { gender: null, activity: null, goal: null }
const aiChoices = { ai_exp: null, ai_eq: null }
let selectedDays     = []
let obStep           = 1
const OB_TOTAL       = 5
let allExercises     = []
let activeFilter     = 'all'
let editingExId      = null
let allPrograms      = []
let allSessions      = []
let activeSessionId  = null
let workoutExercises = []
let failureState     = {}
let confirmCallback  = null
let savedAIProgramId = null

// ── API ──────────────────────────────────────────────────────
async function api(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token')
  const opts  = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }
  if (body) opts.body = JSON.stringify(body)
  const res  = await fetch(`${API}${endpoint}`, opts)
  const data = await res.json()
  if (!res.ok) {
    const msg = data.errors ? data.errors.join(', ') : (data.error || 'Error')
    throw new Error(msg)
  }
  return data
}

// ── VIEW ─────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'))
  document.getElementById(`${name}-view`).classList.remove('hidden')
  document.querySelectorAll('.nav-links button[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name)
  })
  if (name === 'dashboard') loadDashboard()
  if (name === 'exercises') loadExercises()
  if (name === 'training')  loadTraining()
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

// ── TOAST ────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: 'check-circle', error: 'x-circle', info: 'info' }
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.innerHTML = `<i data-lucide="${icons[type]}"></i><p>${message}</p>`
  document.getElementById('toast-container').appendChild(toast)
  lucide.createIcons()
  setTimeout(() => {
    toast.style.opacity   = '0'
    toast.style.transform = 'translateX(110%)'
    toast.style.transition = 'all 0.3s ease'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

// ── CONFIRM MODAL ────────────────────────────────────────────
function showConfirm(title, message, onOk, okText = 'Delete', okType = 'danger') {
  document.getElementById('confirm-title').textContent   = title
  document.getElementById('confirm-message').textContent = message
  const btn       = document.getElementById('confirm-ok-btn')
  btn.textContent = okText
  btn.className   = okType === 'danger' ? 'btn-ghost-danger' : 'btn-primary'
  document.getElementById('confirm-modal').classList.remove('hidden')
  confirmCallback = onOk
  lucide.createIcons()
}

function confirmOk() {
  document.getElementById('confirm-modal').classList.add('hidden')
  if (confirmCallback) confirmCallback()
  confirmCallback = null
}

function confirmCancel() {
  document.getElementById('confirm-modal').classList.add('hidden')
  confirmCallback = null
}

// ── INIT ─────────────────────────────────────────────────────
async function init() {
  const token = localStorage.getItem('token')
  if (!token) { showView('auth'); return }
  try {
    await api('/calories/profile')
    document.getElementById('navbar').classList.remove('hidden')
    const u = localStorage.getItem('username')
    if (u) document.getElementById('dash-username').textContent = u
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

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); confirmCancel() }
})

document.addEventListener('click', e => {
  if (!e.target.closest('[id^="psearch-"]') && !e.target.closest('[id^="pdrop-"]')) {
    document.querySelectorAll('[id^="pdrop-"]').forEach(d => d.classList.add('hidden'))
  }
})

// ── AUTH ─────────────────────────────────────────────────────
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
    document.getElementById('navbar').classList.add('hidden')
    showView('onboarding')
  } catch (err) { showErr('register-error', err.message) }
}

function logout() {
  localStorage.clear()
  document.getElementById('navbar').classList.add('hidden')
  showView('auth')
}

// ── ONBOARDING ───────────────────────────────────────────────
function selectChoice(group, value, el) {
  el.parentElement.querySelectorAll('.choice-card,.activity-card,.goal-card')
    .forEach(e => e.classList.remove('selected'))
  el.classList.add('selected')
  if (group in obChoices) obChoices[group] = value
  else if (group in aiChoices) aiChoices[group] = value
}

async function obNext() {
  const err = validateObStep(obStep)
  if (err) { showErr('onboarding-error', err); return }
  hideErr('onboarding-error')
  if (obStep === 4) buildSummary()
  document.getElementById(`step-${obStep}`).classList.add('hidden')
  obStep++
  document.getElementById(`step-${obStep}`).classList.remove('hidden')
  updateObProgress()
  lucide.createIcons()
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
  if (obStep === 1) document.getElementById('ob-back').classList.add('hidden')
}

function updateObProgress() {
  document.getElementById('progress-fill').style.width = `${(obStep / OB_TOTAL) * 100}%`
  document.getElementById('step-current').textContent  = obStep
}

function validateObStep(step) {
  if (step === 1) {
    const val = document.getElementById('ob-birthdate').value
    if (!val) return 'Please enter your date of birth'
    const birth = new Date(val), today = new Date()
    if (birth > today) return 'Birth date cannot be in the future'
    if (birth.getFullYear() < 1900) return 'Invalid birth year'
    let age = today.getFullYear() - birth.getFullYear()
    const passed = today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
    if (!passed) age--
    if (age < 13) return 'Must be at least 13 years old'
    if (age > 100) return 'Invalid birth date'
    if (!obChoices.gender) return 'Please select your gender'
  }
  if (step === 2) {
    const h = document.getElementById('ob-height').value
    const w = document.getElementById('ob-weight').value
    if (!h) return 'Please enter height'
    if (!w) return 'Please enter weight'
    if (h < 100 || h > 250) return 'Height must be 100-250 cm'
    if (w < 30  || w > 300) return 'Weight must be 30-300 kg'
  }
  if (step === 3 && !obChoices.activity) return 'Please select activity level'
  if (step === 4 && !obChoices.goal)     return 'Please select your goal'
  return null
}

function buildSummary() {
  const birth  = document.getElementById('ob-birthdate').value
  const height = document.getElementById('ob-height').value
  const weight = document.getElementById('ob-weight').value
  const bd     = new Date(birth), today = new Date()
  let age = today.getFullYear() - bd.getFullYear()
  const passed = today.getMonth() > bd.getMonth() ||
    (today.getMonth() === bd.getMonth() && today.getDate() >= bd.getDate())
  if (!passed) age--
  const actLabels  = { sedentary:'Sedentary', light:'Light', moderate:'Moderate', active:'Active', very_active:'Very Active' }
  const goalLabels = { muscle_gain:'Build Muscle', fat_loss:'Burn Fat', strength:'Get Stronger', endurance:'Endurance' }
  document.getElementById('profile-summary').innerHTML = `
    <div class="summary-item"><label>Age</label><span>${age} years</span></div>
    <div class="summary-item"><label>Gender</label><span>${obChoices.gender}</span></div>
    <div class="summary-item"><label>Height</label><span>${height} cm</span></div>
    <div class="summary-item"><label>Weight</label><span>${weight} kg</span></div>
    <div class="summary-item"><label>Activity</label><span>${actLabels[obChoices.activity]}</span></div>
    <div class="summary-item"><label>Goal</label><span>${goalLabels[obChoices.goal]}</span></div>
  `
  const mults  = { sedentary:1.20, light:1.375, moderate:1.55, active:1.725, very_active:1.90 }
  const adjs   = { muscle_gain:400, fat_loss:-500, strength:0, endurance:0 }
  const bmr    = (10 * weight) + (6.25 * height) - (5 * age) + (obChoices.gender === 'male' ? 5 : -161)
  const target = Math.round(bmr * mults[obChoices.activity]) + adjs[obChoices.goal]
  document.getElementById('calorie-preview').innerHTML = `
    <div class="big-num">${target}</div>
    <p>kcal / day for <strong>${goalLabels[obChoices.goal]}</strong></p>
  `
}

async function obFinish() {
  const btn = document.getElementById('ob-finish')
  btn.textContent = 'Saving...'
  btn.disabled    = true
  try {
    await api('/calories/profile', 'POST', {
      birth_date:     document.getElementById('ob-birthdate').value,
      weight_kg:      parseFloat(document.getElementById('ob-weight').value),
      height_cm:      parseFloat(document.getElementById('ob-height').value),
      gender:         obChoices.gender,
      activity_level: obChoices.activity
    })
    document.getElementById('navbar').classList.remove('hidden')
    document.getElementById('dash-username').textContent = localStorage.getItem('username')
    showView('dashboard')
  } catch (err) {
    btn.textContent = 'Start Training'
    btn.disabled    = false
    showErr('onboarding-error', err.message)
  }
}

// ── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  const u = localStorage.getItem('username')
  if (u) document.getElementById('dash-username').textContent = u

  const [quoteRes, sessionsRes, exercisesRes, programsRes, profileRes] =
    await Promise.allSettled([
      api('/quotes/random'),
      api('/sessions'),
      api('/exercises'),
      api('/programs'),
      api('/calories/profile')
    ])

  if (quoteRes.status === 'fulfilled') {
    const q = quoteRes.value
    document.getElementById('daily-quote').innerHTML =
      `<em>"${q.quote}"</em> <strong>— ${q.author}</strong>`
  }
  if (sessionsRes.status === 'fulfilled') {
    document.getElementById('stat-sessions').textContent = sessionsRes.value.length
    renderRecentSessions(sessionsRes.value.slice(0, 3))
  }
  if (exercisesRes.status === 'fulfilled') {
    document.getElementById('stat-exercises').textContent = exercisesRes.value.length
  }
  if (programsRes.status === 'fulfilled') {
    const programs = programsRes.value
    document.getElementById('stat-programs').textContent = programs.length
    renderActiveProgram(programs.find(p => p.is_active))
  }
  if (profileRes.status === 'fulfilled') {
    const report = profileRes.value.report
    if (report) {
      document.getElementById('stat-calories').textContent = report.target_calories
      renderCalorieWidget(report)
    }
  }
}

function renderCalorieWidget(report) {
  const widget = document.getElementById('calorie-widget')
  widget.classList.remove('hidden')
  widget.innerHTML = `
    <div class="calorie-widget-header">
      <div>
        <h3>Daily Nutrition</h3>
        <p style="color:var(--text-3);font-size:0.78rem;margin-top:2px">Based on your profile</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="badge badge-gold">${(report.goal || 'maintenance').replace('_',' ').toUpperCase()}</span>
        <button class="btn-secondary" style="font-size:0.78rem;padding:6px 12px"
          onclick="toggleForm('nutrition-edit')">
          <i data-lucide="pencil"></i> Edit
        </button>
      </div>
    </div>
    <div id="nutrition-edit" class="hidden" style="margin-bottom:20px;padding:16px;
      background:var(--bg-3);border-radius:var(--radius-sm);border:1px solid var(--border)">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;align-items:end">
        <div class="form-group" style="margin-bottom:0">
          <label>Weight (kg)</label>
          <input type="number" id="edit-weight" value="${report.profile?.weight_kg || ''}" min="30" max="300" step="0.1">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Goal</label>
          <select id="edit-goal">
            <option value="muscle_gain" ${report.goal==='muscle_gain'?'selected':''}>Build Muscle</option>
            <option value="fat_loss"    ${report.goal==='fat_loss'?'selected':''}>Burn Fat</option>
            <option value="strength"    ${report.goal==='strength'?'selected':''}>Strength</option>
            <option value="endurance"   ${report.goal==='endurance'?'selected':''}>Endurance</option>
          </select>
        </div>
        <button class="btn-primary" style="height:40px" onclick="updateNutrition()">
          <i data-lucide="refresh-cw"></i> Recalculate
        </button>
      </div>
    </div>
    <div class="calorie-widget-grid">
      <div class="cal-stat main">
        <label>Target Calories</label>
        <span class="cal-num">${report.target_calories}</span>
        <small>kcal / day</small>
      </div>
      <div class="cal-stat">
        <label>Protein</label>
        <span class="cal-num protein">${report.macros?.protein_g}g</span>
        <small>${Math.round((report.macros?.protein_g || 0) * 4)} kcal</small>
      </div>
      <div class="cal-stat">
        <label>Carbs</label>
        <span class="cal-num carbs">${report.macros?.carbs_g}g</span>
        <small>${Math.round((report.macros?.carbs_g || 0) * 4)} kcal</small>
      </div>
      <div class="cal-stat">
        <label>Fat</label>
        <span class="cal-num fat">${report.macros?.fat_g}g</span>
        <small>${Math.round((report.macros?.fat_g || 0) * 9)} kcal</small>
      </div>
      <div class="cal-stat">
        <label>BMR</label>
        <span class="cal-num">${report.bmr}</span>
        <small>base rate</small>
      </div>
    </div>
    ${report.summary ? `<p class="cal-summary">${report.summary}</p>` : ''}
  `
  lucide.createIcons()
}

async function updateNutrition() {
  const weight = parseFloat(document.getElementById('edit-weight').value)
  const goal   = document.getElementById('edit-goal').value
  if (!weight || weight < 30 || weight > 300) { showToast('Weight must be 30-300 kg', 'error'); return }
  try {
    const profile = await api('/calories/profile')
    await api('/calories/profile', 'POST', {
      birth_date:     profile.profile.birth_date,
      height_cm:      profile.profile.height_cm,
      gender:         profile.profile.gender,
      activity_level: profile.profile.activity_level,
      weight_kg:      weight
    })
    const updated = await api(`/calories/profile?goal=${goal}`)
    updated.report.goal    = goal
    updated.report.profile = updated.profile
    renderCalorieWidget(updated.report)
    document.getElementById('stat-calories').textContent = updated.report.target_calories
    showToast('Nutrition updated!', 'success')
  } catch (err) { showToast(err.message, 'error') }
}

function renderRecentSessions(sessions) {
  const el = document.getElementById('recent-sessions')
  if (!sessions?.length) {
    el.innerHTML = '<div class="empty-state"><p>No sessions yet</p></div>'
    return
  }
  el.innerHTML = sessions.map(s => `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <p style="font-weight:500;font-size:0.9rem">${formatDate(s.session_date)}</p>
        <p style="color:var(--text-3);font-size:0.78rem">
          ${s.program_name || 'Manual'} · ${s.exercise_count || 0} exercises
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
        <p>No active program</p>
        <button class="btn-primary" style="margin-top:12px" onclick="showView('training')">
          Create Program
        </button>
      </div>
    `
    return
  }
  el.innerHTML = `
    <div style="padding:14px;background:var(--bg-3);border-radius:var(--radius-sm);border:1px solid var(--gold-border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h4 style="font-size:0.92rem">${program.name}</h4>
        <span class="badge badge-active">Active</span>
      </div>
      <p style="color:var(--text-3);font-size:0.8rem;margin-bottom:12px">
        ${program.exercise_count || 0} exercises
      </p>
      <button class="btn-primary" style="font-size:0.82rem;padding:8px 14px" onclick="goToWorkout()">
        <i data-lucide="play"></i> Start Workout
      </button>
    </div>
  `
  lucide.createIcons()
}

function goToWorkout() {
  showView('training')
  setTimeout(() => {
    document.querySelectorAll('.t-content').forEach(t => t.classList.add('hidden'))
    document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'))
    document.getElementById('tab-workout').classList.remove('hidden')
    document.querySelectorAll('.t-tab')[1]?.classList.add('active')
    loadWorkoutTab()
    loadHistory()
  }, 100)
}

function formatDate(str) {
  if (!str) return '—'
  const parts = str.split('T')[0].split('-')
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    .toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
}

// ── EXERCISES ────────────────────────────────────────────────
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
  const muscles   = [...new Set(allExercises.map(e => e.muscle_group))].sort()
  const container = document.getElementById('muscle-filters')
  container.innerHTML = `
    <button class="filter-btn active" onclick="filterBy('all',this)">All (${allExercises.length})</button>
    ${muscles.map(m => `
      <button class="filter-btn" onclick="filterBy('${m}',this)">
        ${m} (${allExercises.filter(e => e.muscle_group === m).length})
      </button>
    `).join('')}
    <button class="filter-btn" onclick="filterBy('custom',this)">My Exercises</button>
  `
}

function filterBy(filter, btn) {
  activeFilter = filter
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  applyFilters()
}

function applyFilters() {
  const q = document.getElementById('exercise-search')?.value.toLowerCase().trim() || ''
  let list = allExercises
  if (activeFilter === 'custom')   list = list.filter(e => e.is_custom)
  else if (activeFilter !== 'all') list = list.filter(e => e.muscle_group === activeFilter)
  if (q) list = list.filter(e =>
    e.name.toLowerCase().includes(q) || e.muscle_group.toLowerCase().includes(q)
  )
  renderExercises(list)
}

function renderExercises(list) {
  const container = document.getElementById('exercise-list')
  if (!list.length) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>No exercises found.</p></div>'
    return
  }
  container.innerHTML = list.map(ex => `
    <div class="ex-card" onclick="openExModal(${ex.id})">
      <div class="ex-card-img">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5">
          <path d="M6 4v16M18 4v16M4 8h4M16 8h4M4 16h4M16 16h4"/>
        </svg>
      </div>
      <div class="ex-card-body">
        <h4>${ex.name}</h4>
        <div class="ex-card-meta">
          <span class="badge badge-gold">${ex.muscle_group}</span>
          ${ex.is_custom ? '<span class="badge badge-green">Custom</span>' : ''}
        </div>
      </div>
    </div>
  `).join('')
}

function openExModal(id) {
  const ex = allExercises.find(e => e.id === id)
  if (!ex) return
  const tips = {
    Chest:'One set to failure is worth more than ten half-hearted sets.',
    Back:'One all-out set of rows or pulldowns is all you need.',
    Shoulders:'Overhead pressing to failure — brief, intense, infrequent.',
    Biceps:'Curls taken to absolute failure — your biceps will have no choice but to grow.',
    Triceps:'One set to failure is your ticket to growth.',
    Quadriceps:'Squats to failure are brutally hard. That is exactly why they work.',
    Hamstrings:'Romanian deadlifts to failure — feel every fiber working.',
    Glutes:'Hip thrusts to failure build the most powerful muscles in your body.',
    Abs:'Brief, intense work and adequate rest — same rules apply.',
    Calves:'Take them to absolute failure — no mercy.',
    Traps:'Heavy shrugs to failure. Simple, brutal, effective.',
    Forearms:'Wrist curls to failure — often neglected, always rewarded.'
  }
  const tip = tips[ex.muscle_group] || 'Train with maximum intensity. One set to failure. Then rest and grow.'
  const secondaryHtml = ex.secondary_muscles?.length
    ? `<div style="margin-bottom:16px">
        <p style="font-size:0.7rem;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Secondary</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${ex.secondary_muscles.map(m =>
            `<span class="badge" style="background:var(--bg-3);color:var(--text-2);border:1px solid var(--border-2)">${m}</span>`
          ).join('')}
        </div>
      </div>` : ''
  const instructionsHtml = ex.instructions?.length
    ? `<div style="margin-bottom:16px">
        <p style="font-size:0.7rem;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">How to Perform</p>
        <ol class="instructions-list">${ex.instructions.map(s => `<li>${s}</li>`).join('')}</ol>
      </div>` : ''
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-content-body">
      <h2 class="modal-title">${ex.name}</h2>
      <div class="modal-badges">
        <span class="badge badge-gold">${ex.muscle_group}</span>
        ${ex.equipment ? `<span class="badge badge-gold">${ex.equipment}</span>` : ''}
        ${ex.level     ? `<span class="badge badge-gold">${ex.level}</span>`     : ''}
        ${ex.is_custom ? '<span class="badge badge-green">Custom</span>'          : ''}
      </div>
      <div class="modal-stats">
        <div class="modal-stat"><label>Equipment</label><span>${ex.equipment || 'Bodyweight'}</span></div>
        <div class="modal-stat"><label>Level</label><span>${ex.level || 'All'}</span></div>
        <div class="modal-stat"><label>Rest Days</label><span>${ex.required_rest_days}d</span></div>
      </div>
      <div class="mentzer-tip">⚡ <strong>Mentzer:</strong> "${tip}"</div>
      ${secondaryHtml}
      ${instructionsHtml}
      ${ex.is_custom ? `
        <div style="display:flex;gap:10px;margin-top:20px;padding-top:20px;border-top:1px solid var(--border)">
          <button class="btn-secondary" onclick="startEditExercise(${ex.id});closeModal()">Edit</button>
          <button class="btn-ghost-danger" onclick="deleteExercise(${ex.id},'${ex.name.replace(/'/g,"\\'")}');closeModal()">Delete</button>
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

async function createExercise() {
  const name               = document.getElementById('ex-name').value.trim()
  const muscle_group       = document.getElementById('ex-muscle').value
  const description        = document.getElementById('ex-desc').value.trim()
  const required_rest_days = parseInt(document.getElementById('ex-rest').value)
  if (!name || name.length < 2)      { showErr('exercise-form-error', 'Name min 2 chars'); return }
  if (!muscle_group)                  { showErr('exercise-form-error', 'Select muscle group'); return }
  if (!required_rest_days || required_rest_days < 3) { showErr('exercise-form-error', 'Rest days min 3'); return }
  try {
    if (editingExId) {
      await api(`/exercises/${editingExId}`, 'PUT', { name, muscle_group, description, required_rest_days })
      showToast('Exercise updated!', 'success')
    } else {
      await api('/exercises', 'POST', { name, muscle_group, description, required_rest_days })
      showToast('Exercise created!', 'success')
    }
    cancelExForm()
    await loadExercises()
  } catch (err) { showErr('exercise-form-error', err.message) }
}

function startEditExercise(id) {
  const ex = allExercises.find(e => e.id === id)
  if (!ex) return
  editingExId = id
  document.getElementById('exercise-form').classList.remove('hidden')
  document.getElementById('ex-name').value   = ex.name
  document.getElementById('ex-muscle').value = ex.muscle_group
  document.getElementById('ex-desc').value   = ex.description || ''
  document.getElementById('ex-rest').value   = ex.required_rest_days
  document.querySelector('#exercise-form h3').textContent = 'Edit Exercise'
  document.getElementById('ex-save-btn').innerHTML = 'Update'
  document.getElementById('exercise-form').scrollIntoView({ behavior:'smooth' })
}

function cancelExForm() {
  editingExId = null
  document.getElementById('ex-name').value   = ''
  document.getElementById('ex-muscle').value = ''
  document.getElementById('ex-desc').value   = ''
  document.getElementById('ex-rest').value   = '5'
  document.querySelector('#exercise-form h3').textContent = 'Add Custom Exercise'
  document.getElementById('ex-save-btn').innerHTML = '<i data-lucide="save"></i> Save'
  document.getElementById('exercise-form').classList.add('hidden')
  hideErr('exercise-form-error')
  lucide.createIcons()
}

function deleteExercise(id, name) {
  showConfirm('Delete Exercise', `Delete "${name}"?`, async () => {
    try { await api(`/exercises/${id}`, 'DELETE'); await loadExercises(); showToast('Deleted.', 'info') }
    catch (err) { showToast(err.message, 'error') }
  })
}

// ── TRAINING ─────────────────────────────────────────────────
async function loadTraining() {
  await loadPrograms()
}

function switchTrainingTab(name, btn) {
  document.querySelectorAll('.t-content').forEach(t => t.classList.add('hidden'))
  document.querySelectorAll('.t-tab').forEach(t    => t.classList.remove('active'))
  document.getElementById(`tab-${name}`).classList.remove('hidden')
  if (btn) btn.classList.add('active')
  if (name === 'programs') loadPrograms()
  if (name === 'workout')  { loadWorkoutTab(); loadHistory() }
}

// ── PROGRAMS ─────────────────────────────────────────────────
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
    container.innerHTML = '<div class="empty-state"><p>No programs yet. Create your first!</p></div>'
    return
  }
  container.innerHTML = programs.map(p => `
    <div class="program-card ${p.is_active ? 'is-active' : ''}">
      <div class="program-card-header">
        <div>
          <h3>
            ${p.name}
            ${p.is_active ? '<span class="badge badge-active" style="margin-left:8px">Active</span>' : ''}
          </h3>
          <p style="color:var(--text-3);font-size:0.8rem;margin-top:4px">${p.exercise_count || 0} exercises</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="${p.is_active ? 'btn-active-prog' : 'btn-secondary'}"
            style="font-size:0.78rem;padding:6px 12px"
            onclick="event.stopPropagation(); activateProgram(${p.id})">
            ${p.is_active
              ? '<i data-lucide="check-circle"></i> Active'
              : '<i data-lucide="circle"></i> Set Active'}
          </button>
          <button class="btn-icon edit"
            onclick="event.stopPropagation(); toggleProgDetail(${p.id})">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-icon"
            onclick="event.stopPropagation(); deleteProgram(${p.id},'${p.name.replace(/'/g,"\\'")}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <div id="prog-detail-${p.id}" class="hidden">
        <div class="program-card-body">
          <h4 style="color:var(--gold);margin-bottom:14px;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px">
            Add Exercise
          </h4>
          <div class="form-group">
            <label>Exercise</label>
            <div style="position:relative">
              <input type="text" id="psearch-${p.id}"
                placeholder="Type to search exercise..."
                oninput="searchProgEx('${p.id}')"
                autocomplete="off">
              <input type="hidden" id="padd-ex-${p.id}">
              <div id="pdrop-${p.id}" class="ex-dropdown hidden"></div>
            </div>
          </div>
          <div class="two-col">
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
            <div class="form-group">
              <label>Sets</label>
              <input type="number" id="padd-sets-${p.id}" value="1" min="1" max="10">
            </div>
          </div>
          <div class="form-group">
            <label>Target Reps</label>
            <input type="number" id="padd-reps-${p.id}" placeholder="8" min="1">
          </div>
          <div id="padd-err-${p.id}" class="error-msg hidden"></div>
          <button class="btn-primary" onclick="addExToProgram(${p.id})">
            <i data-lucide="plus"></i> Add Exercise
          </button>
          <div id="padd-list-${p.id}" style="margin-top:20px"></div>
        </div>
      </div>
    </div>
  `).join('')
  lucide.createIcons()
}

function searchProgEx(progId) {
  const q    = document.getElementById(`psearch-${progId}`).value.toLowerCase()
  const drop = document.getElementById(`pdrop-${progId}`)
  if (!q || q.length < 2) { drop.classList.add('hidden'); return }
  const filtered = allExercises
    .filter(e => e.name.toLowerCase().includes(q) || e.muscle_group.toLowerCase().includes(q))
    .slice(0, 8)
  if (!filtered.length) {
    drop.innerHTML = '<div style="padding:12px;color:var(--text-3);font-size:0.85rem;text-align:center">No results</div>'
    drop.classList.remove('hidden')
    return
  }
  drop.innerHTML = filtered.map(e => `
    <div onclick="pickProgEx('${progId}',${e.id},'${e.name.replace(/'/g,"\\'")} (${e.muscle_group})')"
      style="display:flex;justify-content:space-between;align-items:center;
        padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s">
      <span style="font-size:0.88rem;color:var(--text)">${e.name}</span>
      <span class="badge badge-gold" style="font-size:0.65rem">${e.muscle_group}</span>
    </div>
  `).join('')
  drop.classList.remove('hidden')
}

function pickProgEx(progId, exId, label) {
  document.getElementById(`padd-ex-${progId}`).value = exId
  document.getElementById(`psearch-${progId}`).value = label
  document.getElementById(`pdrop-${progId}`).classList.add('hidden')
}

async function toggleProgDetail(id) {
  const detail   = document.getElementById(`prog-detail-${id}`)
  const isHidden = detail.classList.contains('hidden')
  document.querySelectorAll('[id^="prog-detail-"]').forEach(d => d.classList.add('hidden'))
  if (isHidden) {
    detail.classList.remove('hidden')
    if (!allExercises.length) allExercises = await api('/exercises')
    await loadProgExList(id)
    lucide.createIcons()
  }
}

async function loadProgExList(progId) {
  const container = document.getElementById(`padd-list-${progId}`)
  try {
    const prog = await api(`/programs/${progId}`)
    if (!prog.exercises?.length) {
      container.innerHTML = '<p style="color:var(--text-3);font-size:0.85rem">No exercises yet.</p>'
      return
    }
    const days = { 1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',7:'Sun' }
    const byDay = {}
    prog.exercises.forEach(ex => {
      if (!byDay[ex.day_of_week]) byDay[ex.day_of_week] = []
      byDay[ex.day_of_week].push(ex)
    })
    container.innerHTML = Object.keys(byDay).sort().map(day => `
      <div class="day-col" style="margin-bottom:14px">
        <h4>${days[day]}</h4>
        ${byDay[day].map(ex => `
          <div class="day-ex-item">
            <div>
              <strong style="font-size:0.85rem">${ex.exercise_name}</strong>
              <span style="margin-left:6px">${ex.sets}×${ex.target_reps}</span>
            </div>
            <button class="btn-icon" onclick="removeExFromProgram(${progId},${ex.id})">
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
  if (!name || name.length < 3) { showErr('program-form-error', 'Name min 3 chars'); return }
  try {
    await api('/programs', 'POST', { name, goal:'strength', days_per_week:3 })
    document.getElementById('prog-name').value = ''
    toggleForm('program-form')
    await loadPrograms()
    showToast('Program created!', 'success')
  } catch (err) { showErr('program-form-error', err.message) }
}

async function activateProgram(id) {
  try {
    await api(`/programs/${id}/activate`, 'PATCH')
    await loadPrograms()
    showToast('Program activated!', 'success')
  } catch (err) { showToast(err.message, 'error') }
}

async function addExToProgram(progId) {
  const exId = document.getElementById(`padd-ex-${progId}`).value
  const day  = parseInt(document.getElementById(`padd-day-${progId}`).value)
  const sets = parseInt(document.getElementById(`padd-sets-${progId}`).value)
  const reps = parseInt(document.getElementById(`padd-reps-${progId}`).value)
  if (!exId) { showErr(`padd-err-${progId}`, 'Please select an exercise'); return }
  if (!reps || reps < 1) { showErr(`padd-err-${progId}`, 'Please enter reps'); return }
  try {
    await api(`/programs/${progId}/exercises`, 'POST', {
      exercise_id: parseInt(exId), day_of_week:day, sets, target_reps:reps
    })
    document.getElementById(`psearch-${progId}`).value = ''
    document.getElementById(`padd-ex-${progId}`).value = ''
    document.getElementById(`padd-reps-${progId}`).value = ''
    hideErr(`padd-err-${progId}`)
    await loadProgExList(progId)
  } catch (err) { showErr(`padd-err-${progId}`, err.message) }
}

function removeExFromProgram(progId, entryId) {
  showConfirm('Remove Exercise', 'Remove from program?', async () => {
    try { await api(`/programs/${progId}/exercises/${entryId}`, 'DELETE'); await loadProgExList(progId); showToast('Removed.', 'info') }
    catch (err) { showToast(err.message, 'error') }
  }, 'Remove', 'danger')
}

function deleteProgram(id, name) {
  showConfirm('Delete Program', `Delete "${name}"?`, async () => {
    try { await api(`/programs/${id}`, 'DELETE'); await loadPrograms(); showToast('Deleted.', 'info') }
    catch (err) { showToast(err.message, 'error') }
  })
}

// ── WORKOUT ──────────────────────────────────────────────────
async function loadWorkoutTab() {
  if (activeSessionId) {
    document.getElementById('workout-start').classList.add('hidden')
    document.getElementById('active-workout').classList.remove('hidden')
    return
  }
  document.getElementById('workout-start').classList.remove('hidden')
  document.getElementById('active-workout').classList.add('hidden')
  const container = document.getElementById('active-prog-info')
  try {
    const programs = await api('/programs')
    const active   = programs.find(p => p.is_active)
    if (!active) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No active program.</p>
          <button class="btn-primary" style="margin-top:12px"
            onclick="switchTrainingTab('programs',document.querySelector('.t-tab'))">
            Create Program
          </button>
        </div>
      `
      lucide.createIcons()
      return
    }
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="margin-bottom:4px">${active.name}</h3>
          <p style="color:var(--text-3);font-size:0.82rem">${active.exercise_count || 0} exercises</p>
        </div>
        <button class="btn-primary" onclick="startWorkout(${active.id})">
          <i data-lucide="play"></i> Start
        </button>
      </div>
    `
    lucide.createIcons()
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red)">${err.message}</p>`
  }
}

async function startWorkout(progId) {
  try {
    const today = new Date()
    const session_date = [
      today.getFullYear(),
      String(today.getMonth()+1).padStart(2,'0'),
      String(today.getDate()).padStart(2,'0')
    ].join('-')
    const session = await api('/sessions', 'POST', { session_date, program_id:progId })
    activeSessionId = session.id
    const prog      = await api(`/programs/${progId}`)
    const todayNum  = today.getDay() === 0 ? 7 : today.getDay()
    const todayEx   = (prog.exercises || []).filter(e => e.day_of_week === todayNum)
    const allEx     = prog.exercises || []
    if (!allEx.length) {
      showToast('No exercises in this program!', 'error')
      await api(`/sessions/${activeSessionId}`, 'DELETE')
      activeSessionId = null
      return
    }
    if (todayEx.length === 0) {
      showConfirm(
        'No workout today',
        "Today is not a scheduled day. Load all exercises anyway?",
        () => {
          workoutExercises = allEx.map(ex => ({ ...ex, exercise_id: ex.exercise_id || ex.id }))
          failureState = {}
          showActiveWorkout(prog, today)
        },
        'Load All', 'primary'
      )
      return
    }
    workoutExercises = todayEx.map(ex => ({ ...ex, exercise_id: ex.exercise_id || ex.id }))
    failureState = {}
    showActiveWorkout(prog, today)
    if (!allExercises.length) allExercises = await api('/exercises')
    lucide.createIcons()
  } catch (err) { showToast(`Error: ${err.message}`, 'error') }
}

function showActiveWorkout(prog, today) {
  document.getElementById('workout-start').classList.add('hidden')
  document.getElementById('active-workout').classList.remove('hidden')
  document.getElementById('workout-title').textContent = prog.name
  document.getElementById('workout-date').textContent  =
    today.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
  renderWorkoutExercises(workoutExercises)
}

function renderWorkoutExercises(exercises) {
  const container = document.getElementById('workout-exercises')
  if (!exercises?.length) {
    container.innerHTML = '<div class="empty-state"><p>No exercises.</p></div>'
    return
  }
  const dayNames = { 1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday',7:'Sunday' }
  const byDay = {}
  exercises.forEach((ex, i) => {
    const d = ex.day_of_week || 1
    if (!byDay[d]) byDay[d] = []
    byDay[d].push({ ...ex, idx:i })
  })
  const days = Object.keys(byDay).sort()
  const tabsHtml = days.map((day, i) => `
    <button class="day-tab ${i===0?'active':''}" onclick="switchDayTab(${day},this)">
      ${dayNames[day]}
      <span class="day-tab-count">${byDay[day].length}</span>
    </button>
  `).join('')
  const contentsHtml = days.map((day, di) => `
    <div id="day-content-${day}" class="day-content ${di===0?'':'hidden'}">
      ${byDay[day].map(ex => `
        <div class="workout-ex-card">
          <h4>${ex.exercise_name}</h4>
          <div class="workout-ex-meta">
            <span class="badge badge-gold">${ex.muscle_group}</span>
            <span>${ex.sets} set · ${ex.target_reps} target reps</span>
          </div>
          <div class="workout-inputs">
            <div class="form-group">
              <label>Weight (kg)</label>
              <input type="number" id="w-kg-${ex.idx}" placeholder="0" step="0.5" min="0" oninput="checkOverload(${ex.idx})">
            </div>
            <div class="form-group">
              <label>Reps</label>
              <input type="number" id="w-rep-${ex.idx}" placeholder="${ex.target_reps}" min="1">
            </div>
            <div class="form-group">
              <label>Failure?</label>
              <div class="fail-toggle">
                <button class="fail-btn" id="fy-${ex.idx}" onclick="setFailure(${ex.idx},true)">
                  <i data-lucide="check"></i> Yes
                </button>
                <button class="fail-btn" id="fn-${ex.idx}" onclick="setFailure(${ex.idx},false)">
                  <i data-lucide="x"></i> No
                </button>
              </div>
            </div>
          </div>
          <div id="overload-${ex.idx}" class="overload-msg hidden"></div>
        </div>
      `).join('')}
    </div>
  `).join('')
  container.innerHTML = `<div class="day-tabs">${tabsHtml}</div>${contentsHtml}`
  exercises.forEach((ex, i) => loadPrevPerf(i, ex.exercise_id))
  lucide.createIcons()
}

function switchDayTab(day, btn) {
  document.querySelectorAll('.day-tab').forEach(t    => t.classList.remove('active'))
  document.querySelectorAll('.day-content').forEach(c => c.classList.add('hidden'))
  btn.classList.add('active')
  document.getElementById(`day-content-${day}`).classList.remove('hidden')
}

async function loadPrevPerf(index, exId) {
  try {
    const sessions = await api('/sessions')
    for (const s of sessions) {
      if (s.id === activeSessionId) continue
      const detail = await api(`/sessions/${s.id}`)
      const prev   = detail.exercises?.find(e => e.exercise_id === exId)
      if (prev) {
        const input = document.getElementById(`w-kg-${index}`)
        if (input && !input.value) {
          input.value        = prev.weight_kg
          input.dataset.prev = prev.weight_kg
          input.placeholder  = `Prev: ${prev.weight_kg}kg`
        }
        return
      }
    }
  } catch {}
}

function setFailure(i, val) {
  failureState[i] = val
  document.getElementById(`fy-${i}`).classList.toggle('yes-active', val)
  document.getElementById(`fn-${i}`).classList.toggle('no-active', !val)
}

function checkOverload(i) {
  const input = document.getElementById(`w-kg-${i}`)
  const prev  = parseFloat(input.dataset.prev)
  const curr  = parseFloat(input.value)
  const msg   = document.getElementById(`overload-${i}`)
  if (isNaN(prev) || isNaN(curr)) { msg.classList.add('hidden'); return }
  if (curr > prev) {
    msg.className   = 'overload-msg overload-up'
    msg.textContent = `⚡ +${(curr-prev).toFixed(1)}kg — Progressive overload!`
    msg.classList.remove('hidden')
  } else if (curr < prev) {
    msg.className   = 'overload-msg overload-down'
    msg.textContent = `⚠️ Decreased from ${prev}kg`
    msg.classList.remove('hidden')
  } else { msg.classList.add('hidden') }
}

async function finishWorkout() {
  if (!activeSessionId) return
  let logged = 0, skipped = 0, errors = []
  for (let i = 0; i < workoutExercises.length; i++) {
    const ex      = workoutExercises[i]
    const weight  = parseFloat(document.getElementById(`w-kg-${i}`)?.value)
    const reps    = parseInt(document.getElementById(`w-rep-${i}`)?.value)
    const failure = failureState[i] ?? false
    if (!weight || isNaN(weight) || !reps || isNaN(reps)) { skipped++; continue }
    const exId = ex.exercise_id || ex.id
    if (!exId) { errors.push(`${ex.exercise_name}: missing ID`); skipped++; continue }
    try {
      await api(`/sessions/${activeSessionId}/exercises`, 'POST', {
        exercise_id:exId, weight_kg:weight, reps, reached_failure:failure
      })
      logged++
    } catch (err) { errors.push(`${ex.exercise_name}: ${err.message}`); skipped++ }
  }
  if (errors.length) console.error('Workout errors:', errors)
  if (logged === 0) {
    try { await api(`/sessions/${activeSessionId}`, 'DELETE') } catch {}
    activeSessionId = null; workoutExercises = []; failureState = {}
    document.getElementById('active-workout').classList.add('hidden')
    document.getElementById('workout-start').classList.remove('hidden')
    showToast('No exercises logged. Workout cancelled.', 'error')
    await loadWorkoutTab(); lucide.createIcons(); return
  }
  activeSessionId = null; workoutExercises = []; failureState = {}
  document.getElementById('active-workout').classList.add('hidden')
  document.getElementById('workout-start').classList.remove('hidden')
  showToast(`Workout complete! ${logged} logged${skipped?`, ${skipped} skipped`:''}`, 'success', 4000)
  await loadWorkoutTab()
  await loadHistory()
  lucide.createIcons()
}

function cancelWorkout() {
  showConfirm('Cancel Workout', 'Cancel and delete this session?', async () => {
    try { if (activeSessionId) await api(`/sessions/${activeSessionId}`, 'DELETE') } catch {}
    activeSessionId = null; workoutExercises = []; failureState = {}
    document.getElementById('active-workout').classList.add('hidden')
    document.getElementById('workout-start').classList.remove('hidden')
    lucide.createIcons()
  }, 'Cancel Workout', 'danger')
}

// ── HISTORY ──────────────────────────────────────────────────
async function loadHistory() {
  const container = document.getElementById('history-list')
  if (!container) return
  try {
    allSessions = await api('/sessions')
    renderHistory(allSessions)
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`
  }
}

function renderHistory(sessions) {
  const container = document.getElementById('history-list')
  if (!sessions.length) {
    container.innerHTML = '<div class="empty-state"><p>No workouts logged yet.</p></div>'
    return
  }
  container.innerHTML = sessions.map(s => `
    <div class="program-card">
      <div class="program-card-header" style="cursor:pointer" onclick="toggleHistory(${s.id})">
        <div>
          <h3 style="font-size:0.92rem;margin-bottom:4px">${formatDate(s.session_date)}</h3>
          <p style="color:var(--text-3);font-size:0.8rem">
            ${s.program_name || 'Manual workout'} · ${s.exercise_count || 0} exercises
          </p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <i data-lucide="chevron-down" style="color:var(--text-3)"></i>
          <button class="btn-icon" onclick="event.stopPropagation();deleteHistory(${s.id})">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <div id="hist-detail-${s.id}" class="hidden">
        <div style="padding:0 20px 16px">
          <div id="hist-body-${s.id}">
            <p style="color:var(--text-3);font-size:0.85rem">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  `).join('')
  lucide.createIcons()
}

async function toggleHistory(id) {
  const detail   = document.getElementById(`hist-detail-${id}`)
  const isHidden = detail.classList.contains('hidden')
  document.querySelectorAll('[id^="hist-detail-"]').forEach(d => d.classList.add('hidden'))
  if (isHidden) {
    detail.classList.remove('hidden')
    const body = document.getElementById(`hist-body-${id}`)
    if (body.textContent.includes('Loading')) await loadHistoryDetail(id, body)
  }
}

async function loadHistoryDetail(sessionId, container) {
  try {
    const session = await api(`/sessions/${sessionId}`)
    if (!session.exercises?.length) {
      container.innerHTML = '<p style="color:var(--text-3);font-size:0.85rem;padding:12px 0">No exercises logged.</p>'
      return
    }
    container.innerHTML = `
      <div class="log-table">
        <div class="log-table-header">
          <span>Exercise</span>
          <span>Load</span>
        </div>
        ${session.exercises.map(ex => `
          <div class="log-row">
            <div class="log-left">
              <span class="log-date">[${formatDate(session.session_date)}]</span>
              <span class="log-name">${ex.exercise_name.toUpperCase()}</span>
            </div>
            <div class="log-right">
              <div class="log-load">
                <span class="log-kg">${ex.weight_kg} <small>KG</small></span>
                <span class="log-reps">× ${ex.reps} <small>REPS</small></span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red)">${err.message}</p>`
  }
}

function deleteHistory(id) {
  showConfirm('Delete Workout', 'Delete from history?', async () => {
    try { await api(`/sessions/${id}`, 'DELETE'); await loadHistory(); showToast('Deleted.', 'info') }
    catch (err) { showToast(err.message, 'error') }
  })
}

// ── AI COACH ─────────────────────────────────────────────────
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
  const goal             = document.getElementById('ai-goal').value
  const experience_level = aiChoices.ai_exp
  const equipment        = aiChoices.ai_eq
  const injuries         = document.getElementById('ai-injuries').value.trim()
  if (selectedDays.length === 0) { showErr('ai-error', 'Please select at least 1 training day'); return }
  if (!experience_level) { showErr('ai-error', 'Select experience level'); return }
  if (!equipment)        { showErr('ai-error', 'Select equipment'); return }
  const days_per_week = selectedDays.length
  const btn = document.getElementById('ai-generate-btn')
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>'
  btn.disabled  = true
  hideErr('ai-error')
  document.getElementById('ai-result').classList.add('hidden')
  try {
    const result = await api('/ai/workout-suggestion', 'POST', {
      days_per_week, available_days:selectedDays,
      goal, experience_level, equipment,
      injuries: injuries || null
    })
    document.getElementById('ai-response-text').innerHTML =
      result.suggestion.replace(/\n/g, '<br>')
    const goalLabels = { muscle_gain:'Muscle Gain', fat_loss:'Fat Loss', weight_loss:'Weight Loss', strength:'Strength', endurance:'Endurance' }
    document.getElementById('ai-save-name').value = `AI ${goalLabels[goal] || goal} Program`
    document.getElementById('ai-result').classList.remove('hidden')
    document.getElementById('ai-result').scrollIntoView({ behavior:'smooth' })
  } catch (err) {
    showErr('ai-error', err.message.includes('Profile not found')
      ? 'Please complete your profile first.' : err.message)
  } finally {
    btn.innerHTML = '<i data-lucide="sparkles"></i> Generate My Program'
    btn.disabled  = false
    lucide.createIcons()
  }
}

async function saveAIProgram() {
  const name          = document.getElementById('ai-save-name').value.trim()
  const goal          = document.getElementById('ai-goal').value
  const days_per_week = selectedDays.length || 3
  if (!name || name.length < 3) { showToast('Program name min 3 chars', 'error'); return }
  const btn = document.getElementById('ai-save-btn')
  btn.textContent = 'Saving...'
  btn.disabled    = true
  try {
    const result = await api('/ai/workout-suggestion/save', 'POST', {
      name, days_per_week, goal, description:'Generated by Gemini AI'
    })
    savedAIProgramId = result.program.id
    showToast('Program saved!', 'success')
    document.getElementById('ai-add-exercises').classList.remove('hidden')
    document.getElementById('ai-add-exercises').scrollIntoView({ behavior:'smooth' })
    btn.textContent = '✅ Saved'
    btn.disabled    = true
    if (!allExercises.length) allExercises = await api('/exercises')
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error')
    btn.textContent = 'Save Program'
    btn.disabled    = false
  }
}

function searchAIExercise() {
  const q      = document.getElementById('ai-ex-search').value.toLowerCase()
  const select = document.getElementById('ai-ex-select')
  select.innerHTML = ''
  allExercises
    .filter(e => e.name.toLowerCase().includes(q) || e.muscle_group.toLowerCase().includes(q))
    .slice(0, 50)
    .forEach(e => {
      const o = document.createElement('option')
      o.value       = e.id
      o.textContent = `${e.name} (${e.muscle_group})`
      select.appendChild(o)
    })
}

async function addExToAIProgram() {
  if (!savedAIProgramId) { showToast('Please save the program first', 'error'); return }
  const exId = document.getElementById('ai-ex-select').value
  const day  = parseInt(document.getElementById('ai-ex-day').value)
  const sets = parseInt(document.getElementById('ai-ex-sets').value)
  const reps = parseInt(document.getElementById('ai-ex-reps').value)
  if (!exId) { showErr('ai-ex-error', 'Please select an exercise'); return }
  if (!reps || reps < 1) { showErr('ai-ex-error', 'Please enter reps'); return }
  try {
    await api(`/programs/${savedAIProgramId}/exercises`, 'POST', {
      exercise_id:parseInt(exId), day_of_week:day, sets, target_reps:reps
    })
    const ex = allExercises.find(e => e.id === parseInt(exId))
    const dayNames = { 1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',7:'Sun' }
    const list = document.getElementById('ai-added-list')
    const item = document.createElement('div')
    item.className = 'day-ex-item'
    item.style.marginBottom = '6px'
    item.innerHTML = `
      <div>
        <strong style="font-size:0.85rem">${ex?.name || 'Exercise'}</strong>
        <span style="color:var(--text-3);font-size:0.78rem;margin-left:6px">
          ${dayNames[day]} · ${sets}×${reps}
        </span>
      </div>
      <span class="badge badge-green">Added ✓</span>
    `
    list.appendChild(item)
    document.getElementById('ai-ex-reps').value   = ''
    document.getElementById('ai-ex-search').value = ''
    document.getElementById('ai-ex-select').innerHTML = ''
    hideErr('ai-ex-error')
    showToast(`${ex?.name} added!`, 'success')
  } catch (err) { showErr('ai-ex-error', err.message) }
}

function goToAIProgram() {
  savedAIProgramId = null
  showView('training')
}