// Sabit limitler — tek yerden yönetilir
// Bir limit değiştireceksen sadece buraya bakarsın
const LIMITS = {
  name: { min: 2, max: 100 },
  muscleGroup: { min: 2, max: 50 },
  description: { max: 1000 },
  notes: { max: 500 },
  programName: { min: 3, max: 100 },
  quote: { min: 10, max: 500 },
  author: { min: 2, max: 100 },
  username: { min: 3, max: 50 },
  password: { min: 6, max: 72 },  // bcrypt max 72 karakter işler
  reps: { min: 1, max: 100 },
  sets: { min: 1, max: 20 },
  weight: { min: 0.5, max: 1000 },
  restDays: { min: 3, max: 14 },
  daysPerWeek: { min: 1, max: 7 },
  dayOfWeek: { min: 1, max: 7 },
  duration: { min: 1, max: 300 },  // max 5 saat antrenman
  age: { min: 13, max: 100 },
  weight_kg: { min: 30, max: 300 },
  height_cm: { min: 100, max: 250 },
}

// Yardımcı fonksiyon — tekrar tekrar aynı şeyi yazmamak için
// str varsa ve max'ı geçiyorsa hata ekle
const checkLength = (value, field, errors) => {
  if (value === undefined || value === null) return
  const str = String(value).trim()
  const limit = LIMITS[field]
  if (limit.min && str.length < limit.min) {
    errors.push(`${field} must be at least ${limit.min} characters`)
  }
  if (limit.max && str.length > limit.max) {
    errors.push(`${field} must be at most ${limit.max} characters`)
  }
}

const validate = {

  exercise(req, res, next) {
    const { name, muscle_group, description, required_rest_days } = req.body
    const errors = []

    if (!name) {
      errors.push('Name is required')
    } else {
      checkLength(name, 'name', errors)
    }

    if (!muscle_group) {
      errors.push('Muscle group is required')
    } else {
      checkLength(muscle_group, 'muscleGroup', errors)
    }

    // description zorunlu değil ama gelirse kontrol et
    if (description) {
      checkLength(description, 'description', errors)
    }

    if (required_rest_days === undefined || required_rest_days === null) {
      errors.push('Required rest days is required')
    } else {
      const val = Number(required_rest_days)
      if (!Number.isInteger(val)) {
        errors.push('Required rest days must be an integer')
      } else if (val < LIMITS.restDays.min || val > LIMITS.restDays.max) {
        errors.push(`Required rest days must be between ${LIMITS.restDays.min} and ${LIMITS.restDays.max}`)
      }
    }

    if (errors.length > 0) return res.status(400).json({ errors })
    next()
  },

  session(req, res, next) {
    const { session_date, notes, duration_minutes } = req.body
    const errors = []

    if (!session_date) {
      errors.push('Session date is required')
    } else if (isNaN(Date.parse(session_date))) {
      errors.push('Invalid date format. Use YYYY-MM-DD')
    }

    // notes zorunlu değil ama gelirse sınırla
    if (notes) {
      checkLength(notes, 'notes', errors)
    }

    if (duration_minutes !== undefined) {
      const val = Number(duration_minutes)
      if (isNaN(val) || val < LIMITS.duration.min || val > LIMITS.duration.max) {
        errors.push(`Duration must be between ${LIMITS.duration.min} and ${LIMITS.duration.max} minutes`)
      }
    }

    if (errors.length > 0) return res.status(400).json({ errors })
    next()
  },

  sessionExercise(req, res, next) {
    const { exercise_id, weight_kg, reps, reached_failure } = req.body
    const errors = []

    if (!exercise_id || isNaN(Number(exercise_id))) {
      errors.push('Valid exercise ID is required')
    }

    if (weight_kg === undefined) {
      errors.push('Weight is required')
    } else {
      const w = Number(weight_kg)
      if (isNaN(w) || w < LIMITS.weight.min || w > LIMITS.weight.max) {
        errors.push(`Weight must be between ${LIMITS.weight.min} and ${LIMITS.weight.max} kg`)
      }
    }

    if (reps === undefined) {
      errors.push('Reps is required')
    } else {
      const r = Number(reps)
      if (!Number.isInteger(r) || r < LIMITS.reps.min || r > LIMITS.reps.max) {
        errors.push(`Reps must be between ${LIMITS.reps.min} and ${LIMITS.reps.max}`)
      }
    }

    if (reached_failure !== undefined && typeof reached_failure !== 'boolean') {
      errors.push('reached_failure must be true or false')
    }

    if (errors.length > 0) return res.status(400).json({ errors })
    next()
  },

  register(req, res, next) {
    const { username, email, password } = req.body
    const errors = []

    if (!username) {
      errors.push('Username is required')
    } else {
      checkLength(username, 'username', errors)
    }

    if (!email) {
      errors.push('Email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email is required')
    }

    if (!password) {
      errors.push('Password is required')
    } else {
      checkLength(password, 'password', errors)
    }

    if (errors.length > 0) return res.status(400).json({ errors })
    next()
  },

  quote(req, res, next) {
    const { quote, author, category } = req.body
    const errors = []
    const VALID_CATEGORIES = ['mentzer', 'life', 'discipline', 'success', 'general']

    if (!quote) {
      errors.push('Quote is required')
    } else {
      checkLength(quote, 'quote', errors)
    }

    if (!author) {
      errors.push('Author is required')
    } else {
      checkLength(author, 'author', errors)
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    if (errors.length > 0) return res.status(400).json({ errors })
    next()
  },

  userProfile(req, res, next) {
    const { birth_date, weight_kg, height_cm, gender, activity_level } = req.body
    const errors = []

    const VALID_GENDERS = ['male', 'female']
    const VALID_ACTIVITY = ['sedentary', 'light', 'moderate', 'active', 'very_active']

    if (!birth_date) {
      errors.push('Birth date is required')
    } else {
      const birth = new Date(birth_date)
      if (isNaN(birth.getTime())) {
        errors.push('Invalid birth date format. Use YYYY-MM-DD')
      } else {
        // Yaş kontrolü — doğum tarihinden hesapla
        const today = new Date()
        const age = today.getFullYear() - birth.getFullYear()
        if (age < LIMITS.age.min || age > LIMITS.age.max) {
          errors.push(`Age must be between ${LIMITS.age.min} and ${LIMITS.age.max}`)
        }
        if (birth > today) {
          errors.push('Birth date cannot be in the future')
        }
      }
    }

    if (!weight_kg) {
      errors.push('Weight is required')
    } else {
      const w = Number(weight_kg)
      if (isNaN(w) || w < LIMITS.weight_kg.min || w > LIMITS.weight_kg.max) {
        errors.push(`Weight must be between ${LIMITS.weight_kg.min} and ${LIMITS.weight_kg.max} kg`)
      }
    }

    if (!height_cm) {
      errors.push('Height is required')
    } else {
      const h = Number(height_cm)
      if (isNaN(h) || h < LIMITS.height_cm.min || h > LIMITS.height_cm.max) {
        errors.push(`Height must be between ${LIMITS.height_cm.min} and ${LIMITS.height_cm.max} cm`)
      }
    }

    if (!gender || !VALID_GENDERS.includes(gender)) {
      errors.push(`Gender must be one of: ${VALID_GENDERS.join(', ')}`)
    }

    if (!activity_level || !VALID_ACTIVITY.includes(activity_level)) {
      errors.push(`Activity level must be one of: ${VALID_ACTIVITY.join(', ')}`)
    }

    if (errors.length > 0) return res.status(400).json({ errors })
    next()
  },

  program(req, res, next) {
    const { name, description, goal, days_per_week } = req.body
    const errors = []
    const VALID_GOALS = ['muscle_gain', 'fat_loss', 'strength', 'endurance']

    if (!name) {
      errors.push('Program name is required')
    } else {
      checkLength(name, 'programName', errors)
    }

    if (description) {
      checkLength(description, 'description', errors)
    }

    if (goal && !VALID_GOALS.includes(goal)) {
      errors.push(`Goal must be one of: ${VALID_GOALS.join(', ')}`)
    }

    if (!days_per_week) {
      errors.push('Days per week is required')
    } else {
      const d = Number(days_per_week)
      if (!Number.isInteger(d) || d < LIMITS.daysPerWeek.min || d > LIMITS.daysPerWeek.max) {
        errors.push(`Days per week must be between ${LIMITS.daysPerWeek.min} and ${LIMITS.daysPerWeek.max}`)
      }
    }

    if (errors.length > 0) return res.status(400).json({ errors })
    next()
  },

  aiPreferences(req, res, next) {
    const {
      days_per_week,
      available_days,
      goal,
      experience_level,
      equipment,
      injuries
    } = req.body
    const errors = []
    const VALID_GOALS = ['muscle_gain', 'fat_loss', 'weight_loss', 'strength', 'endurance']
    const VALID_EXPERIENCE = ['beginner', 'intermediate', 'advanced']
    const VALID_EQUIPMENT = ['gym', 'home', 'both']

    if (!days_per_week) {
      errors.push('days_per_week is required')
    } else {
      const d = Number(days_per_week)
      if (!Number.isInteger(d) || d < 1 || d > 7) {
        errors.push('days_per_week must be between 1 and 7')
      }
    }

    if (available_days) {
      if (!Array.isArray(available_days)) {
        errors.push('available_days must be an array of numbers (1-7)')
      } else {
        const invalid = available_days.filter(d => d < 1 || d > 7)
        if (invalid.length > 0) {
          errors.push('available_days values must be between 1 (Monday) and 7 (Sunday)')
        }
      }
    }

    if (!goal || !VALID_GOALS.includes(goal)) {
      errors.push(`goal must be one of: ${VALID_GOALS.join(', ')}`)
    }

    if (!experience_level || !VALID_EXPERIENCE.includes(experience_level)) {
      errors.push(`experience_level must be one of: ${VALID_EXPERIENCE.join(', ')}`)
    }

    if (!equipment || !VALID_EQUIPMENT.includes(equipment)) {
      errors.push(`equipment must be one of: ${VALID_EQUIPMENT.join(', ')}`)
    }

    if (injuries && String(injuries).length > 300) {
      errors.push('injuries description must be under 300 characters')
    }

    if (errors.length > 0) return res.status(400).json({ errors })
    next()
  }
}

module.exports = validate