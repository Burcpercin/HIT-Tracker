const pool = require('./pool')

const exerciseRepository = {

  async findAll() {
    const result = await pool.query(
      'SELECT * FROM exercises ORDER BY created_at DESC'
    )
    return result.rows
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE id = $1', [id]
    )
    return result.rows[0]
  },

  async findByMuscleGroup(muscleGroup) {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE muscle_group ILIKE $1',
      [`%${muscleGroup}%`]
    )
    return result.rows
  },

  async create(data) {
    const { name, muscle_group, description, required_rest_days } = data
    const result = await pool.query(
      `INSERT INTO exercises (name, muscle_group, description, required_rest_days)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, muscle_group, description, required_rest_days]
    )
    return result.rows[0]
  },

  async update(id, data) {
    const { name, muscle_group, description, required_rest_days } = data
    const result = await pool.query(
      `UPDATE exercises 
       SET name=$1, muscle_group=$2, description=$3, required_rest_days=$4
       WHERE id=$5 RETURNING *`,
      [name, muscle_group, description, required_rest_days, id]
    )
    return result.rows[0]
  },

  async delete(id) {
    const result = await pool.query(
      'DELETE FROM exercises WHERE id=$1 RETURNING *', [id]
    )
    return result.rows[0]
  }
}

module.exports = exerciseRepository