const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Health check - "sunucu çalışıyor mu?" kontrolü
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'HIT Tracker is running' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

module.exports = app