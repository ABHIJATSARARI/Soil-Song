const { logger } = require('../utils/logger');

/**
 * Generate a mock soil story using predefined templates
 * @param {Object} soilData - Soil data including pH and moisture values
 * @param {String} soilData.pH - Soil pH value
 * @param {String} soilData.moisture - Soil moisture percentage
 * @param {String} [soilData.imageAnalysis] - Optional image analysis text
 * @returns {Promise<Object>} - Generated story and analysis
 */
const generateMockSoilStory = async (soilData) => {
  try {
    const { pH, moisture, imageAnalysis } = soilData;
    
    
    logger.info(`Generating mock soil story for pH: ${pH}, moisture: ${moisture}`);
    
    // Parse values as numbers for comparison
    const pHValue = parseFloat(pH);
    const moistureValue = parseFloat(moisture);
    
    // Determine soil health
    let score = 0;
    let category = '';
    
    // pH scoring (0-50 points)
    if (pHValue >= 6.0 && pHValue <= 7.5) {
      // Ideal pH range
      score += 50;
    } else if (pHValue >= 5.5 && pHValue < 6.0) {
      // Slightly acidic
      score += 40;
    } else if (pHValue > 7.5 && pHValue <= 8.0) {
      // Slightly alkaline
      score += 40;
    } else if (pHValue >= 5.0 && pHValue < 5.5) {
      // Moderately acidic
      score += 30;
    } else if (pHValue > 8.0 && pHValue <= 8.5) {
      // Moderately alkaline
      score += 30;
    } else {
      // Extremely acidic or alkaline
      score += 20;
    }
    
    // Moisture scoring (0-50 points)
    if (moistureValue >= 40 && moistureValue <= 60) {
      // Ideal moisture
      score += 50;
    } else if (moistureValue >= 30 && moistureValue < 40) {
      // Slightly dry
      score += 40;
    } else if (moistureValue > 60 && moistureValue <= 70) {
      // Slightly moist
      score += 40;
    } else if (moistureValue >= 20 && moistureValue < 30) {
      // Moderately dry
      score += 30;
    } else if (moistureValue > 70 && moistureValue <= 80) {
      // Moderately moist
      score += 30;
    } else {
      // Extremely dry or wet
      score += 20;
    }
    
    // Determine category
    if (score >= 90) {
      category = 'excellent';
    } else if (score >= 70) {
      category = 'good';
    } else if (score >= 50) {
      category = 'fair';
    } else if (score >= 30) {
      category = 'poor';
    } else {
      category = 'very poor';
    }
    
    // Generate issues
    const issues = [];
    
    if (pHValue < 6.0) {
      issues.push({
        description: "Acidic soil may limit nutrient availability, particularly phosphorus, calcium, and magnesium",
        severity: pHValue < 5.0 ? "high" : "medium"
      });
    }
    
    if (pHValue > 7.5) {
      issues.push({
        description: "Alkaline soil may cause deficiencies of micronutrients like iron, manganese, and zinc",
        severity: pHValue > 8.0 ? "high" : "medium"
      });
    }
    
    if (moistureValue < 30) {
      issues.push({
        description: "Soil is too dry, which will stress most plants and reduce microbial activity",
        severity: moistureValue < 20 ? "high" : "medium"
      });
    }
    
    if (moistureValue > 70) {
      issues.push({
        description: "Soil is too wet, which may lead to root rot and anaerobic conditions",
        severity: moistureValue > 80 ? "high" : "medium"
      });
    }
    
    // Limit to 3 issues max
    issues.splice(3);
    
    // Generate recommendations
    const recommendations = [];
    
    if (pHValue < 6.0) {
      recommendations.push({
        action: "Add garden lime",
        details: "Apply agricultural lime to raise soil pH. Typically 50g per square meter will raise pH by about 0.5 units."
      });
    }
    
    if (pHValue > 7.5) {
      recommendations.push({
        action: "Add sulfur or acidic organic matter",
        details: "Add elemental sulfur or acidic organic materials like pine needles and oak leaves to lower soil pH gradually."
      });
    }
    
    if (moistureValue < 30) {
      recommendations.push({
        action: "Improve water retention",
        details: "Add organic matter like compost to improve water retention and apply mulch to reduce evaporation."
      });
    }
    
    if (moistureValue > 70) {
      recommendations.push({
        action: "Improve drainage",
        details: "Add coarse sand or perlite to improve drainage. Consider raised beds for severe cases."
      });
    }
    
    // Add a universal recommendation
    recommendations.push({
      action: "Add compost regularly",
      details: "Work in 1-2 inches of compost annually to improve soil structure, nutrient content, and microbial activity."
    });
    
    // Limit to 4 recommendations max
    recommendations.splice(4);
    
    // Generate suitable plants based on pH and moisture
    const suitablePlants = [];
    
    // pH-based plant suggestions
    if (pHValue < 6.0) {
      suitablePlants.push("blueberries", "azaleas", "rhododendrons", "camellias");
    } else if (pHValue >= 6.0 && pHValue <= 7.0) {
      suitablePlants.push("tomatoes", "peppers", "beans", "cucumbers", "strawberries");
    } else {
      suitablePlants.push("lavender", "thyme", "rosemary", "clematis");
    }
    
    // Moisture-based plant suggestions
    if (moistureValue < 30) {
      suitablePlants.push("succulents", "lavender", "yarrow", "sage");
    } else if (moistureValue >= 30 && moistureValue <= 60) {
      suitablePlants.push("zinnias", "marigolds", "cosmos", "sunflowers");
    } else {
      suitablePlants.push("iris", "ferns", "hostas", "astilbe");
    }
    
    // Remove duplicates and limit to 6 plants
    const uniquePlants = [...new Set(suitablePlants)].slice(0, 6);
    
    // Generate story text based on soil properties
    let story = `Your soil has a story to tell, and it's one of ${category} potential. With a pH of ${pH}, `;
    
    if (pHValue < 6.0) {
      story += "your soil is on the acidic side. This acidic nature was likely developed over time as organic matter decomposed and released acids into the soil. ";
    } else if (pHValue > 7.5) {
      story += "your soil leans toward alkalinity. This often indicates the presence of limestone or calcium-rich parent material in your region's geology. ";
    } else {
      story += "your soil has a nearly neutral pH, providing an excellent balance for nutrient availability. This balanced pH suggests a history of good organic matter management. ";
    }
    
    story += `The moisture level of ${moisture}% `;
    
    if (moistureValue < 30) {
      story += "indicates a relatively dry soil environment. This soil likely drains quickly, which can be beneficial for some plants but challenging for others. ";
    } else if (moistureValue > 70) {
      story += "reveals a soil that retains significant moisture. This suggests clay content or good organic matter, though it may pose drainage challenges. ";
    } else {
      story += "shows a well-balanced water content—neither too dry nor overly saturated. This ideal moisture level supports diverse microbial life and provides a comfortable environment for plant roots. ";
    }
    
    story += "Soil is not just dirt—it's a living ecosystem with billions of microorganisms working together. ";
    
    if (score >= 70) {
      story += "Your soil appears to have a healthy ecosystem supporting these microorganisms, creating a welcoming environment for plants. The nutrients in your soil interact in complex ways, with minerals binding and releasing based on your specific pH and moisture levels. ";
    } else {
      story += "Your soil ecosystem may be facing some challenges that affect how nutrients are cycled and made available to plants. The balance of nutrients can be improved through thoughtful amendments tailored to your soil's specific needs. ";
    }
    
    // Add image-based insights if available
    if (imageAnalysis) {
      story += `The visual examination of your soil sample reveals ${imageAnalysis}, which aligns with the measured pH and moisture values. `;
    }
    
    story += "With proper care and attention to its specific needs, your soil can become even more vibrant and productive, supporting a wide range of plant life while sequestering carbon and supporting biodiversity for years to come.";
    
    // Return the complete mock soil story data
    return {
      story,
      soil_health: {
        score,
        category,
        max_score: 100
      },
      issues,
      recommendations,
      suitable_plants: uniquePlants
    };
    
  } catch (error) {
    logger.error(`Error generating mock soil story: ${error.message}`);
    throw new Error(`Failed to generate mock soil story: ${error.message}`);
  }
};

module.exports = { generateMockSoilStory };