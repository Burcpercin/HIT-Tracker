const pool = require('./pool')
require('dotenv').config()

// wger API base URL
const WGER_API = 'https://wger.de/api/v2'

// Kas grubu ID → isim eşleştirmesi
// wger API sayısal ID kullanıyor
const MUSCLE_GROUPS = {
  1: 'Biceps',
  2: 'Anterior Deltoid',
  3: 'Chest',
  4: 'Triceps',
  5: 'Back',
  6: 'Legs',
  7: 'Abs',
  8: 'Calves',
  9: 'Glutes',
  10: 'Hamstrings',
  11: 'Quadriceps',
  12: 'Shoulders',
  13: 'Traps',
  14: 'Forearms'
}

// Ekipman ID → isim
const EQUIPMENT = {
  1: 'Barbell',
  2: 'SZ-Bar',
  3: 'Dumbbell',
  4: 'Gym mat',
  5: 'Swiss Ball',
  6: 'Pull-up Bar',
  7: 'Bodyweight',
  8: 'Bench',
  9: 'Incline Bench',
  10: 'Kettlebell',
  11: 'Cable',
  12: 'Machine'
}

async function fetchExercises() {
  console.log('🏋️ Starting exercise seed from wger API...')

  let allExercises = []
  let url = `${WGER_API}/exercise/?format=json&language=2&limit=100&offset=0`
  // language=2 → İngilizce egzersizler

  // wger API sayfalı sonuç döndürüyor
  // "next" alanı dolduğu sürece devam et
  while (url) {
    console.log(`Fetching: ${url}`)
    const response = await fetch(url)
    const data = await response.json()

    allExercises = [...allExercises, ...data.results]
    console.log(`Fetched ${allExercises.length} exercises so far...`)

    // Sonraki sayfa var mı?
    url = data.next
  }

  return allExercises
}

async function fetchExerciseDetails(exerciseId) {
  // Her egzersiz için detay çek (açıklama, kas grubu)
  try {
    const response = await fetch(
      `${WGER_API}/exerciseinfo/${exerciseId}/?format=json`
    )
    return await response.json()
  } catch {
    return null
  }
}

async function seedDatabase(exercises) {
  console.log(`\n💾 Saving ${exercises.length} exercises to database...`)

  let saved = 0
  let skipped = 0

  for (const exercise of exercises) {
    try {
      // Detay bilgisi al
      const detail = await fetchExerciseDetails(exercise.id)
      if (!detail) { skipped++; continue }

      // İngilizce açıklama bul
      const translation = detail.translations?.find(t => t.language === 2)
      if (!translation || !translation.name) { skipped++; continue }

      const name = translation.name.trim()
      if (!name) { skipped++; continue }

      // Açıklamadan HTML taglarını temizle
      const description = translation.description
        ? translation.description.replace(/<[^>]*>/g, '').trim().substring(0, 1000)
        : null

      // Ana kas grubu
      const primaryMuscle = detail.muscles?.[0]
      const muscleGroup = primaryMuscle
        ? MUSCLE_GROUPS[primaryMuscle.id] || 'General'
        : 'General'

      // Ekipman
      const equipmentId = detail.equipment?.[0]?.id
      const equipment = equipmentId ? EQUIPMENT[equipmentId] : null

      // Mentzer HIT için varsayılan dinlenme süresi
      // Bacak egzersizleri daha uzun dinlenme gerektirir
      const isLeg = ['Legs', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves']
        .includes(muscleGroup)
      const required_rest_days = isLeg ? 7 : 5

      // Veritabanına kaydet
      // ON CONFLICT → aynı isimde egzersiz varsa atla
      await pool.query(
        `INSERT INTO exercises 
          (name, muscle_group, description, required_rest_days, equipment, is_custom)
         VALUES ($1, $2, $3, $4, $5, false)
         ON CONFLICT (name) DO NOTHING`,
        [name, muscleGroup, description, required_rest_days, equipment]
      )

      saved++

      // Her 50 egzersizde bir ilerlemeyi göster
      if (saved % 50 === 0) {
        console.log(`✅ Saved ${saved} exercises...`)
      }

      // API'ye çok hızlı istek atmamak için bekle
      // Rate limiting'e takılmamak için
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (err) {
      console.error(`Error saving exercise ${exercise.id}:`, err.message)
      skipped++
    }
  }

  return { saved, skipped }
}

async function main() {
  try {
    // Önce tabloyu güncelle — yeni kolonlar ekle
    await pool.query(`
      ALTER TABLE exercises 
      ADD COLUMN IF NOT EXISTS equipment VARCHAR(50),
      ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS wger_id INTEGER
    `)

    // Unique constraint ekle — aynı isimde iki egzersiz olmasın
    await pool.query(`
      ALTER TABLE exercises 
      ADD CONSTRAINT IF NOT EXISTS exercises_name_unique UNIQUE (name)
    `).catch(() => {
      // Constraint zaten varsa hata verme
      console.log('Unique constraint already exists, continuing...')
    })

    console.log('✅ Database schema updated')

    // Egzersizleri çek
    const exercises = await fetchExercises()
    console.log(`\n📦 Total exercises fetched: ${exercises.length}`)

    // Veritabanına kaydet
    const { saved, skipped } = await seedDatabase(exercises)

    console.log(`\n🎉 Seed complete!`)
    console.log(`✅ Saved: ${saved}`)
    console.log(`⏭️  Skipped: ${skipped}`)

  } catch (err) {
    console.error('Seed failed:', err)
  } finally {
    // Bağlantıyı kapat
    await pool.end()
    process.exit(0)
  }
}

main()