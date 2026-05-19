const pool = require('./pool')

const exerciseRepository = {

  async findAll(userId = null) {
  const result = await pool.query(
    `SELECT * FROM exercises 
     WHERE is_custom = false 
     OR (is_custom = true AND user_id = $1)
     ORDER BY is_custom ASC, name ASC`,
    [userId]
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

  async create(data, userId = null) {
  const { name, muscle_group, description, required_rest_days } = data
  const result = await pool.query(
    `INSERT INTO exercises 
      (name, muscle_group, description, required_rest_days, is_custom, user_id)
     VALUES ($1, $2, $3, $4, true, $5) RETURNING *`,
    [name, muscle_group, description, required_rest_days, userId]
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

async delete(id, userId = null) {
  // Custom egzersiz mi ve bu kullanıcıya mı ait?
  const result = await pool.query(
    `DELETE FROM exercises 
     WHERE id = $1 
     AND is_custom = true 
     AND user_id = $2 
     RETURNING *`,
    [id, userId]
  )
  return result.rows[0]
}
}

module.exports = exerciseRepository