const express = require('express');
const { generateStory, healthCheck } = require('../controllers/soilController');

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Generate soil story endpoint
router.post('/story', generateStory);

module.exports = router;