const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const userRepository = require('../db/userRepository')

const authService = {

  async register(username, email, password) {
    // Email daha önce alınmış mı?
    const existingEmail = await userRepository.findByEmail(email)
    if (existingEmail) {
      throw new Error('Email already in use')
    }

    // Username daha önce alınmış mı?
    const existingUsername = await userRepository.findByUsername(username)
    if (existingUsername) {
      throw new Error('Username already taken')
    }

    // Şifreyi hashle (10 kez)
    const passwordHash = await bcrypt.hash(password, 10)

    // Kullanıcıyı kaydet
    const user = await userRepository.create(username, email, passwordHash)

    // Token üret
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    return { user, token }
  },

  async login(email, password) {
    // Kullanıcı var mı?
    const user = await userRepository.findByEmail(email)
    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Şifre doğru mu?
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      throw new Error('Invalid email or password')
    }

    // Token üret
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    return {
      user: { id: user.id, username: user.username, email: user.email },
      token
    }
  }
}

module.exports = authService