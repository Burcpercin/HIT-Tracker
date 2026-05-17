const express = require('express')
const router = express.Router()
const geminiService = require('../services/geminiService')
const profileRepository = require('../db/profileRepository')
const programRepository = require('../db/programRepository')
const calorieService = require('../services/calorieService')

/**
 * @swagger
 * tags:
 *   name: AI Suggestions
 *   description: Gemini AI powered workout and nutrition suggestions
 */

/**
 * @swagger
 * /api/ai/workout-suggestion:
 *   get:
 *     summary: Get AI powered HIT workout suggestion
 *     tags: [AI Suggestions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: goal
 *         schema:
 *           type: string
 *           enum: [muscle_gain, fat_loss, strength, endurance]
 *     responses:
 *       200:
 *         description: AI generated workout suggestion
 *       404:
 *         description: Profile not found
 *       503:
 *         description: AI service unavailable
 */
router.get('/workout-suggestion', async (req, res) => {
  try {
    // Kullanıcı profili olmadan öneri yapamayız
    const profile = await profileRepository.findByUserId(req.user.userId)
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found. Please create your profile first at POST /api/calories/profile'
      })
    }

    // Aktif programı getir (varsa)
    const programs = await programRepository.findAllByUser(req.user.userId)
    const activeProgram = programs.find(p => p.is_active) || null

    // Profil verisine yaş ekle
    const age = calorieService.calculateAge(profile.birth_date)
    const profileWithAge = { ...profile, age }

    const suggestion = await geminiService.generateWorkoutSuggestion(
      profileWithAge,
      activeProgram,
      req.query.goal
    )

    res.json(suggestion)
  } catch (err) {
    // AI hatası 503 — servis geçici olarak kullanılamıyor
    res.status(503).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/ai/nutrition-tip:
 *   get:
 *     summary: Get AI powered nutrition tip based on your calorie profile
 *     tags: [AI Suggestions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: goal
 *         schema:
 *           type: string
 *           enum: [muscle_gain, fat_loss, strength, endurance]
 *     responses:
 *       200:
 *         description: AI generated nutrition tip
 *       404:
 *         description: Profile not found
 */
router.get('/nutrition-tip', async (req, res) => {
  try {
    const profile = await profileRepository.findByUserId(req.user.userId)
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found. Please create your profile first.'
      })
    }

    const goal = req.query.goal || 'strength'
    const report = calorieService.calculateFullReport(profile, goal)

    const tip = await geminiService.generateNutritionTip(
      report.target_calories,
      report.macros,
      goal
    )

    res.json(tip)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

module.exports = router