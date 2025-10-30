#!/bin/bash

# Test script for IBM Cloud authentication and API access
# This script will:
# 1. Generate an IBM Cloud IAM token using your API key
# 2. Use that token to make a test request to the IBM Granite API

# Load environment variables from .env file
set -a
source .env
set +a

echo "========================================"
echo "    IBM Cloud Authentication Test"
echo "========================================"
echo


echo "Step 1: Generating IBM Cloud IAM token"
echo "--------------------------------------"

# Get IBM Cloud IAM token using API key
TOKEN_RESPONSE=$(curl -s -X POST \
  "https://iam.cloud.ibm.com/identity/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=$IBM_API_KEY")

# Extract and save the access token
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "⛔️ ERROR: Failed to get access token!"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
else
  echo "✅ Access token successfully generated!"
  echo
fi

echo "Step 2: Testing IBM Granite API with the token"
echo "---------------------------------------------"

# Create a simple test payload for the Granite API
TEST_INPUT='{"input": "Hello, test a simple completion", "parameters": {"decoding_method": "greedy", "max_new_tokens": 100}, "model_id": "ibm/granite-13b-instruct-v2", "project_id": "'$IBM_PROJECT_ID'"}'

# Make the API request with the token
API_RESPONSE=$(curl -s -X POST \
  "$IBM_API_URL?version=$IBM_API_VERSION" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "$TEST_INPUT")

# Check if the API response contains results
if echo "$API_RESPONSE" | grep -q '"results"'; then
  echo "✅ Successfully connected to IBM Granite API!"
  echo "First few characters of response:"
  echo "$API_RESPONSE" | head -c 200
  echo "..."
else
  echo "⛔️ ERROR: Failed to get proper response from IBM Granite API"
  echo "Response: $API_RESPONSE"
fi

echo
echo "Test complete."