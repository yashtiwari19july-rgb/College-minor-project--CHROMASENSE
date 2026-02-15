# ChromaSense: Smart Colour System Palette Recommendation System

A web application that analyzes your skin tone from a captured photo and provides personalized fashion color recommendations.

## Features

- **User Authentication**: Login and Signup pages with local storage
- **Gender Selection**: Choose from Male, Female, or Other
- **Camera Integration**: Capture photos directly from your device camera
- **Skin Tone Analysis**: Advanced image processing to detect skin tone
- **Color Recommendations**: Personalized color palette based on your skin tone
- **Fashion Tips**: Expert advice on colors that complement your complexion

## How to Use

1. **Sign Up/Login**: Create an account or login with existing credentials
2. **Select Gender**: Choose your gender preference
3. **Capture Photo**: Click "Open Camera" and capture your photo
4. **Analyze**: Click "Analyze & Get Recommendations" to get your personalized color palette
5. **View Results**: See your detected skin tone, recommended colors, and fashion tips

## Technology Stack

- HTML5
- CSS3 (with modern gradients and animations)
- Vanilla JavaScript
- Canvas API for image processing
- MediaDevices API for camera access

## Skin Tone Classifications

The system detects and classifies skin tones into:
- Deep
- Medium-Warm
- Medium-Cool
- Light-Warm
- Light-Cool
- Fair

Each classification comes with specific color recommendations and fashion tips.

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Requires camera permissions

## Setup

Simply open `index.html` in a modern web browser. No build process or server required (though HTTPS is recommended for camera access in production).

## Notes

- Camera access requires HTTPS in production environments
- For local testing, use `http://localhost` or enable insecure origins in browser settings
- All data is stored locally in browser localStorage

