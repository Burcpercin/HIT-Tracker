const express = require('express')
const router = express.Router()
const programService = require('../services/programService')
const validate = require('../middleware/validate')

/**
 * @swagger
 * tags:
 *   name: Programs
 *   description: Workout program management
 */

/**
 * @swagger
 * /api/programs:
 *   get:
 *     summary: Get all programs for logged in user
 *     tags: [Programs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of programs
 */
router.get('/', async (req, res) => {
  try {
    const programs = await programService.getAllPrograms(req.user.userId)
    res.json(programs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/programs/{id}:
 *   get:
 *     summary: Get program by ID with all exercises
 *     tags: [Programs]
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
 *         description: Program with exercises grouped by day
 *       404:
 *         description: Program not found
 */
router.get('/:id', async (req, res) => {
  try {
    const program = await programService.getProgramById(
      req.params.id, req.user.userId
    )
    res.json(program)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/programs:
 *   post:
 *     summary: Create a new workout program
 *     tags: [Programs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, days_per_week]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Heavy Duty Program"
 *               description:
 *                 type: string
 *               goal:
 *                 type: string
 *                 enum: [muscle_gain, fat_loss, strength, endurance]
 *               days_per_week:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *     responses:
 *       201:
 *         description: Program created
 */
router.post('/', validate.program, async (req, res) => {
  try {
    const program = await programService.createProgram(req.user.userId, req.body)
    res.status(201).json(program)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/programs/{id}:
 *   put:
 *     summary: Update a program
 *     tags: [Programs]
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
 *         description: Program updated
 */
router.put('/:id', validate.program, async (req, res) => {
  try {
    const program = await programService.updateProgram(
      req.params.id, req.user.userId, req.body
    )
    res.json(program)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/programs/{id}/activate:
 *   patch:
 *     summary: Set program as active
 *     tags: [Programs]
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
 *         description: Program activated
 */
router.patch('/:id/activate', async (req, res) => {
  // PATCH kullandım çünkü tüm kaynağı değil
  // sadece is_active alanını değiştiriyoruz
  // REST standardı: kısmi güncelleme = PATCH
  try {
    const program = await programService.setActiveProgram(
      req.params.id, req.user.userId
    )
    res.json({ message: 'Program activated', program })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/programs/{id}:
 *   delete:
 *     summary: Delete a program
 *     tags: [Programs]
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
 *         description: Program deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await programService.deleteProgram(
      req.params.id, req.user.userId
    )
    res.json({ message: 'Program deleted', program: deleted })
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/programs/{id}/exercises:
 *   post:
 *     summary: Add exercise to program
 *     tags: [Programs]
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
 *             required: [exercise_id, day_of_week, sets, target_reps]
 *             properties:
 *               exercise_id:
 *                 type: integer
 *               day_of_week:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *                 example: 1
 *               sets:
 *                 type: integer
 *               target_reps:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Exercise added to program
 */
router.post('/:id/exercises', async (req, res) => {
  try {
    const result = await programService.addExerciseToProgram(
      req.params.id, req.user.userId, req.body
    )
    res.status(201).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/programs/{id}/exercises/{exerciseEntryId}:
 *   delete:
 *     summary: Remove exercise from program
 *     tags: [Programs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: exerciseEntryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Exercise removed
 */
router.delete('/:id/exercises/:exerciseEntryId', async (req, res) => {
  try {
    const removed = await programService.removeExerciseFromProgram(
      req.params.id,
      req.params.exerciseEntryId,
      req.user.userId
    )
    res.json({ message: 'Exercise removed from program', entry: removed })
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

module.exports = router