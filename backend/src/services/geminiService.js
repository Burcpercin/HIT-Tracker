const { GoogleGenerativeAI } = require('@google/generative-ai')

// API key yoksa başlarken hata ver
if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. AI suggestions will not work.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const geminiService = {

  async generateWorkoutSuggestion(userProfile, currentProgram, goal) {

    // Kullanıcı verilerinden prompt oluştur
    // Ne kadar detaylı prompt → o kadar iyi cevap
    const prompt = `
      You are a fitness expert specializing in Mike Mentzer's 
      High Intensity Training (HIT) methodology.
      
      Create a personalized workout suggestion for this user:
      
      USER PROFILE:
      - Age: ${userProfile.age} years old
      - Weight: ${userProfile.weight_kg} kg
      - Height: ${userProfile.height_cm} cm
      - Gender: ${userProfile.gender}
      - Activity Level: ${userProfile.activity_level}
      - Goal: ${goal || 'muscle_gain'}
      
      CURRENT PROGRAM:
      ${currentProgram 
        ? `Program Name: ${currentProgram.name}
           Days per week: ${currentProgram.days_per_week}
           Exercises: ${JSON.stringify(currentProgram.exercises)}`
        : 'No current program'
      }
      
      Please provide:
      1. A brief assessment of their current situation
      2. A recommended HIT workout split (max 3 days/week, Mentzer style)
      3. Top 5 exercises for their goal with sets and rest recommendations
      4. Recovery and nutrition tips aligned with HIT principles
      5. One motivational insight from Mike Mentzer's philosophy
      
      Keep response concise and practical. Format with clear sections.
    `

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      // gemini-1.5-flash → hızlı ve ücretsiz model

      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      return {
        suggestion: text,
        generated_at: new Date().toISOString(),
        based_on: {
          profile: userProfile,
          goal: goal || 'muscle_gain',
          has_current_program: !!currentProgram
        }
      }
    } catch (err) {
      // Gemini API hatası tüm uygulamayı çökertmesin
      throw new Error(`AI suggestion failed: ${err.message}`)
    }
  },

  async generateNutritionTip(calories, macros, goal) {
    const prompt = `
      As a nutrition expert following Mike Mentzer's principles,
      give a brief, practical nutrition tip for someone with:
      
      - Daily calorie target: ${calories} kcal
      - Protein: ${macros.protein_g}g
      - Carbs: ${macros.carbs_g}g  
      - Fat: ${macros.fat_g}g
      - Goal: ${goal}
      
      Give 3 specific, actionable tips. Be direct and concise.
      Maximum 150 words.
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