const validate = require('../src/middleware/validate')

// Middleware test etmek için sahte req, res, next oluşturuyoruz
// Gerçek Express nesneleri değil, ama aynı davranışı simüle eder
const mockReq = (body) => ({ body })
const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res) // zincirleme için
  res.json = jest.fn().mockReturnValue(res)
  return res
}
const mockNext = () => jest.fn()

describe('validate middleware', () => {

  describe('exercise validation', () => {

    test('passes valid exercise data', () => {
      const req = mockReq({
        name: 'Bench Press',
        muscle_group: 'Chest',
        required_rest_days: 5
      })
      const res = mockRes()
      const next = mockNext()

      validate.exercise(req, res, next)

      expect(next).toHaveBeenCalled()       // geçmeli
      expect(res.status).not.toHaveBeenCalled() // hata olmamalı
    })

    test('rejects empty name', () => {
      const req = mockReq({
        name: '',
        muscle_group: 'Chest',
        required_rest_days: 5
      })
      const res = mockRes()
      const next = mockNext()

      validate.exercise(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(next).not.toHaveBeenCalled()
    })

    test('rejects rest days below 3', () => {
      const req = mockReq({
        name: 'Bench Press',
        muscle_group: 'Chest',
        required_rest_days: 1
      })
      const res = mockRes()
      const next = mockNext()

      validate.exercise(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      const responseData = res.json.mock.calls[0][0]
      expect(responseData.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('3') // hata mesajında "3" geçmeli
        ])
      )
    })

    test('rejects name longer than 100 characters', () => {
      const req = mockReq({
        name: 'A'.repeat(101),
        muscle_group: 'Chest',
        required_rest_days: 5
      })
      const res = mockRes()
      const next = mockNext()

      validate.exercise(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('register validation', () => {

    test('passes valid register data', () => {
      const req = mockReq({
        username: 'mentzer_fan',
        email: 'test@test.com',
        password: 'secret123'
      })
      const res = mockRes()
      const next = mockNext()

      validate.register(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    test('rejects invalid email format', () => {
      const req = mockReq({
        username: 'mentzer_fan',
        email: 'not-an-email',
        password: 'secret123'
      })
      const res = mockRes()
      const next = mockNext()

      validate.register(req, res, next)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    test('rejects short password', () => {
      const req = mockReq({
        username: 'mentzer_fan',
        email: 'test@test.com',
        password: '123' // 6'dan kısa
      })
      const res = mockRes()
      const next = mockNext()

      validate.register(req, res, next)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('session validation', () => {

    test('passes valid session data', () => {
      const req = mockReq({ session_date: '2026-05-15' })
      const res = mockRes()
      const next = mockNext()

      validate.session(req, res, next)
      expect(next).toHaveBeenCalled()
    })

    test('rejects invalid date', () => {
      const req = mockReq({ session_date: 'not-a-date' })
      const res = mockRes()
      const next = mockNext()

      validate.session(req, res, next)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    test('rejects duration over 300 minutes', () => {
      const req = mockReq({
        session_date: '2026-05-15',
        duration_minutes: 999
      })
      const res = mockRes()
      const next = mockNext()

      validate.session(req, res, next)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })
})