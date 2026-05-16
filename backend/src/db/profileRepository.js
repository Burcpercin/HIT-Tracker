const pool = require('./pool')

const profileRepository = {

  async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    )
    return result.rows[0]
  },

  // upsert = varsa güncelle, yoksa oluştur
  // Kullanıcının birden fazla profili olmasın diye
  async upsert(userId, data) {
    const { birth_date, weight_kg, height_cm, gender, activity_level } = data

    const result = await pool.query(
      `INSERT INTO user_profiles 
         (user_id, birth_date, weight_kg, height_cm, gender, activity_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id)
       DO UPDATE SET
         birth_date = $2,
         weight_kg = $3,
         height_cm = $4,
         gender = $5,
         activity_level = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, birth_date, weight_kg, height_cm, gender, activity_level]
    )
    return result.rows[0]
  }
}

module.exports = profileRepository