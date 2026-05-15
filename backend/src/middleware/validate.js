const validate = {

  exercise(req, res, next) {
    const { name, muscle_group, required_rest_days } = req.body
    const errors = []

    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters')
    }
    if (!muscle_group || muscle_group.trim().length < 2) {
      errors.push('Muscle group is required')
    }
    if (required_rest_days === undefined || required_rest_days === null) {
      errors.push('Required rest days is required')
    } else if (!Number.isInteger(Number(required_rest_days)) || Number(required_rest_days) < 3) {
      errors.push('Required rest days must be an integer of at least 3')
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors })
    }
    next()
  },

  session(req, res, next) {
    const { session_date, duration_minutes } = req.body
    const errors = []

    if (!session_date) {
      errors.push('Session date is required')
    } else if (isNaN(Date.parse(session_date))) {
      errors.push('Invalid date format')
    }
    if (duration_minutes !== undefined && 
       (isNaN(Number(duration_minutes)) || Number(duration_minutes) < 1)) {
      errors.push('Duration must be a positive number')
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors })
    }
    next()
  },

  sessionExercise(req, res, next) {
    const { exercise_id, weight_kg, reps } = req.body
    const errors = []

    if (!exercise_id) errors.push('Exercise ID is required')
    if (!weight_kg || Number(weight_kg) <= 0) {
      errors.push('Weight must be greater than 0')
    }
    if (!reps || !Number.isInteger(Number(reps)) || Number(reps) < 1) {
      errors.push('Reps must be a positive integer')
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors })
    }
    next()
  },

  register(req, res, next) {
    const { username, email, password } = req.body
    const errors = []

    if (!username || username.trim().length < 3) {
      errors.push('Username must be at least 3 characters')
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email is required')
    }
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters')
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors })
    }
    next()
  }
}

module.exports = validate