const pool = require('./pool')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const MUSCLE_MAP = {
  'chest': 'Chest',
  'triceps': 'Triceps',
  'biceps': 'Biceps',
  'shoulders': 'Shoulders',
  'middle back': 'Back',
  'upper back': 'Back',
  'lower back': 'Back',
  'lats': 'Back',
  'traps': 'Traps',
  'forearms': 'Forearms',
  'quadriceps': 'Quadriceps',
  'hamstrings': 'Hamstrings',
  'glutes': 'Glutes',
  'calves': 'Calves',
  'abductors': 'Legs',
  'adductors': 'Legs',
  'abdominals': 'Abs',
  'neck': 'Neck'
}

const EQUIPMENT_MAP = {
  'barbell': 'Barbell',
  'dumbbell': 'Dumbbell',
  'body only': 'Bodyweight',
  'machine': 'Machine',
  'cable': 'Cable',
  'kettlebells': 'Kettlebell',
  'bands': 'Resistance Band',
  'medicine ball': 'Medicine Ball',
  'exercise ball': 'Swiss Ball',
  'foam roll': 'Foam Roller',
  'e-z curl bar': 'EZ Bar',
  'other': 'Other'
}

const REST_DAYS_MAP = {
  'Chest': 5, 'Back': 6, 'Quadriceps': 7,
  'Hamstrings': 7, 'Glutes': 6, 'Shoulders': 5,
  'Triceps': 4, 'Biceps': 4, 'Calves': 3,
  'Abs': 3, 'Traps': 4, 'Forearms': 3,
  'Legs': 7, 'Neck': 3
}

const ALLOWED_LEVELS = ['beginner', 'intermediate']

async function main() {
  try {
    console.log('🚀 Starting exercises.json seed...\n')

    const dataDir = path.join(__dirname, 'exercises_data')

    if (!fs.existsSync(dataDir)) {
      console.error('❌ exercises_data folder not found!')
      process.exit(1)
    }

    // Tablo güncellemeleri — gereksiz kolonları da temizle
    await pool.query(`
      ALTER TABLE exercises 
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS equipment VARCHAR(50),
      ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS level VARCHAR(20),
      ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[],
      ADD COLUMN IF NOT EXISTS instructions TEXT[]
    `)

    // Gereksiz kolonları kaldır
    const dropColumns = ['wger_id', 'force', 'mechanic']
    for (const col of dropColumns) {
      await pool.query(
        `ALTER TABLE exercises DROP COLUMN IF EXISTS ${col}`
      ).catch(() => {})
    }

    // gif_url → image_url olarak yeniden adlandır
    await pool.query(`
      ALTER TABLE exercises 
      RENAME COLUMN gif_url TO image_url
    `).catch(() => {
      console.log('image_url already exists or gif_url not found')
    })

    // Unique constraint
    try {
      await pool.query(`
        ALTER TABLE exercises 
        ADD CONSTRAINT exercises_name_unique UNIQUE (name)
      `)
    } catch {
      console.log('Unique constraint already exists')
    }

    console.log('✅ Schema updated\n')

    // Mevcut seed edilmiş egzersizleri temizle
    await pool.query(`DELETE FROM exercises WHERE is_custom = false OR is_custom IS NULL`)
    console.log('🗑️  Cleared existing exercises\n')

    const folders = fs.readdirSync(dataDir).filter(f =>
      fs.statSync(path.join(dataDir, f)).isDirectory()
    )

    console.log(`📦 Found ${folders.length} exercise folders`)
    console.log('💾 Processing...\n')

    let saved = 0
    let skipped = 0

    for (const folder of folders) {
      const folderPath = path.join(dataDir, folder)
      const jsonPath = path.join(folderPath, 'exercise.json')

      if (!fs.existsSync(jsonPath)) { skipped++; continue }

      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

      // Seviye filtresi
      if (!ALLOWED_LEVELS.includes(data.level)) { skipped++; continue }

      if (!data.name?.trim()) { skipped++; continue }

      // Kas grubu
      const primaryMuscle = data.primaryMuscles?.[0]
      const muscleGroup = MUSCLE_MAP[primaryMuscle] || 'General'

      // Ekipman
      const equipment = EQUIPMENT_MAP[data.equipment] || 'Other'

      // Dinlenme süresi
      const required_rest_days = REST_DAYS_MAP[muscleGroup] || 5

      // Resim yolları — DB'de sadece URL yolu sakla
      const imagesDir = path.join(folderPath, 'images')
      let image_url = null
      let image_url_2 = null

      if (fs.existsSync(imagesDir)) {
        const images = fs.readdirSync(imagesDir)
          .filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
          .sort()

        if (images[0]) {
          image_url = `/images/${folder}/images/${images[0]}`
        }
        if (images[1]) {
          image_url_2 = `/images/${folder}/images/${images[1]}`
        }
      }

      // Açıklama
      const description = data.instructions?.join(' ').substring(0, 1000) || null

      try {
        await pool.query(
          `INSERT INTO exercises 
            (name, muscle_group, description, required_rest_days,
             equipment, image_url, is_custom, level,
             secondary_muscles, instructions)
           VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $9)
           ON CONFLICT (name) DO UPDATE SET
             image_url = EXCLUDED.image_url,
             description = EXCLUDED.description`,
          [
            data.name.trim(),
            muscleGroup,
            description,
            required_rest_days,
            equipment,
            image_url,
            data.level,
            data.secondaryMuscles || [],
            data.instructions || []
          ]
        )
        saved++
        if (saved % 50 === 0) console.log(`  ✅ ${saved} saved...`)
      } catch (err) {
        console.error(`Error: ${data.name} — ${err.message}`)
        skipped++
      }
    }

    console.log(`\n🎉 Seed complete!`)
    console.log(`✅ Saved: ${saved}`)
    console.log(`⏭️  Skipped: ${skipped}`)

    // Dağılım
    const dist = await pool.query(`
      SELECT muscle_group, COUNT(*) as count
      FROM exercises
      GROUP BY muscle_group
      ORDER BY count DESC
    `)
    console.log('\n📊 Distribution:')
    dist.rows.forEach(r => console.log(`  ${r.muscle_group}: ${r.count}`))

  } catch (err) {
    console.error('❌ Seed failed:', err)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

main()