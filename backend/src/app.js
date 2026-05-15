const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./swagger')
require('dotenv').config()

// 1. Route ve Middleware
const authRoutes = require('./routes/authRoutes')
const exerciseRoutes = require('./routes/exerciseRoutes')
const authMiddleware = require('./middleware/authMiddleware')

const app = express()

// Global Middleware'ler
app.use(cors())
app.use(express.json()) // JSON verilerini okuyabilmek için şart

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// --- ROUTES (Endpoints) ---

// 4. Public Routes (Token gerektirmeyen, herkesin erişebildiği rotalar)
app.use('/api/auth', authRoutes)

// 5. Protected Routes (authMiddleware ile korunan rotalar)
app.use('/api/exercises', authMiddleware, exerciseRoutes)

// 6. Health Check (Sunucunun ayakta olduğunu test etmek için)
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