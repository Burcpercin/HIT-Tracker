const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./swagger')
require('dotenv').config()

// 1. Route ve Middleware Importları
const authRoutes = require('./routes/authRoutes')
const exerciseRoutes = require('./routes/exerciseRoutes')
const sessionRoutes = require('./routes/workoutSessionRoutes')
const quoteRoutes = require('./routes/quoteRoutes')
const calorieRoutes = require('./routes/calorieRoutes')
const programRoutes = require('./routes/programRoutes')
const authMiddleware = require('./middleware/authMiddleware')

const app = express()

// 2. Global Middleware'ler
app.use(cors())
app.use(express.json())

// 3. Swagger UI 
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// --- ROUTES (Endpoints) ---

// 4. Public Routes (Token gerektirmeyen)
app.use('/api/auth', authRoutes)
app.use('/api/quotes', quoteRoutes) 

// 5. Protected Routes (Token gerektiren, authMiddleware ile korunan)
app.use('/api/exercises', authMiddleware, exerciseRoutes)
app.use('/api/sessions', authMiddleware, sessionRoutes)
app.use('/api/calories', authMiddleware, calorieRoutes)
app.use('/api/programs', authMiddleware, programRoutes)

// 6. Health Check 
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'HIT Tracker is running' })
})

// 7. Sunucuyu Başlatma
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`)
})

module.exports = app