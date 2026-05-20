const express = require('express')
const cors = require('cors')
const path = require('path')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./swagger')
require('dotenv').config()

const authRoutes = require('./routes/authRoutes')
const exerciseRoutes = require('./routes/exerciseRoutes')
const sessionRoutes = require('./routes/workoutSessionRoutes')
const quoteRoutes = require('./routes/quoteRoutes')
const calorieRoutes = require('./routes/calorieRoutes')
const programRoutes = require('./routes/programRoutes')
const geminiRoutes = require('./routes/geminiRoutes')
const authMiddleware = require('./middleware/authMiddleware')

const app = express()

// 1. Global Middleware
app.use(cors())
app.use(express.json())
app.use('/images', express.static(
  path.join(__dirname, 'db', 'exercises_data')
))


// 2. Statik dosyalar — route'lardan ÖNCE gelmeli
app.use(express.static(path.join(__dirname, '../../frontend')))

// 3. Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// 4. Public Routes
app.use('/api/auth', authRoutes)
app.use('/api/quotes', quoteRoutes)

// 5. Protected Routes
app.use('/api/exercises', authMiddleware, exerciseRoutes)
app.use('/api/sessions', authMiddleware, sessionRoutes)
app.use('/api/calories', authMiddleware, calorieRoutes)
app.use('/api/programs', authMiddleware, programRoutes)
app.use('/api/ai', authMiddleware, geminiRoutes)

// 6. Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'HIT Tracker is running' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`)
})

module.exports = app