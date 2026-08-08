#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

echo -e "\n\e[36mStarting Expo debug mode for the frontend...\e[0m"

# Set NODE_OPTIONS if you ever run into JS heap memory limits during development (optional)
export NODE_OPTIONS="--max-old-space-size=8192"

# Run Expo development server
npx expo start
