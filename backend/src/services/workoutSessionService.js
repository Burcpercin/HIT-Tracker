const workoutSessionRepository = require('../db/workoutSessionRepository')

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

  async deleteSession(id, userId) {
    const deleted = await workoutSessionRepository.delete(id, userId)
    if (!deleted) throw new Error('Session not found')
    return deleted
  },

  async addExerciseToSession(sessionId, userId, data) {
    // Session bu kullanıcıya ait mi?
    await this.getSessionById(sessionId, userId)

    const { exercise_id, weight_kg, reps, reached_failure } = data

    // Önceki performansla karşılaştır
    const prev = await workoutSessionRepository.findLastPerformance(
      userId, exercise_id
    )

    let progressWarning = null
    if (prev && parseFloat(weight_kg) < parseFloat(prev.weight_kg)) {
      progressWarning = `Weight decreased from ${prev.weight_kg}kg. Mentzer demands progressive overload!`
    }

    const result = await workoutSessionRepository.addExercise(sessionId, data)
    return { ...result, progressWarning, previousPerformance: prev }
  }
}

module.exports = workoutSessionService