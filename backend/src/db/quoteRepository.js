const pool = require('./pool')

const quoteRepository = {

  // Rastgele bir söz getir (opsiyonel: kategoriye göre filtrele)
  async findRandom(category) {
    // RANDOM() → PostgreSQL'in rastgele sıralama fonksiyonu
    // LIMIT 1 → sadece bir tane al
    if (category) {
      const result = await pool.query(
        `SELECT * FROM motivational_quotes 
         WHERE category = $1 
         ORDER BY RANDOM() 
         LIMIT 1`,
        [category]
      )
      return result.rows[0]
    }

    const result = await pool.query(
      `SELECT * FROM motivational_quotes ORDER BY RANDOM() LIMIT 1`
    )
    return result.rows[0]
  },

  async findAll() {
    const result = await pool.query(
      'SELECT * FROM motivational_quotes ORDER BY created_at DESC'
    )
    return result.rows
  },

  async create(data) {
    const { quote, author, category } = data
    const result = await pool.query(
      `INSERT INTO motivational_quotes (quote, author, category)
       VALUES ($1, $2, $3) RETURNING *`,
      [quote, author, category]
    )
    return result.rows[0]
  },

  async delete(id) {
    const result = await pool.query(
      'DELETE FROM motivational_quotes WHERE id = $1 RETURNING *',
      [id]
    )
    return result.rows[0]
  }
}

module.exports = quoteRepository