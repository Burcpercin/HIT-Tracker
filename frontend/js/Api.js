// ============================================================
// api.js — API helper, Toast, Confirm Modal
// ============================================================

const API = 'http://localhost:3000/api'

// Tüm API istekleri bu fonksiyondan geçer
// Token varsa otomatik header'a eklenir
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

// ── Hata Mesajları ───────────────────────────────────────────
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

// ── Toast Bildirimi ──────────────────────────────────────────
// type: 'success' | 'error' | 'info'
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: 'check-circle', error: 'x-circle', info: 'info' }
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.innerHTML = `<i data-lucide="${icons[type]}"></i><p>${message}</p>`
  document.getElementById('toast-container').appendChild(toast)
  lucide.createIcons()
  setTimeout(() => {
    toast.style.opacity    = '0'
    toast.style.transform  = 'translateX(110%)'
    toast.style.transition = 'all 0.3s ease'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

// ── Confirm Modal ────────────────────────────────────────────
// Browser'ın confirm() yerine özel modal
// okType: 'danger' | 'primary'
let confirmCallback = null

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

// ── Tarih Formatlama ─────────────────────────────────────────
// "2026-05-19T00:00:00Z" → "May 19, 2026"
function formatDate(str) {
  if (!str) return '—'
  const parts = str.split('T')[0].split('-')
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}