const express = require('express')
const router = express.Router()
const workoutSessionService = require('../services/workoutSessionService')
const validate = require('../middleware/validate')

/**
 * @swagger
 * tags:
 *   name: WorkoutSessions
 *   description: Workout session management
 */

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Get all sessions for logged in user
 *     tags: [WorkoutSessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sessions
 */
router.get('/', async (req, res) => {
  try {
    const sessions = await workoutSessionService.getAllSessions(req.user.userId)
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/sessions/recovery/{muscleGroup}:
 *   get:
 *     summary: Check Mentzer recovery status for a muscle group
 *     tags: [WorkoutSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: muscleGroup
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recovery status
 */
router.get('/recovery/:muscleGroup', async (req, res) => {
  try {
    const status = await workoutSessionService.checkRecoveryStatus(
      req.user.userId,
      req.params.muscleGroup
    )
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session by ID with all exercises
 *     tags: [WorkoutSessions]
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
 *         description: Session with exercises
 *       404:
 *         description: Session not found
 */
router.get('/:id', async (req, res) => {
  try {
    const session = await workoutSessionService.getSessionById(
      req.params.id, req.user.userId
    )
    res.json(session)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Create a new workout session
 *     tags: [WorkoutSessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [session_date]
 *             properties:
 *               session_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-15"
 *               notes:
 *                 type: string
 *               duration_minutes:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Session created
 *       400:
 *         description: Validation error
 */
router.post('/', validate.session, async (req, res) => {
  try {
    const session = await workoutSessionService.createSession(
      req.user.userId, req.body
    )
    res.status(201).json(session)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/sessions/{id}/exercises:
 *   post:
 *     summary: Add exercise to a session
 *     tags: [WorkoutSessions]
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
 *             required: [exercise_id, weight_kg, reps]
 *             properties:
 *               exercise_id:
 *                 type: integer
 *               weight_kg:
 *                 type: number
 *                 example: 100.5
 *               reps:
 *                 type: integer
 *               reached_failure:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Exercise added with Mentzer analysis
 *       400:
 *         description: Validation error
 */
router.post('/:id/exercises', validate.sessionExercise, async (req, res) => {
  try {
    const result = await workoutSessionService.addExerciseToSession(
      req.params.id, req.user.userId, req.body
    )
    res.status(201).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/sessions/{id}:
 *   put:
 *     summary: Update a session
 *     tags: [WorkoutSessions]
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
 *             properties:
 *               session_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               duration_minutes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Session updated
 */
router.put('/:id', validate.session, async (req, res) => {
  try {
    const session = await workoutSessionService.updateSession(
      req.params.id, req.user.userId, req.body
    )
    res.json(session)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     summary: Delete a session
 *     tags: [WorkoutSessions]
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
 *         description: Session deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await workoutSessionService.deleteSession(
      req.params.id, req.user.userId
    )
    res.json({ message: 'Session deleted', session: deleted })
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

module.exports = router