const pool = require('./pool')

const programRepository = {

  // Kullanıcının tüm programlarını getir
  async findAllByUser(userId) {
    const result = await pool.query(
      `SELECT 
        wp.*,
        COUNT(pe.id) as exercise_count
       FROM workout_programs wp
       LEFT JOIN program_exercises pe ON wp.id = pe.program_id
       WHERE wp.user_id = $1
       GROUP BY wp.id
       ORDER BY wp.is_active DESC, wp.created_at DESC`,
      [userId]
    )
    // is_active DESC → aktif program en üstte çıkar
    return result.rows
  },

  // Tek programı egzersizleriyle birlikte getir
  async findById(id, userId) {
    const result = await pool.query(
      `SELECT 
        wp.*,
        json_agg(
          json_build_object(
            'id', pe.id,
            'day_of_week', pe.day_of_week,
            'sets', pe.sets,
            'target_reps', pe.target_reps,
            'notes', pe.notes,
            'exercise_id', e.id,
            'exercise_name', e.name,
            'muscle_group', e.muscle_group
          ) ORDER BY pe.day_of_week
        ) FILTER (WHERE pe.id IS NOT NULL) as exercises
       FROM workout_programs wp
       LEFT JOIN program_exercises pe ON wp.id = pe.program_id
       LEFT JOIN exercises e ON pe.exercise_id = e.id
       WHERE wp.id = $1 AND wp.user_id = $2
       GROUP BY wp.id`,
      [id, userId]
    )
    return result.rows[0]
  },

  async create(userId, data) {
  const { name, description, goal, days_per_week } = data
  const result = await pool.query(
    `INSERT INTO workout_programs 
      (user_id, name, description, goal, days_per_week, is_active)
     VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
    [userId, name, description, goal, days_per_week]
  )
  return result.rows[0]
},

  async update(id, userId, data) {
    const { name, description, goal, days_per_week } = data
    const result = await pool.query(
      `UPDATE workout_programs
       SET name=$1, description=$2, goal=$3, days_per_week=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [name, description, goal, days_per_week, id, userId]
    )
    return result.rows[0]
  },

  async delete(id, userId) {
    const result = await pool.query(
      `DELETE FROM workout_programs 
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, userId]
    )
    return result.rows[0]
  },

  // Aktif programı değiştir
  // Önce hepsini pasif yap, sonra seçileni aktif yap
  async setActive(id, userId) {
    const client = await pool.connect()
    // Transaction: ya ikisi de olur ya da hiçbiri
    // Yarıda kalırsa veri tutarsızlığı yaşanmaz
    try {
      await client.query('BEGIN')

      await client.query(
        `UPDATE workout_programs 
         SET is_active = false 
         WHERE user_id = $1`,
        [userId]
      )

      const result = await client.query(
        `UPDATE workout_programs 
         SET is_active = true 
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      )

      await client.query('COMMIT')
      return result.rows[0]
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  // Programa egzersiz ekle
  async addExercise(programId, data) {
    const { exercise_id, day_of_week, sets, target_reps, notes } = data
    const result = await pool.query(
      `INSERT INTO program_exercises
         (program_id, exercise_id, day_of_week, sets, target_reps, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [programId, exercise_id, day_of_week, sets, target_reps, notes]
    )
    return result.rows[0]
  },

  // Programdan egzersiz sil
  async removeExercise(programId, exerciseEntryId) {
    const result = await pool.query(
      `DELETE FROM program_exercises 
       WHERE id=$1 AND program_id=$2 RETURNING *`,
      [exerciseEntryId, programId]
    )
    return result.rows[0]
  }
}

module.exports = programRepository