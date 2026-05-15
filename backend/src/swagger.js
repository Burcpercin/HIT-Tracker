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
  },
  // Swagger yorumlarını hangi dosyalarda arayacak
  apis: ['./src/routes/*.js'],
}

module.exports = swaggerJsdoc(options)