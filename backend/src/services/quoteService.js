const quoteRepository = require('../db/quoteRepository')

// Geçerli kategoriler — başka bir şey gelirse hata ver
const VALID_CATEGORIES = ['mentzer', 'life', 'discipline', 'success', 'general']

const quoteService = {

  async getRandomQuote(category) {
    // Kategori geldiyse geçerli mi kontrol et
    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Valid ones: ${VALID_CATEGORIES.join(', ')}`)
    }

    const quote = await quoteRepository.findRandom(category)

    // Veritabanı boşsa fallback
    if (!quote) {
      return {
        quote: 'The mind is the limit. As long as the mind can envision it, you can do it.',
        author: 'Mike Mentzer',
        category: 'mentzer'
      }
    }

    return quote
  },

  async getAllQuotes() {
    return await quoteRepository.findAll()
  },

  async addQuote(data) {
    if (!data.quote || data.quote.trim().length < 10) {
      throw new Error('Quote must be at least 10 characters')
    }
    if (!data.author || data.author.trim().length < 2) {
      throw new Error('Author name is required')
    }
    if (data.category && !VALID_CATEGORIES.includes(data.category)) {
      throw new Error(`Invalid category. Valid ones: ${VALID_CATEGORIES.join(', ')}`)
    }

    return await quoteRepository.create(data)
  },

  async deleteQuote(id) {
    const deleted = await quoteRepository.delete(id)
    if (!deleted) throw new Error('Quote not found')
    return deleted
  }
}

module.exports = quoteService