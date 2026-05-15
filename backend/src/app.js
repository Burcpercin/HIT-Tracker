const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./swagger')
require('dotenv').config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Routes (şimdilik boş, dolduracağız)
const exerciseRoutes = require('./routes/exerciseRoutes')
app.use('/api/exercises', exerciseRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'HIT Tracker is running' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`)
})

module.exports = app