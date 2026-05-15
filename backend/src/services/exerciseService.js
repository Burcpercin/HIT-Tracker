const exerciseRepository = require('../db/exerciseRepository')

const exerciseService = {

  async getAllExercises(muscleGroup) {
    // Arama filtresi varsa filtrele, yoksa hepsini getir
    if (muscleGroup) {
      return await exerciseRepository.findByMuscleGroup(muscleGroup)
    }
    return await exerciseRepository.findAll()
  },

  async getExerciseById(id) {
    const exercise = await exerciseRepository.findById(id)
    if (!exercise) {
      throw new Error('Exercise not found')
    }
    return exercise
  },

  async createExercise(data) {
    // Mentzer kuralı: dinlenme süresi minimum 3 gün olmalı
    if (data.required_rest_days < 3) {
      throw new Error(
        'Mentzer principle violated: minimum rest days must be 3. Recovery is growth.'
      )
    }
    return await exerciseRepository.create(data)
  },

  async updateExercise(id, data) {
    await this.getExerciseById(id) // önce var mı kontrol et
    if (data.required_rest_days < 3) {
      throw new Error(
        'Mentzer principle violated: minimum rest days must be 3. Recovery is growth.'
      )
    }
    return await exerciseRepository.update(id, data)
  },

  async deleteExercise(id) {
    const deleted = await exerciseRepository.delete(id)
    if (!deleted) {
      throw new Error('Exercise not found')
    }
    return deleted
  }
}

module.exports = exerciseService