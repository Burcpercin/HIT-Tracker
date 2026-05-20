// ============================================================
// training.js — Programs, Workout, History
// ============================================================

let allPrograms      = []
let allSessions      = []
let activeSessionId  = null
let workoutExercises = []
let failureState     = {}

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
            onclick="onActivate(event,${p.id})">
            ${p.is_active
              ? '<i data-lucide="check-circle"></i> Active'
              : '<i data-lucide="circle"></i> Set Active'}
          </button>
          <button class="btn-icon edit" onclick="onEditProg(event,${p.id})">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-icon" onclick="onDeleteProg(event,${p.id},'${p.name.replace(/'/g,"\\'")}')">
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

// Buton event'lerini explicit olarak geçiyoruz
// event.stopPropagation() inline'da güvenilmez
function onActivate(e, id)          { e.stopPropagation(); activateProgram(id) }
function onEditProg(e, id)          { e.stopPropagation(); toggleProgDetail(id) }
function onDeleteProg(e, id, name)  { e.stopPropagation(); deleteProgram(id, name) }

// Arama dropdown'ı
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
    const days  = { 1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',7:'Sun' }
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
  try { await api(`/programs/${id}/activate`, 'PATCH'); await loadPrograms(); showToast('Activated!', 'success') }
  catch (err) { showToast(err.message, 'error') }
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
      exercise_id:parseInt(exId), day_of_week:day, sets, target_reps:reps
    })
    document.getElementById(`psearch-${progId}`).value  = ''
    document.getElementById(`padd-ex-${progId}`).value  = ''
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
    const session  = await api('/sessions', 'POST', { session_date, program_id:progId })
    activeSessionId = session.id
    const prog     = await api(`/programs/${progId}`)
    const todayNum = today.getDay() === 0 ? 7 : today.getDay()
    const todayEx  = (prog.exercises || []).filter(e => e.day_of_week === todayNum)
    const allEx    = prog.exercises || []
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

// Egzersizleri günlere göre tab'larla göster
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

// Önceki antrenmandan aynı egzersizin ağırlığını çek
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

// Önceki ağırlıkla karşılaştır → progressive overload uyarısı
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
  }, 'Abort Workout', 'danger')
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