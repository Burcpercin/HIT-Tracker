const { GoogleGenerativeAI } = require('@google/generative-ai')

if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. AI suggestions will not work.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const GOAL_LABELS = {
  muscle_gain: 'building muscle mass',
  fat_loss:    'losing body fat',
  weight_loss: 'losing weight',
  strength:    'gaining strength',
  endurance:   'improving endurance and conditioning'
}

const DAY_NAMES = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
}

const geminiService = {

  async generateWorkoutSuggestion(userProfile, preferences) {
    const { days_per_week, available_days, goal, experience_level, equipment, injuries } = preferences

    const dayNames = available_days
      ? available_days.map(d => DAY_NAMES[d]).join(', ')
      : 'Not specified'

    const prompt = `
You are a fitness coach specializing in Mike Mentzer's High Intensity Training.
Create a COMPLETE workout program for this person.

PROFILE:
- Age: ${userProfile.age} | Weight: ${userProfile.weight_kg}kg | Gender: ${userProfile.gender}
- Goal: ${GOAL_LABELS[goal] || goal}
- Experience: ${experience_level}
- Equipment: ${equipment}
- Training days: ${dayNames}
${injuries ? `- Injuries: ${injuries}` : ''}

RULES:
- HIT style: 1-2 sets per exercise, train to failure
- Max 4-5 exercises per day
- Include rest days between muscle groups

OUTPUT FORMAT (be concise, follow exactly):

PROGRAM: [name]

[DAY NAME] — [Muscle Groups]
- Exercise Name — X sets × X reps
- Exercise Name — X sets × X reps

[DAY NAME] — [Muscle Groups]
- Exercise Name — X sets × X reps

REST DAYS: [list rest days]

KEY PRINCIPLE: [one sentence from Mentzer philosophy]

Nothing else. No intro, no explanations.
    `

    try {
      const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const result = await model.generateContent(prompt)
      const text   = result.response.text()
      return {
        suggestion:       text,
        generated_at:     new Date().toISOString(),
        preferences_used: { days_per_week, available_days: dayNames, goal }
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
        tip:          result.response.text(),
        generated_at: new Date().toISOString()
      }
    } catch (err) {
      throw new Error(`Nutrition tip failed: ${err.message}`)
    }
  }
}

module.exports = geminiService
