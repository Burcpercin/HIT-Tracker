const pool = require('./pool')

const workoutSessionRepository = {

  async findAllByUser(userId) {
    const result = await pool.query(
      `SELECT ws.*, 
        COUNT(se.id) as exercise_count
       FROM workout_sessions ws
       LEFT JOIN session_exercises se ON ws.id = se.session_id
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.session_date DESC`,
      [userId]
    )
    return result.rows
  },

  async findById(id, userId) {
    const result = await pool.query(
      `SELECT ws.*,
        json_agg(
          json_build_object(
            'id', se.id,
            'exercise_id', se.exercise_id,
            'exercise_name', e.name,
            'muscle_group', e.muscle_group,
            'weight_kg', se.weight_kg,
            'reps', se.reps,
            'reached_failure', se.reached_failure
          )
        ) FILTER (WHERE se.id IS NOT NULL) as exercises
       FROM workout_sessions ws
       LEFT JOIN session_exercises se ON ws.id = se.session_id
       LEFT JOIN exercises e ON se.exercise_id = e.id
       WHERE ws.id = $1 AND ws.user_id = $2
       GROUP BY ws.id`,
      [id, userId]
    )
    return result.rows[0]
  },

  async findLastSessionForMuscleGroup(userId, muscleGroup) {
    const result = await pool.query(
      `SELECT ws.session_date, e.required_rest_days
       FROM workout_sessions ws
       JOIN session_exercises se ON ws.id = se.session_id
       JOIN exercises e ON se.exercise_id = e.id
       WHERE ws.user_id = $1 AND e.muscle_group ILIKE $2
       ORDER BY ws.session_date DESC
       LIMIT 1`,
      [userId, muscleGroup]
    )
    return result.rows[0]
  },

  async create(userId, data) {
    const { session_date, notes, duration_minutes } = data
    const result = await pool.query(
      `INSERT INTO workout_sessions (user_id, session_date, notes, duration_minutes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, session_date, notes, duration_minutes]
    )
    return result.rows[0]
  },

  async update(id, userId, data) {
    const { session_date, notes, duration_minutes } = data
    const result = await pool.query(
      `UPDATE workout_sessions
       SET session_date=$1, notes=$2, duration_minutes=$3
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [session_date, notes, duration_minutes, id, userId]
    )
    return result.rows[0]
  },

  async delete(id, userId) {
    const result = await pool.query(
      `DELETE FROM workout_sessions WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, userId]
    )
    return result.rows[0]
  },

  async addExerciseToSession(sessionId, data) {
    const { exercise_id, weight_kg, reps, reached_failure } = data
    const result = await pool.query(
      `INSERT INTO session_exercises (session_id, exercise_id, weight_kg, reps, reached_failure)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sessionId, exercise_id, weight_kg, reps, reached_failure]
    )
    return result.rows[0]
  },

  async findLastPerformance(userId, exerciseId) {
    const result = await pool.query(
      `SELECT se.weight_kg, se.reps, se.reached_failure, ws.session_date
       FROM session_exercises se
       JOIN workout_sessions ws ON se.session_id = ws.id
       WHERE ws.user_id = $1 AND se.exercise_id = $2
       ORDER BY ws.session_date DESC
       LIMIT 1`,
      [userId, exerciseId]
    )
    return result.rows[0]
  }
}

module.exports = workoutSessionRepository