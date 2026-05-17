const { GoogleGenerativeAI } = require('@google/generative-ai')

if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. AI suggestions will not work.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Hedef → okunabilir metin
const GOAL_LABELS = {
  muscle_gain: 'building muscle mass',
  fat_loss: 'losing body fat',
  weight_loss: 'losing weight',
  strength: 'gaining strength',
  endurance: 'improving endurance and conditioning'
}

// Deneyim → okunabilir metin
const EXPERIENCE_LABELS = {
  beginner: 'beginner (less than 1 year)',
  intermediate: 'intermediate (1-3 years)',
  advanced: 'advanced (3+ years)'
}

// Ekipman → okunabilir metin
const EQUIPMENT_LABELS = {
  gym: 'full gym with all equipment',
  home: 'home workout with minimal equipment',
  both: 'both gym and home equipment available'
}

// Gün numarası → isim
const DAY_NAMES = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
}

const geminiService = {

  async generateWorkoutSuggestion(userProfile, preferences) {
    const {
      days_per_week,
      available_days,
      goal,
      experience_level,
      equipment,
      injuries,
    } = preferences

    // Müsait günleri isme çevir
    const dayNames = available_days
      ? available_days.map(d => DAY_NAMES[d]).join(', ')
      : 'Not specified'

    const prompt = `
      You are Mike Mentzer himself — the legend of High Intensity Training.
      Speak with confidence and authority. Be direct, science-based, and motivating.
      
      Create a PERSONALIZED HIT workout plan for this person:
      
      ═══ PHYSICAL PROFILE ═══
      Age: ${userProfile.age} years old
      Weight: ${userProfile.weight_kg} kg
      Height: ${userProfile.height_cm} cm
      Gender: ${userProfile.gender}
      
      ═══ SCHEDULE PREFERENCES ═══
      Available days per week: ${days_per_week}
      Preferred training days: ${dayNames}
      
      ═══ GOALS & BACKGROUND ═══
      Primary goal: ${GOAL_LABELS[goal] || goal}
      Experience level: ${EXPERIENCE_LABELS[experience_level] || experience_level}
      Available equipment: ${EQUIPMENT_LABELS[equipment] || equipment}
      Injuries or limitations: ${injuries || 'None mentioned'}
      
      ═══ PROVIDE THE FOLLOWING ═══
      
      1. ASSESSMENT
         Brief honest assessment of their situation and what they need.
      
      2. WEEKLY SCHEDULE
         Show exactly which days they train and which days they rest.
         Example: Monday (Train), Tuesday (Rest), Wednesday (Train)...
      
      3. WORKOUT PLAN
         For each training day list:
         - Exercise name
         - Sets (Mentzer style: 1-2 working sets)
         - Rep range
         - Rest between sessions for that muscle group
      
      4. KEY PRINCIPLES
         3 HIT principles they must follow for this specific goal.
      
      5. RECOVERY PROTOCOL
         Sleep, rest days, and recovery tips specific to their schedule.
      
      6. MENTZER'S WORD
         One powerful quote or insight from Mike Mentzer's philosophy
         that directly applies to this person's situation.
      
      Be specific. No generic advice. Talk directly to this person.
      Format clearly with the section headers shown above.
    `

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(prompt)
      const text = result.response.text()

      return {
        suggestion: text,
        generated_at: new Date().toISOString(),
        preferences_used: {
          days_per_week,
          available_days: dayNames,
          goal: GOAL_LABELS[goal] || goal,
          experience_level: EXPERIENCE_LABELS[experience_level] || experience_level,
          equipment: EQUIPMENT_LABELS[equipment] || equipment
        }
      }
    } catch (err) {
      throw new Error(`AI suggestion failed: ${err.message}`)
    }
  },

  async generateNutritionTip(calories, macros, goal, weight_kg) {
    const prompt = `
      You are Mike Mentzer giving direct nutrition advice.
      
      This person's data:
      - Goal: ${GOAL_LABELS[goal] || goal}
      - Body weight: ${weight_kg} kg
      - Daily calorie target: ${calories} kcal
      - Protein: ${macros.protein_g}g per day
      - Carbohydrates: ${macros.carbs_g}g per day
      - Fat: ${macros.fat_g}g per day
      
      Give exactly 3 specific, actionable nutrition tips for their goal.
      Reference their exact numbers (calories, macros) in your tips.
      Be direct. Maximum 200 words total.
      No fluff, no generic advice.
    `

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(prompt)
      return {
        tip: result.response.text(),
        generated_at: new Date().toISOString()
      }
    } catch (err) {
      throw new Error(`Nutrition tip failed: ${err.message}`)
    }
  }
}

module.exports = geminiService