// ============================================================
// app.js — Uygulama Başlangıcı ve View Yönetimi
// Modüller: api.js, auth.js, onboarding.js, dashboard.js,
//           exercises.js, training.js, ai.js
// ============================================================

function showView(name) {
  // Sayfa değiştirilince önce tüm açık modalleri kapat
  document.getElementById('confirm-modal').classList.add('hidden')
  document.getElementById('exercise-modal').classList.add('hidden')
  confirmCallback = null

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

// Uygulama başlangıcı
// Token var mı? Profil var mı? Kontrol et
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

// ESC → tüm modalleri kapat
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal()
    confirmCancel()
  }
})

// Dropdown'ları kapat — program ve AI arama dropdown'ları
document.addEventListener('click', e => {
  // Program egzersiz dropdown'ları
  const isProgSearch = e.target.closest('[id^="psearch-"]') || e.target.closest('[id^="pdrop-"]')
  if (!isProgSearch) {
    document.querySelectorAll('[id^="pdrop-"]').forEach(d => d.classList.add('hidden'))
  }

  // AI egzersiz dropdown'ı
  const isAISearch = e.target.closest('#ai-ex-search') || e.target.closest('#ai-ex-drop')
  if (!isAISearch) {
    document.getElementById('ai-ex-drop')?.classList.add('hidden')
  }
})