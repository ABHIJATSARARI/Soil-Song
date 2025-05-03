const axios = require('axios');
const { logger } = require('../utils/logger');

// IBM Cloud IAM token endpoint
const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';

// Token cache
let cachedToken = null;
let tokenExpiration = 0;

// Buffer time before token expiration (5 minutes in ms)
const EXPIRATION_BUFFER = 5 * 60 * 1000;

/**
 * Get a valid IAM access token, either from cache or by generating a new one
 * @returns {Promise<string>} - The access token
 */
const getAccessToken = async () => {
  try {
    // Check if we have a valid cached token
    const now = Date.now();
    if (cachedToken && tokenExpiration > now + EXPIRATION_BUFFER) {
      logger.debug('Using cached IBM Cloud IAM token');
      return cachedToken;
    }

    logger.info('Getting new IBM Cloud IAM token');

    // Using your IBM API key from environment variables
    const apiKey = process.env.IBM_API_KEY;
    
    if (!apiKey) {
      throw new Error('IBM API key is not configured in environment variables (IBM_API_KEY)');
    }

    // Request body for token generation
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
    params.append('apikey', apiKey);

    // Make the token request
    const response = await axios.post(IAM_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.access_token) {
      throw new Error('Invalid response from IBM IAM token service');
    }

    // Cache the token and calculate expiration time
    cachedToken = response.data.access_token;
    
    // expires_in is in seconds, convert to milliseconds for comparison with Date.now()
    const expiresIn = response.data.expires_in * 1000;
    tokenExpiration = now + expiresIn;
    
    logger.info(`Successfully generated IBM Cloud IAM token (expires in ${Math.round(expiresIn / 60000)} minutes)`);
    
    return cachedToken;
  } catch (error) {
    logger.error(`Error getting IBM Cloud IAM token: ${error.message}`);
    throw new Error(`Failed to get IBM Cloud access token: ${error.message}`);
  }
};

/**
 * Force refresh the token even if it hasn't expired yet
 * Useful for testing or if the current token is rejected
 */
const forceRefreshToken = async () => {
  // Clear the cache to force a new token generation
  cachedToken = null;
  tokenExpiration = 0;
  return await getAccessToken();
};

module.exports = {
  getAccessToken,
  forceRefreshToken
};