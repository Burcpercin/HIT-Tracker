const express = require('express')
const router = express.Router()
const quoteService = require('../services/quoteService')
const authMiddleware = require('../middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: Quotes
 *   description: Motivational quotes
 */

/**
 * @swagger
 * /api/quotes/random:
 *   get:
 *     summary: Get a random motivational quote
 *     tags: [Quotes]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [mentzer, life, discipline, success, general]
 *         description: Filter by category (optional)
 *     responses:
 *       200:
 *         description: A random quote
 */
router.get('/random', async (req, res) => {
  // Bu endpoint herkese açık — token gerekmez
  // Kullanıcı giriş yapmadan da motivasyon alabilsin
  try {
    const quote = await quoteService.getRandomQuote(req.query.category)
    res.json(quote)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/quotes:
 *   get:
 *     summary: Get all quotes
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all quotes
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const quotes = await quoteService.getAllQuotes()
    res.json(quotes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/quotes:
 *   post:
 *     summary: Add a new quote
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quote, author]
 *             properties:
 *               quote:
 *                 type: string
 *               author:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [mentzer, life, discipline, success, general]
 *     responses:
 *       201:
 *         description: Quote added
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const quote = await quoteService.addQuote(req.body)
    res.status(201).json(quote)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/quotes/{id}:
 *   delete:
 *     summary: Delete a quote
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Quote deleted
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await quoteService.deleteQuote(req.params.id)
    res.json({ message: 'Quote deleted', quote: deleted })
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

module.exports = router