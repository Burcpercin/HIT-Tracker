const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  // Header'dan token'ı al
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' })
  }

  try {
    // Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // userId ve username artık req.user'da
    next()
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' })
  }
}

module.exports = authMiddleware