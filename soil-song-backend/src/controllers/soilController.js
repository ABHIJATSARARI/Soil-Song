const { generateSoilStory } = require('../services/graniteAiService');
const { generateMockSoilStory } = require('../services/mockGraniteService');
const { generateAudio } = require('../services/ttsService');
const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Flag to control whether to use mock service or real service
const USE_MOCK_SERVICE = false; // Set to false to use real IBM Granite service

/**
 * Generate a soil story based on soil data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateStory = async (req, res) => {
  try {
    // Extract soil data from request body
    const { pH, moisture, base64Image } = req.body;
    
    // Validate input data
    if (!pH || !moisture) {
      return res.status(400).json({ 
        error: 'Missing required parameters: pH and moisture are required' 
      });
    }
    
    // Parse numbers and validate ranges
    const parsedPH = parseFloat(pH);
    const parsedMoisture = parseFloat(moisture);
    
    if (isNaN(parsedPH) || parsedPH < 0 || parsedPH > 14) {
      return res.status(400).json({ 
        error: 'Invalid pH value: must be a number between 0 and 14' 
      });
    }
    
    if (isNaN(parsedMoisture) || parsedMoisture < 0 || parsedMoisture > 100) {
      return res.status(400).json({ 
        error: 'Invalid moisture value: must be a percentage between 0 and 100' 
      });
    }

    // Process image if provided
    let imageAnalysis = '';
    if (base64Image) {
      logger.info('Processing base64 image');
      
      // To keep this example simpler, we'll save the image but not process it for analysis
      // In a production app, you might send the image to another AI service for analysis
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const uploadDir = path.join(__dirname, '../../', process.env.UPLOAD_PATH);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Save image with unique filename
      const imageName = `soil_${Date.now()}.jpg`;
      const imagePath = path.join(uploadDir, imageName);
      
      fs.writeFileSync(imagePath, imageBuffer);
      logger.info(`Saved image to ${imagePath}`);
      
      // In a real implementation, you would analyze the image here
      // For this example, we'll just add a simple note
      imageAnalysis = 'a soil sample with visible texture and coloration';
    }

    // Generate soil story using the appropriate service
    const soilData = {
      pH: parsedPH.toString(),
      moisture: parsedMoisture.toString(),
      imageAnalysis
    };
    
    // Use mock service or real service based on the flag
    const storyData = USE_MOCK_SERVICE 
      ? await generateMockSoilStory(soilData)
      : await generateSoilStory(soilData);
    
    // Generate audio from the soil story text
    const audioUri = await generateAudio(storyData.story);
    
    // Return the story, audio URI, and analysis
    return res.status(200).json({
      story: storyData.story,
      audioUri,
      analysis: {
        soil_health: storyData.soil_health,
        issues: storyData.issues,
        recommendations: storyData.recommendations,
        suitable_plants: storyData.suitable_plants
      }
    });
    
  } catch (error) {
    logger.error(`Error in generateStory controller: ${error.message}`);
    return res.status(500).json({ error: `Failed to generate soil story: ${error.message}` });
  }
};

/**
 * Health check for the API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const healthCheck = (req, res) => {
  return res.status(200).json({ 
    status: 'ok', 
    service: 'soil-song-api',
    mode: USE_MOCK_SERVICE ? 'mock' : 'production'
  });
};

module.exports = { generateStory, healthCheck };