const express = require('express')
const router = express.Router()
const exerciseService = require('../services/exerciseService')
const validate = require('../middleware/validate')

/**
 * @swagger
 * tags:
 *   name: Exercises
 *   description: Exercise management
 */

/**
 * @swagger
 * /api/exercises:
 *   get:
 *     summary: Get all exercises
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: muscleGroup
 *         schema:
 *           type: string
 *         description: Filter by muscle group
 *     responses:
 *       200:
 *         description: List of exercises
 */
router.get('/', async (req, res) => {
  try {
    const { muscleGroup } = req.query
    const exercises = await exerciseService.getAllExercises(
      muscleGroup,
      req.user.userId  // ← ekle
    )
    res.json(exercises)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/exercises/{id}:
 *   get:
 *     summary: Get exercise by ID
 *     tags: [Exercises]
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
 *         description: Exercise found
 *       404:
 *         description: Exercise not found
 */
router.get('/:id', async (req, res) => {
  try {
    const exercise = await exerciseService.getExerciseById(req.params.id)
    res.json(exercise)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/exercises:
 *   post:
 *     summary: Create a new exercise
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, muscle_group, required_rest_days]
 *             properties:
 *               name:
 *                 type: string
 *               muscle_group:
 *                 type: string
 *               description:
 *                 type: string
 *               required_rest_days:
 *                 type: integer
 *                 minimum: 3
 *     responses:
 *       201:
 *         description: Exercise created
 *       400:
 *         description: Validation error
 */
router.post('/', validate.exercise, async (req, res) => {
  try {
    const exercise = await exerciseService.createExercise(
      req.body,
      req.user.userId  // ← ekle
    )
    res.status(201).json(exercise)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/exercises/{id}:
 *   put:
 *     summary: Update an exercise
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Exercise updated
 *       400:
 *         description: Validation error
 */
router.put('/:id', validate.exercise, async (req, res) => {
  try {
    const exercise = await exerciseService.updateExercise(req.params.id, req.body)
    res.json(exercise)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/exercises/{id}:
 *   delete:
 *     summary: Delete an exercise
 *     tags: [Exercises]
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
 *         description: Exercise deleted
 *       404:
 *         description: Exercise not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await exerciseService.deleteExercise(
      req.params.id,
      req.user.userId  // ← ekle
    )
    res.json({ message: 'Exercise deleted', exercise: deleted })
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

module.exports = router