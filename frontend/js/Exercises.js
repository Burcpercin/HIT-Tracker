// ============================================================
// exercises.js — Egzersiz Listesi, Filtreleme, CRUD
// ============================================================

let allExercises = []
let activeFilter = 'all'
let editingExId  = null

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

// Kas gruplarına göre filtre butonlarını dinamik oluştur
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

// Hem filtre hem arama birlikte çalışır
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
      <div class="ex-card-img"
        ${ex.image_url ? `
          data-img1="http://localhost:3000${ex.image_url}"
          data-img2="${ex.image_url_2 ? `http://localhost:3000${ex.image_url_2}` : ''}"
        ` : ''}>
        ${ex.image_url
          ? `<img
              src="http://localhost:3000${ex.image_url}"
              alt="${ex.name}"
              style="width:100%;height:100%;object-fit:cover"
              onerror="this.style.display='none'">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;
            justify-content:center;background:var(--bg-3)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"
              style="width:64px;height:64px;opacity:0.25">
              <rect x="10" y="44" width="80" height="12" rx="6" fill="var(--gold)"/>
              <rect x="10" y="30" width="18" height="40" rx="8" fill="var(--gold)"/>
              <rect x="72" y="30" width="18" height="40" rx="8" fill="var(--gold)"/>
              <rect x="2"  y="36" width="12" height="28" rx="6" fill="var(--gold)"/>
              <rect x="86" y="36" width="12" height="28" rx="6" fill="var(--gold)"/>
            </svg>
          </div>`
        }
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

  // Hover ile resim değişimi
  attachImageHover()
}

function attachImageHover() {
  let hoverInterval = null

  document.querySelectorAll('.ex-card-img[data-img1]').forEach(card => {
    const img   = card.querySelector('img')
    const img1  = card.dataset.img1
    const img2  = card.dataset.img2

    // img2 yoksa efekt yok
    if (!img || !img2) return

    card.addEventListener('mouseenter', () => {
      let show1 = false
      hoverInterval = setInterval(() => {
        img.src = show1 ? img1 : img2
        show1   = !show1
      }, 1000)
    })

    card.addEventListener('mouseleave', () => {
      clearInterval(hoverInterval)
      hoverInterval = null
      img.src = img1  // orijinal resme dön
    })
  })
}

// Egzersiz detay modalını aç
function openExModal(id) {
  const ex = allExercises.find(e => e.id === id)
  if (!ex) return

  // Mentzer felsefesine göre kas grubuna özel ipuçları
  const tips = {
    Chest:      'One set to failure is worth more than ten half-hearted sets.',
    Back:       'One all-out set of rows or pulldowns is all you need.',
    Shoulders:  'Overhead pressing to failure — brief, intense, infrequent.',
    Biceps:     'Curls taken to absolute failure — your biceps will have no choice but to grow.',
    Triceps:    'One set to failure is your ticket to growth.',
    Quadriceps: 'Squats to failure are brutally hard. That is exactly why they work.',
    Hamstrings: 'Romanian deadlifts to failure — feel every fiber working.',
    Glutes:     'Hip thrusts to failure build the most powerful muscles in your body.',
    Abs:        'Brief, intense work and adequate rest — same rules apply.',
    Calves:     'Take them to absolute failure — no mercy.',
    Traps:      'Heavy shrugs to failure. Simple, brutal, effective.',
    Forearms:   'Wrist curls to failure — often neglected, always rewarded.'
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
      <div class="modal-content-body">
    ${ex.image_url ? `
      <div style="display:flex;gap:12px;margin-bottom:20px;justify-content:center">
        <img src="http://localhost:3000${ex.image_url}"
          style="width:48%;border-radius:var(--radius-sm);object-fit:cover;background:var(--bg-3)"
          onerror="this.style.display='none'">
        ${ex.image_url_2 ? `
          <img src="http://localhost:3000${ex.image_url_2}"
            style="width:48%;border-radius:var(--radius-sm);object-fit:cover;background:var(--bg-3)"
            onerror="this.style.display='none'">
        ` : ''}
      </div>
    ` : ''}
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

// Custom egzersiz oluştur veya güncelle
async function createExercise() {
  const name               = document.getElementById('ex-name').value.trim()
  const muscle_group       = document.getElementById('ex-muscle').value
  const description        = document.getElementById('ex-desc').value.trim()
  const required_rest_days = parseInt(document.getElementById('ex-rest').value)
  if (!name || name.length < 2)       { showErr('exercise-form-error', 'Name min 2 chars'); return }
  if (!muscle_group)                   { showErr('exercise-form-error', 'Select muscle group'); return }
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

// Program ve workout dropdown'ları için ortak yardımcı
function fillExDropdown(selectId) {
  const select = document.getElementById(selectId)
  if (!select) return
  select.innerHTML = '<option value="">Select exercise...</option>'
  allExercises.forEach(ex => {
    const o = document.createElement('option')
    o.value       = ex.id
    o.textContent = `${ex.name} (${ex.muscle_group})`
    select.appendChild(o)
  })
}