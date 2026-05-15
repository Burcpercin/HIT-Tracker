const workoutSessionRepository = require('../db/workoutSessionRepository')
const exerciseRepository = require('../db/exerciseRepository')

const workoutSessionService = {

  async getAllSessions(userId) {
    return await workoutSessionRepository.findAllByUser(userId)
  },

  async getSessionById(id, userId) {
    const session = await workoutSessionRepository.findById(id, userId)
    if (!session) throw new Error('Session not found')
    return session
  },

  async createSession(userId, data) {
    if (!data.session_date) throw new Error('Session date is required')
    return await workoutSessionRepository.create(userId, data)
  },

  async updateSession(id, userId, data) {
    await this.getSessionById(id, userId)
    const updated = await workoutSessionRepository.update(id, userId, data)
    if (!updated) throw new Error('Session not found')
    return updated
  },

  async deleteSession(id, userId) {
    const deleted = await workoutSessionRepository.delete(id, userId)
    if (!deleted) throw new Error('Session not found')
    return deleted
  },

  // MENTZER KURALI 1: Yeterince dinlendi mi?
  async checkRecoveryStatus(userId, muscleGroup) {
    const last = await workoutSessionRepository.findLastSessionForMuscleGroup(
      userId, muscleGroup
    )
    if (!last) return { ready: true, message: 'No previous session found. Ready to train!' }

    const lastDate = new Date(last.session_date)
    const today = new Date()
    const daysPassed = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))
    const required = last.required_rest_days

    if (daysPassed < required) {
      return {
        ready: false,
        daysPassed,
        daysRequired: required,
        daysRemaining: required - daysPassed,
        message: `Not recovered yet! Mentzer says: wait ${required - daysPassed} more days. Recovery IS the workout.`
      }
    }

    return {
      ready: true,
      daysPassed,
      daysRequired: required,
      message: `Fully recovered after ${daysPassed} days. Time to train with maximum intensity!`
    }
  },

  // MENTZER KURALI 2: Progressive overload kontrolü
  async addExerciseToSession(sessionId, userId, data) {
    await this.getSessionById(sessionId, userId)

    const exercise = await exerciseRepository.findById(data.exercise_id)
    if (!exercise) throw new Error('Exercise not found')

    // Önceki performansla karşılaştır
    const lastPerformance = await workoutSessionRepository.findLastPerformance(
      userId, data.exercise_id
    )

    let progressWarning = null
    if (lastPerformance) {
      if (parseFloat(data.weight_kg) < parseFloat(lastPerformance.weight_kg)) {
        progressWarning = `Warning: Weight decreased from ${lastPerformance.weight_kg}kg to ${data.weight_kg}kg. Mentzer demands progressive overload!`
      }
    }

    // MENTZER KURALI 3: Failure'a ulaşmadan antrenman olmaz
    if (data.reached_failure === false) {
      progressWarning = (progressWarning || '') +
        ' Note: Mentzer principle — train to momentary muscular failure for maximum growth stimulus.'
    }

    const result = await workoutSessionRepository.addExerciseToSession(sessionId, data)
    return { ...result, progressWarning, previousPerformance: lastPerformance }
  }
}

module.exports = workoutSessionService