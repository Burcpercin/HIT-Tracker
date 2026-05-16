const programRepository = require('../db/programRepository')
const exerciseRepository = require('../db/exerciseRepository')

// Gün numarasını isme çevir — okunabilirlik için
const DAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
}

const programService = {

  async getAllPrograms(userId) {
    return await programRepository.findAllByUser(userId)
  },

  async getProgramById(id, userId) {
    const program = await programRepository.findById(id, userId)
    if (!program) throw new Error('Program not found')
    return program
  },

  async createProgram(userId, data) {
    // Mentzer kuralı: haftada max 3 gün antrenman önerilir
    // Zorunlu değil ama uyarı ver
    let warning = null
    if (data.days_per_week > 3) {
      warning = 'Mentzer recommends max 3 days per week. Recovery is where growth happens!'
    }

    const program = await programRepository.create(userId, data)
    return { ...program, warning }
  },

  async updateProgram(id, userId, data) {
    await this.getProgramById(id, userId) // var mı kontrol et

    let warning = null
    if (data.days_per_week > 3) {
      warning = 'Mentzer recommends max 3 days per week. Recovery is where growth happens!'
    }

    const updated = await programRepository.update(id, userId, data)
    if (!updated) throw new Error('Program not found')
    return { ...updated, warning }
  },

  async deleteProgram(id, userId) {
    const deleted = await programRepository.delete(id, userId)
    if (!deleted) throw new Error('Program not found')
    return deleted
  },

  async setActiveProgram(id, userId) {
    await this.getProgramById(id, userId) // var mı kontrol et
    return await programRepository.setActive(id, userId)
  },

  async addExerciseToProgram(programId, userId, data) {
    // Program bu kullanıcıya ait mi?
    const program = await this.getProgramById(programId, userId)

    // Egzersiz var mı?
    const exercise = await exerciseRepository.findById(data.exercise_id)
    if (!exercise) throw new Error('Exercise not found')

    // Bu gün programda zaten bu egzersiz var mı?
    const existing = program.exercises || []
    const duplicate = existing.find(
      e => e.exercise_id === data.exercise_id &&
           e.day_of_week === data.day_of_week
    )
    if (duplicate) {
      throw new Error(
        `${exercise.name} is already in day ${DAY_NAMES[data.day_of_week]} of this program`
      )
    }

    // Mentzer: aynı günde çok fazla egzersiz olmasın
    const sameDay = existing.filter(e => e.day_of_week === data.day_of_week)
    let warning = null
    if (sameDay.length >= 5) {
      warning = 'Mentzer warning: Too many exercises in one day. Less is more — intensity over volume!'
    }

    const result = await programRepository.addExercise(programId, data)
    return { ...result, day_name: DAY_NAMES[data.day_of_week], warning }
  },

  async removeExerciseFromProgram(programId, exerciseEntryId, userId) {
    await this.getProgramById(programId, userId) // sahiplik kontrolü
    const removed = await programRepository.removeExercise(programId, exerciseEntryId)
    if (!removed) throw new Error('Exercise entry not found in this program')
    return removed
  }
}

module.exports = programService