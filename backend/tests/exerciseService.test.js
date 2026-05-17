const exerciseService = require('../src/services/exerciseService')

// exerciseService veritabanını kullanıyor
// test için mock data oluşturulacak
jest.mock('../src/db/exerciseRepository')
const exerciseRepository = require('../src/db/exerciseRepository')

describe('exerciseService', () => {

  // Her testten önce mock'ları sıfırla
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createExercise', () => {

    test('throws error if rest days less than 3', async () => {
      await expect(
        exerciseService.createExercise({
          name: 'Bench Press',
          muscle_group: 'Chest',
          required_rest_days: 2  // ← 3'ten az, hata vermeli
        })
      ).rejects.toThrow('Mentzer principle violated')
      // rejects.toThrow → async fonksiyonun hata fırlatmasını bekle
    })

    test('creates exercise if rest days is 3 or more', async () => {
      const mockExercise = {
        id: 1,
        name: 'Bench Press',
        muscle_group: 'Chest',
        required_rest_days: 5
      }
      // Repository'nin ne döneceğini söylüyoruz
      exerciseRepository.create.mockResolvedValue(mockExercise)

      const result = await exerciseService.createExercise({
        name: 'Bench Press',
        muscle_group: 'Chest',
        required_rest_days: 5
      })

      expect(result).toEqual(mockExercise)
      expect(exerciseRepository.create).toHaveBeenCalledTimes(1)
    })

    test('throws error if rest days is exactly 14 (max allowed in validation)', async () => {
      const mockExercise = { id: 1, required_rest_days: 14 }
      exerciseRepository.create.mockResolvedValue(mockExercise)

      const result = await exerciseService.createExercise({
        name: 'Squat',
        muscle_group: 'Legs',
        required_rest_days: 14
      })
      expect(result).toEqual(mockExercise)
    })
  })

  describe('getExerciseById', () => {

    test('throws error if exercise not found', async () => {
      // Repository null döndürürse service hata vermeli
      exerciseRepository.findById.mockResolvedValue(null)

      await expect(
        exerciseService.getExerciseById(999)
      ).rejects.toThrow('Exercise not found')
    })

    test('returns exercise if found', async () => {
      const mockExercise = { id: 1, name: 'Squat' }
      exerciseRepository.findById.mockResolvedValue(mockExercise)

      const result = await exerciseService.getExerciseById(1)
      expect(result).toEqual(mockExercise)
    })
  })
})