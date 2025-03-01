const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const { version } = require('os');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const openapiPath = path.join(__dirname, '../../docs/openapi.yaml');
const openapiSpec = YAML.load(openapiPath);

// Configure Swagger UI with local assets
const swaggerOptions = {
  explorer: true,
  version: "2.0",
  customSiteTitle: 'Vehicle Tracking API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    validatorUrl: null,
    urls: [{
      url: '/api-docs/openapi.yaml',
      name: 'Vehicle Tracking API'
    }]
  },
  customJs: [
    'https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js',
    'https://unpkg.com/swagger-ui-dist@4/swagger-ui-standalone-preset.js'
  ],
  customCssUrl: [
    'https://unpkg.com/swagger-ui-dist@4/swagger-ui.css'
  ]
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openapiSpec, swaggerOptions));

// Serve raw OpenAPI spec
router.get('/openapi.yaml', (req, res) => {
  res.sendFile(openapiPath);
});

module.exports = router;
