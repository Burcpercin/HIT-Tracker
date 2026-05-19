// ============================================================
// onboarding.js — Profil Oluşturma Anketi
// ============================================================

// Onboarding seçimlerini tutan obje
const obChoices = { gender: null, activity: null, goal: null }
let obStep       = 1
const OB_TOTAL   = 5

// Kart/buton seçimi — her gruptan sadece bir seçim
// group: 'gender' | 'activity' | 'goal' | 'ai_exp' | 'ai_eq'
function selectChoice(group, value, el) {
  el.parentElement.querySelectorAll('.choice-card,.activity-card,.goal-card')
    .forEach(e => e.classList.remove('selected'))
  el.classList.add('selected')
  if (group in obChoices)   obChoices[group]   = value
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

// Her adım için validasyon kuralları
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

// Adım 5: Özet ekranını hazırla + tahmini kalori hesapla
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

  // Mifflin-St Jeor formülü ile tahmini kalori
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