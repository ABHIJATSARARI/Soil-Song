const axios = require('axios');
const { logger } = require('../utils/logger');
const { getAccessToken, forceRefreshToken } = require('./ibmAuthService');

/**
 * Generate a soil story using IBM Granite LLM
 * @param {Object} soilData - Soil data including pH and moisture values
 * @param {String} soilData.pH - Soil pH value
 * @param {String} soilData.moisture - Soil moisture percentage
 * @param {String} [soilData.imageAnalysis] - Optional image analysis text
 * @returns {Promise<Object>} - Generated story and analysis
 */
const generateSoilStory = async (soilData) => {
  try {
    const { pH, moisture, imageAnalysis } = soilData;
    
    logger.info(`Generating soil story for pH: ${pH}, moisture: ${moisture}`);
    
    const url = process.env.IBM_API_URL + `?version=${process.env.IBM_API_VERSION}`;
    
    // Get a valid access token using the authentication service
    const accessToken = await getAccessToken();
    
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    };

    // Build the optional image analysis section if image data was provided
    const imageAnalysisSection = imageAnalysis 
      ? `The soil image shows ${imageAnalysis}. This visual evidence supports the findings from the pH and moisture data.`
      : '';
    
    // Following the recommended IBM Granite prompting format with Input/Output examples
    const input = `You are an expert soil scientist and storyteller, specialized in agricultural science, gardening, and plant biology. Your task is to analyze soil data and create an engaging narrative about what this soil reveals, along with practical recommendations.

SOIL DATA:
- pH Level: {pH_VALUE}
- Moisture Content: {MOISTURE_VALUE}%
{OPTIONAL_IMAGE_ANALYSIS}

INSTRUCTIONS:
1. Generate a personalized 'soil story' (300-400 words) that explains what this soil data reveals about the soil's history, current state, and potential. Make it educational but engaging, like the soil is telling its own story.

2. Create a soil health assessment with:
   - A numerical score (0-100)
   - A category label (excellent, good, fair, poor, or very poor)
   
3. Identify 0-3 potential issues with this soil based on its properties:
   - Each issue should have a description and severity (high, medium, or low)
   
4. Provide 2-4 practical recommendations for improving or maintaining this soil:
   - Each recommendation should have a clear action and additional details
   
5. Suggest 4-6 plants that would thrive in this soil based on its properties.

Format your response as a JSON object with the following structure:
{
  "story": "Your soil story text...",
  "soil_health": {
    "score": 75,
    "category": "good",
    "max_score": 100
  },
  "issues": [
    {"description": "Issue description", "severity": "medium"}
  ],
  "recommendations": [
    {"action": "Actionable step", "details": "More details on the action"}
  ],
  "suitable_plants": ["plant1", "plant2", "plant3"]
}

SOIL ANALYSIS GUIDELINES:
- pH Interpretation:
  - Very Acidic (0-5.5): Challenging for most plants except acid-lovers like blueberries
  - Slightly Acidic (5.5-6.5): Ideal for many fruits, vegetables, and flowers
  - Neutral (6.5-7.5): Good for most garden plants and vegetables
  - Alkaline (7.5+): Better for herbs and certain ornamentals, challenging for acid-loving plants

- Moisture Interpretation:
  - Very Dry (0-20%): Drought conditions, limited for most plants except succulents
  - Dry (20-40%): Requires regular watering for most plants
  - Moderate (40-60%): Ideal moisture for most garden plants
  - Moist (60-80%): Good for moisture-loving plants but potential drainage issues
  - Wet (80-100%): Suitable only for bog plants, likely drainage problems

Consider the interaction between pH and moisture in your analysis, as they affect nutrient availability and plant health together.

Input: {
  "pH": "6.5",
  "moisture": "45",
  "imageAnalysis": "dark brown color with visible organic matter"
}
Output: {
  "story": "Your soil tells a fascinating story of balance and potential. With a pH of 6.5, it sits in the sweet spot that many plants prefer—slightly acidic but close to neutral. The moisture level of 45% indicates a well-balanced water content, neither too dry nor overly saturated. This soil has likely developed over decades, gradually accumulating minerals and organic matter that create its current properties...",
  "soil_health": {
    "score": 78,
    "category": "good",
    "max_score": 100
  },
  "issues": [
    {
      "description": "Slightly low in nitrogen which may affect leaf growth of heavy feeding plants",
      "severity": "medium"
    },
    {
      "description": "Could benefit from additional organic matter to improve structure",
      "severity": "low"
    }
  ],
  "recommendations": [
    {
      "action": "Add compost",
      "details": "Mix in 2-3 inches of compost to increase organic matter and improve soil structure"
    },
    {
      "action": "Consider nitrogen-fixing cover crops",
      "details": "Plants like clover or beans can help naturally increase nitrogen levels"
    },
    {
      "action": "Mulch regularly",
      "details": "Apply 2-3 inches of organic mulch to help retain moisture and add nutrients as it breaks down"
    }
  ],
  "suitable_plants": [
    "tomatoes",
    "peppers",
    "marigolds",
    "zinnias",
    "cosmos",
    "lavender"
  ]
}

Input: {
  "pH": "${pH}",
  "moisture": "${moisture}"
  ${imageAnalysis ? `,"imageAnalysis": "${imageAnalysis}"` : ''}
}
Output:`;

    // IBM Granite payload
    const body = {
      input,
      parameters: {
        decoding_method: "greedy",
        max_new_tokens: 4000,
        min_new_tokens: 0,
        stop_sequences: [],
        repetition_penalty: 1
      },
      model_id: "ibm/granite-13b-instruct-v2",
      project_id: process.env.IBM_PROJECT_ID,
      moderations: {
        hap: {
          input: { enabled: true, threshold: 0.5 },
          output: { enabled: true, threshold: 0.5 }
        },
        pii: {
          input: { enabled: true, threshold: 0.5 },
          output: { enabled: true, threshold: 0.5 }
        }
      }
    };

    logger.info('Sending request to IBM Granite API');
    
    // Using axios for better error handling
    const response = await axios.post(url, body, { headers });
    
    // Log the response structure for debugging
    logger.debug(`IBM API response status: ${response.status}`);
    
    if (!response.data || !response.data.results || !response.data.results[0]) {
      throw new Error('Invalid or empty response structure from IBM API');
    }

    // Extract the generated content
    const generatedText = response.data.results[0].generated_text;
    
    // Log first part of the generated text for debugging
    logger.debug(`Generated text first 100 chars: ${generatedText ? generatedText.substring(0, 100) : 'EMPTY'}`);
    
    if (!generatedText || generatedText.trim() === '') {
      throw new Error('Empty response from IBM Granite API');
    }
    
    // Parse the JSON from the generated text
    try {
      // First try direct parsing in case the model returned clean JSON
      try {
        const soilStoryData = JSON.parse(generatedText);
        logger.info('Successfully parsed response as direct JSON');
        return soilStoryData;
      } catch (directParseError) {
        logger.debug('Response is not direct JSON, trying alternative parsing methods');
      }
      
      // Try to extract JSON from the text if direct parsing failed
      // Regular expression to find JSON object in the text
      const jsonRegex = /{[\s\S]*}/g;
      const match = generatedText.match(jsonRegex);
      
      if (match && match[0]) {
        try {
          const soilStoryData = JSON.parse(match[0]);
          logger.info('Successfully extracted and parsed JSON from text');
          return soilStoryData;
        } catch (jsonExtractError) {
          logger.debug('Extracted text is not valid JSON, attempting cleanup');
        }
      }
      
      // If we still don't have valid JSON, log the full response for debugging
      logger.error('Could not extract valid JSON from the response');
      logger.error(`Full generated text: ${generatedText}`);
      throw new Error('Failed to parse JSON from the generated text');
      
    } catch (parseError) {
      logger.error(`Error parsing the generated soil story JSON: ${parseError.message}`);
      logger.error(`Raw generated text: ${generatedText}`);
      throw new Error('Failed to parse the generated soil story');
    }
    
  } catch (error) {
    // If we get a 401 error, try to refresh the token and retry once
    if (error.response && error.response.status === 401) {
      try {
        logger.info('Got 401 Unauthorized, refreshing token and retrying...');
        await forceRefreshToken();
        // Recursive call with the same parameters after token refresh
        return await generateSoilStory(soilData);
      } catch (retryError) {
        logger.error(`Retry after token refresh failed: ${retryError.message}`);
      }
    }
    
    logger.error(`Error generating soil story: ${error.message}`);
    throw new Error(`Failed to generate soil story: ${error.message}`);
  }
};

module.exports = { generateSoilStory };