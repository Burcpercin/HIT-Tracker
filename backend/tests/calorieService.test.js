const calorieService = require('../src/services/calorieService')

// "describe" → ilgili testleri gruplar, okunabilirlik için
describe('calorieService', () => {

  // --- calculateAge ---
  describe('calculateAge', () => {

    test('calculates age correctly', () => {
      // Bugünden 25 yıl önceyi doğum tarihi yap
      const today = new Date()
      const birthDate = new Date(
        today.getFullYear() - 25,
        today.getMonth(),
        today.getDate()
      ).toISOString().split('T')[0]

      const age = calorieService.calculateAge(birthDate)
      expect(age).toBe(25)
    })

    test('does not count birthday if not happened yet this year', () => {
      const today = new Date()
      // Doğum günü henüz geçmemiş — gelecek ay
      const birthDate = new Date(
        today.getFullYear() - 25,
        today.getMonth() + 1,
        today.getDate()
      ).toISOString().split('T')[0]

      const age = calorieService.calculateAge(birthDate)
      expect(age).toBe(24) // henüz 25 olmadı
    })
  })

  // --- calculateBMR ---
  describe('calculateBMR', () => {

    test('calculates BMR for male correctly', () => {
      // (10 × 80) + (6.25 × 180) - (5 × 25) + 5
      // = 800 + 1125 - 125 + 5 = 1805
      const bmr = calorieService.calculateBMR(80, 180, 25, 'male')
      expect(bmr).toBe(1805)
    })

    test('calculates BMR for female correctly', () => {
      // (10 × 60) + (6.25 × 165) - (5 × 25) - 161
      // = 600 + 1031.25 - 125 - 161 = 1345.25
      const bmr = calorieService.calculateBMR(60, 165, 25, 'female')
      expect(bmr).toBeCloseTo(1345.25)
      // toBeCloseTo → ondalıklı sayılarda küçük farkları tolere eder
    })

    test('throws error for invalid gender', () => {
      // Hata fırlatılmasını bekliyoruz
      expect(() => {
        calorieService.calculateBMR(80, 180, 25, 'alien')
      }).toThrow('Gender must be male or female')
    })
  })

  // --- calculateTDEE ---
  describe('calculateTDEE', () => {

    test('applies activity multiplier correctly', () => {
      const bmr = 1805
      const tdee = calorieService.calculateTDEE(bmr, 'moderate')
      // 1805 × 1.55 = 2797.75 → round → 2798
      expect(tdee).toBe(Math.round(1805 * 1.55))
    })

    test('throws error for invalid activity level', () => {
      expect(() => {
        calorieService.calculateTDEE(1805, 'super_active')
      }).toThrow('Invalid activity level')
    })
  })

  // --- calculateTargetCalories ---
  describe('calculateTargetCalories', () => {

    test('adds surplus for muscle gain', () => {
      const tdee = 2500
      const target = calorieService.calculateTargetCalories(tdee, 'muscle_gain')
      expect(target).toBe(2900) // 2500 + 400
    })

    test('creates deficit for fat loss', () => {
      const tdee = 2500
      const target = calorieService.calculateTargetCalories(tdee, 'fat_loss')
      expect(target).toBe(2000) // 2500 - 500
    })

    test('keeps maintenance for strength', () => {
      const tdee = 2500
      const target = calorieService.calculateTargetCalories(tdee, 'strength')
      expect(target).toBe(2500) // değişmez
    })

    test('throws error for invalid goal', () => {
      expect(() => {
        calorieService.calculateTargetCalories(2500, 'get_huge')
      }).toThrow('Invalid goal')
    })
  })

  // --- calculateMacros ---
  describe('calculateMacros', () => {

    test('protein is higher for fat loss than muscle gain', () => {
      const fatLossMacros = calorieService.calculateMacros(2000, 80, 'fat_loss')
      const muscleGainMacros = calorieService.calculateMacros(2000, 80, 'muscle_gain')
      // Fat loss için protein katsayısı daha yüksek (2.5 vs 2.2)
      expect(fatLossMacros.protein_g).toBeGreaterThan(muscleGainMacros.protein_g)
    })

    test('macros calories add up to target', () => {
      const target = 2500
      const macros = calorieService.calculateMacros(target, 80, 'strength')
      const total = (macros.protein_g * 4) + (macros.carbs_g * 4) + (macros.fat_g * 9)
      // Yuvarlama hatası olabilir, 50 kalori tolerans ver
      expect(Math.abs(total - target)).toBeLessThan(50)
    })
  })

  // --- calculateFullReport ---
  describe('calculateFullReport', () => {

    test('returns complete report with all fields', () => {
      const profile = {
        birth_date: '1998-01-01',
        weight_kg: 80,
        height_cm: 180,
        gender: 'male',
        activity_level: 'moderate'
      }

      const report = calorieService.calculateFullReport(profile, 'muscle_gain')

      // Tüm alanlar var mı?
      expect(report).toHaveProperty('age')
      expect(report).toHaveProperty('bmr')
      expect(report).toHaveProperty('tdee')
      expect(report).toHaveProperty('target_calories')
      expect(report).toHaveProperty('macros')
      expect(report).toHaveProperty('summary')

      // Mantıklı değerler mi?
      expect(report.bmr).toBeGreaterThan(1000)
      expect(report.target_calories).toBeGreaterThan(report.tdee)
      // muscle_gain için hedef > TDEE olmalı
    })
  })
})