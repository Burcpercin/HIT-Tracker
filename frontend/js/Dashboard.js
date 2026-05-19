// ============================================================
// dashboard.js — Ana Sayfa
// ============================================================

async function loadDashboard() {
  const u = localStorage.getItem('username')
  if (u) document.getElementById('dash-username').textContent = u

  // 5 isteği paralel at — biri hata verse diğerleri etkilenmesin
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

// Kalori ve makro widget'ı — düzenlenebilir
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

// Kilo veya hedef değişince kaloriyi yeniden hesapla
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

// Dashboard'dan direkt workout tab'ına git
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