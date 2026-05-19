const exerciseRepository = require('../db/exerciseRepository')

const exerciseService = {

 async getAllExercises(muscleGroup, userId) {
  if (muscleGroup) {
    const all = await exerciseRepository.findAll(userId)
    return all.filter(e =>
      e.muscle_group.toLowerCase().includes(muscleGroup.toLowerCase())
    )
  }
  return await exerciseRepository.findAll(userId)
},

  async getExerciseById(id) {
    const exercise = await exerciseRepository.findById(id)
    if (!exercise) {
      throw new Error('Exercise not found')
    }
    return exercise
  },

async createExercise(data, userId) {
  if (data.required_rest_days < 3) {
    throw new Error('Mentzer principle violated: minimum rest days must be 3.')
  }
  return await exerciseRepository.create(data, userId)
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

  async deleteExercise(id, userId) {
  const deleted = await exerciseRepository.delete(id, userId)
  if (!deleted) {
    throw new Error('Exercise not found or you do not have permission to delete it')
  }
  return deleted
}
}

module.exports = exerciseService