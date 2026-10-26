# FleetCommand Driver Companion App (Android React Native + Expo)

This folder contains the standalone React Native + Expo Android Driver Companion App implementing Section 4, 9, and 11 of the **Fleet Management & Live Bus Tracking — Production Implementation Plan v2.0**.

## Option A: Install Instant Mobile Web App (PWA) on Any Phone (Zero Build Needed)
1. Open Chrome on any Android phone (Xiaomi, Redmi, Vivo, Oppo, Realme, Samsung, Motorola) and visit:
   `https://ais-pre-zwblw3twuknc6j2qlkzzfj-383411244495.asia-east1.run.app/?mode=driver`
2. Tap **"Install Driver App on Phone"** (or Chrome menu -> **Add to Home screen / Install app**).
3. Launch **FleetCmd** from your Android home screen, select your Driver ID & Bus, verify the 30-second Pre-Trip Checklist, and tap **Start Continuous 5s Live GPS Tracking**.

## Option B: Build Standalone Native Android `.apk` via Expo EAS
1. Extract `mobile-driver-app.tar.gz` and install dependencies:
   ```bash
   cd mobile-driver-app
   npm install
   ```
2. Build a direct-installable `.apk` using Expo Application Services (EAS):
   ```bash
   npx eas-cli login
   npx eas-cli build -p android --profile preview
   ```
3. Or build locally with Android Studio / Gradle:
   ```bash
   npx expo prebuild -p android
   cd android && ./gradlew assembleRelease
   ```
