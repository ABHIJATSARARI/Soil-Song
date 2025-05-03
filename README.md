# SoilSong AI 🎵🌱  
**An AI-powered mobile app that tells the story of your soil.**  
Built for the 2025 Call for Code Hackathon – **Theme: Decent Work and Economic Growth**  
Addresses: **SDG 15 (Life on Land), SDG 8 (Decent Work and Economic Growth), and SDG 2 (Zero Hunger)**

---

<p align="center">
  <img src="https://github.com/ABHIJATSARARI/Soil-Song/blob/main/soil-song-app/assets/logo1.png" alt="OLifie Logo" width="300px">
</p>

---
## 📱 App Overview

**SoilSong AI** transforms raw soil data into **audio-based narratives** that educate and empower farmers.  
Users input basic soil metrics like pH and moisture—or upload a soil photo—and the app returns a **spoken story** and **actionable advice** to improve soil health and sustainable land use.

Designed for inclusivity and simplicity, especially in low-literacy, rural communities, the app speaks to farmers in a language they understand—literally and figuratively.

---

## 🌍 Sustainable Development Goals (SDGs) Addressed

- **SDG 15 – Life on Land**  
  Encourages regenerative agriculture and protects soil ecosystems.
- **SDG 8 – Decent Work and Economic Growth**  
  Enables better farming yields and promotes agritech-driven livelihoods.
- **SDG 2 – Zero Hunger**  
  Supports improved soil fertility, contributing to higher food security.

---

## 🧠 Powered by IBM Granite (watsonx.ai)

SoilSong AI uses **IBM Granite foundation models** through `watsonx.ai` to turn structured soil inputs into rich, localized stories:

- Converts numeric soil data (e.g., `pH: 5.3`, `moisture: low`) into human-readable messages like:  
  _"Your soil is a bit sour and dry today. It could use some compost and water soon!"_
  
- Outputs text is tailored with **prompt engineering** to fit a narrative style.

🔜 *Planned integrations (post-hackathon):*
- **Multilingual output using Granite LLMs**
- **Voice generation with Watson Text-to-Speech**
- **Image analysis with Watson Visual Recognition for soil texture detection**

---

## 🔧 Technologies Used

### Frontend (React Native – Expo)
- `expo-image-picker` – soil image selection
- `expo-av` – audio playback
- `axios` – API requests

### Backend (To deploy: IBM Cloud Functions or Flask)
- IBM watsonx.ai (Granite models) – story generation
- IBM Watson Text-to-Speech – audio (future phase)
- IBM Watson NLU – understanding soil context
- IBM Cloud Hosting – scalable cloud deployment

---

## 📦 Installation

```bash
git clone 'repo'
cd soilsong-ai
npm install
npx expo start


Scan the QR code using your Expo Go mobile app.

🧪 Testing Instructions
Enter a sample soil pH value (e.g., 6.4) and moisture percentage (e.g., 18).

(Optional) Upload a soil image.

Tap “Generate Soil Story.”

The app returns:

A personalized narrative (text)

(In future) A spoken version of the story

📁 Folder Structure
bash
Copy
Edit
/screens
  ├── HomeScreen.js        # Input form + optional photo
  └── ResultScreen.js      # Displays generated story + audio
App.js                     # Navigation
🔗 IBM Services Setup (Backend)
To connect IBM Cloud to your backend, follow these steps:

Create a Free IBM Cloud account

Enable the following services:

watsonx.ai with Granite models (prompt-based story generation)

Watson Natural Language Understanding

Watson Text-to-Speech (for voice, optional)

Watson Visual Recognition (optional)

🚀 Project Status
✅ MVP Completed
⏳ Text-to-Speech, language translation, and image analysis planned for future updates

“When the soil speaks, the farmer listens.” – SoilSong AI

vbnet
Copy
Edit
