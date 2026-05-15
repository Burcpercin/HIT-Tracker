const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HIT Tracker API',
      version: '1.0.0',
      description: 'Mike Mentzer High Intensity Training tracker API',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    // JWT için güvenlik tanımı
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    // Tüm endpoint'lere varsayılan olarak uygula
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
}

module.exports = swaggerJsdoc(options)