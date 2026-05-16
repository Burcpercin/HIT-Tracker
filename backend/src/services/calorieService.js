// Aktivite çarpanları — bilimsel sabitler
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.20,    // Masaüstü iş, neredeyse hareket yok
  light: 1.375,       // Haftada 1-3 gün hafif egzersiz
  moderate: 1.55,     // Haftada 3-5 gün orta egzersiz
  active: 1.725,      // Haftada 6-7 gün yoğun egzersiz
  very_active: 1.90   // Günde 2 antrenman veya çok ağır iş
}

// Hedefe göre kalori ayarları
const GOAL_ADJUSTMENTS = {
  muscle_gain: +400,  // Anabolik fazla — kas büyümesi için
  fat_loss: -500,     // Kalori açığı — yağ yakımı için
  strength: 0,        // İdame — güç koruma
  endurance: 0        // İdame — dayanıklılık
}

const calorieService = {

  // Doğum tarihinden yaş hesapla
  // Neden burada? Çünkü age'i veritabanında tutmuyoruz
  calculateAge(birthDate) {
    const today = new Date()
    const birth = new Date(birthDate)

    let age = today.getFullYear() - birth.getFullYear()

    // Henüz bu yılki doğum günü geçmediyse bir eksilt
    // Örnek: 2000 doğumlu, bugün Ocak 2026 → 25 yaşında, 26 değil
    const hasHadBirthdayThisYear =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() >= birth.getDate())

    if (!hasHadBirthdayThisYear) age--

    return age
  },

  // BMR hesapla — Mifflin-St Jeor formülü
  // Bu fonksiyon sadece sayılarla çalışır, veritabanı bilmez
  // → Unit test için ideal
  calculateBMR(weight_kg, height_cm, age, gender) {
    // Temel formül her iki cinsiyet için aynı
    const base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)

    // Cinsiyet farkı sadece son sabitte
    if (gender === 'male') return base + 5
    if (gender === 'female') return base - 161

    throw new Error('Gender must be male or female')
  },

  // TDEE hesapla — günlük toplam harcama
  calculateTDEE(bmr, activity_level) {
    const multiplier = ACTIVITY_MULTIPLIERS[activity_level]

    if (!multiplier) {
      throw new Error(
        `Invalid activity level. Valid: ${Object.keys(ACTIVITY_MULTIPLIERS).join(', ')}`
      )
    }

    return Math.round(bmr * multiplier)
  },

  // Hedefe göre kalori hesapla
  calculateTargetCalories(tdee, goal) {
    const adjustment = GOAL_ADJUSTMENTS[goal]

    if (adjustment === undefined) {
      throw new Error(
        `Invalid goal. Valid: ${Object.keys(GOAL_ADJUSTMENTS).join(', ')}`
      )
    }

    return tdee + adjustment
  },

  // Makro besin dağılımı hesapla
  // Protein, karbonhidrat, yağ gramajı
  calculateMacros(targetCalories, weight_kg, goal) {
    let proteinPerKg, fatPercent

    // Hedefe göre makro dağılımı değişir
    if (goal === 'muscle_gain') {
      proteinPerKg = 2.2   // Kas için yüksek protein
      fatPercent = 0.25    // Kalorilerin %25'i yağdan
    } else if (goal === 'fat_loss') {
      proteinPerKg = 2.5   // Kas korumak için daha yüksek protein
      fatPercent = 0.25
    } else {
      proteinPerKg = 2.0   // Standart güç/idame
      fatPercent = 0.30
    }

    // Protein gramı = vücut ağırlığı × katsayı
    const proteinGrams = Math.round(weight_kg * proteinPerKg)

    // Yağ gramı = (toplam kalori × yağ yüzdesi) / 9
    // 1 gram yağ = 9 kalori
    const fatGrams = Math.round((targetCalories * fatPercent) / 9)

    // Karbonhidrat gramı = kalan kalori / 4
    // 1 gram protein = 4 kalori, 1 gram karbonhidrat = 4 kalori
    const proteinCalories = proteinGrams * 4
    const fatCalories = fatGrams * 9
    const carbCalories = targetCalories - proteinCalories - fatCalories
    const carbGrams = Math.round(carbCalories / 4)

    return {
      protein_g: proteinGrams,
      carbs_g: carbGrams,
      fat_g: fatGrams
    }
  },

  // Ana fonksiyon — hepsini bir araya getirir
  // Profile ve goal alır, tam rapor döner
  calculateFullReport(profile, goal = 'strength') {
    const age = this.calculateAge(profile.birth_date)
    const bmr = this.calculateBMR(
      profile.weight_kg,
      profile.height_cm,
      age,
      profile.gender
    )
    const tdee = this.calculateTDEE(bmr, profile.activity_level)
    const targetCalories = this.calculateTargetCalories(tdee, goal)
    const macros = this.calculateMacros(targetCalories, profile.weight_kg, goal)

    return {
      age,
      bmr: Math.round(bmr),
      tdee,
      goal,
      target_calories: targetCalories,
      macros,
      // Kullanıcıya açıklama
      summary: this.buildSummary(goal, targetCalories, tdee)
    }
  },

  // Kullanıcıya okunabilir özet mesajı
  buildSummary(goal, targetCalories, tdee) {
    const diff = targetCalories - tdee
    const messages = {
      muscle_gain: `Eat ${targetCalories} kcal/day (+${diff} surplus). Feed the muscle, Mentzer style.`,
      fat_loss: `Eat ${targetCalories} kcal/day (${diff} deficit). Burn fat, keep the muscle.`,
      strength: `Eat ${targetCalories} kcal/day. Maintenance — pure strength focus.`,
      endurance: `Eat ${targetCalories} kcal/day. Maintenance — endurance focus.`
    }
    return messages[goal]
  }
}

module.exports = calorieService