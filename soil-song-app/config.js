/**
 * SoilSong App Configuration
 * 
 * Central configuration file for the SoilSong mobile application
 * Edit this file to customize your app settings
 */

// API connection settings
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine if we're running in development or production
const isDevelopment = __DEV__;

// Production server URL - REPLACE THIS with your actual deployed backend URL
const PRODUCTION_SERVER_URL = 'https://your-deployed-backend-url.com';

// List of possible server addresses to try during development
const DEV_SERVER_ADDRESSES = [
  'http://192.168.31.73:3000', // Your computer's IP on your network
  'http://localhost:3000',     // Works for web and iOS simulators
  'http://10.0.2.2:3000',      // Android emulator special case for localhost
  'http://127.0.0.1:3000'      // Another localhost variant
];

// Use development URLs in dev mode, production URL in production
export const API_URLS = isDevelopment 
  ? DEV_SERVER_ADDRESSES 
  : [PRODUCTION_SERVER_URL];
  

// Default URL - Use production URL in production builds
export const API_BASE_URL = isDevelopment 
  ? DEV_SERVER_ADDRESSES[0] 
  : PRODUCTION_SERVER_URL;

// App behavior settings
export const DEFAULT_PH_VALUE = 7.0;
export const DEFAULT_MOISTURE_VALUE = 50;
export const MAX_IMAGE_WIDTH = 800;
export const MAX_IMAGE_HEIGHT = 600;

// App display settings
export const APP_TITLE = "SoilSong";
export const APP_SUBTITLE = "Turn your soil into a song";
export const APP_VERSION = "1.0.0";

// Theme colors
export const COLORS = {
  primary: "#4CAF50",
  secondary: "#8BC34A",
  accent: "#FFC107",
  background: "#FFFFFF",
  text: "#212121",
  lightText: "#757575",
  error: "#F44336",
};

// Comprehensive theme object with all styling properties
export const THEME = {
  colors: {
    primary: "#44a08d",
    primaryLight: "#78c2b0",
    primaryDark: "#2d7362",
    secondary: "#5d9c59",
    accent: "#8cb369",
    background: "#f5f7fa",
    card: "#ffffff",
    cardBackground: "#ffffff",
    error: "#e74c3c",
    warning: "#f39c12",
    success: "#2ecc71",
    text: {
      primary: "#333333",
      secondary: "#666666",
      light: "#999999",
      inverse: "#ffffff",
      accent: "#44a08d"
    },
    gradient: {
      primary: ["#44a08d", "#5d9c59"],
      secondary: ["#5d9c59", "#8cb369"]
    }
  },
  spacing: {
    xxs: 2,
    xs: 4,
    s: 8,
    m: 12, 
    l: 16,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 16,
    xl: 24,
    round: 100
  },
  typography: {
    fontSize: {
      xs: 12,
      s: 14,
      m: 16,
      l: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32
    },
    lineHeight: {
      s: 18,
      m: 24,
      l: 28,
      xl: 32
    }
  },
  shadows: {
    small: {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 5,
    },
    large: {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.2,
      shadowRadius: 7,
      elevation: 10,
    }
  }
};