const express = require('express')
const router = express.Router()
const calorieService = require('../services/calorieService')
const profileRepository = require('../db/profileRepository')
const validate = require('../middleware/validate')

/**
 * @swagger
 * tags:
 *   name: Calories
 *   description: Calorie and macro calculations
 */

/**
 * @swagger
 * /api/calories/calculate:
 *   post:
 *     summary: Calculate calories without saving profile
 *     tags: [Calories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [birth_date, weight_kg, height_cm, gender, activity_level]
 *             properties:
 *               birth_date:
 *                 type: string
 *                 format: date
 *                 example: "1998-03-15"
 *               weight_kg:
 *                 type: number
 *                 example: 80
 *               height_cm:
 *                 type: number
 *                 example: 180
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               activity_level:
 *                 type: string
 *                 enum: [sedentary, light, moderate, active, very_active]
 *               goal:
 *                 type: string
 *                 enum: [muscle_gain, fat_loss, strength, endurance]
 *     responses:
 *       200:
 *         description: Full calorie and macro report
 */
router.post('/calculate', validate.userProfile, async (req, res) => {
  try {
    const { goal } = req.body
    const report = calorieService.calculateFullReport(req.body, goal)
    res.json(report)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/calories/profile:
 *   post:
 *     summary: Save user profile and get calorie report
 *     tags: [Calories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [birth_date, weight_kg, height_cm, gender, activity_level]
 *             properties:
 *               birth_date:
 *                 type: string
 *                 format: date
 *               weight_kg:
 *                 type: number
 *               height_cm:
 *                 type: number
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               activity_level:
 *                 type: string
 *                 enum: [sedentary, light, moderate, active, very_active]
 *               goal:
 *                 type: string
 *                 enum: [muscle_gain, fat_loss, strength, endurance]
 *     responses:
 *       201:
 *         description: Profile saved and report returned
 */
router.post('/profile', validate.userProfile, async (req, res) => {
  try {
    const profile = await profileRepository.upsert(req.user.userId, req.body)
    const report = calorieService.calculateFullReport(profile, req.body.goal)
    res.status(201).json({ profile, report })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/calories/profile:
 *   get:
 *     summary: Get saved profile with calorie report
 *     tags: [Calories]
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
 *         description: Profile and calorie report
 *       404:
 *         description: Profile not found
 */
router.get('/profile', async (req, res) => {
  try {
    const profile = await profileRepository.findByUserId(req.user.userId)
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found. Create one first.' })
    }
    const report = calorieService.calculateFullReport(profile, req.query.goal)
    res.json({ profile, report })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router