#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status (Equivalent to $ErrorActionPreference = "Stop")

echo -e "\e[36mBuilding Android release APK...\e[0m"

# 1. Set Environment Variables
# REPLACE /path/to/your/android-sdk WITH YOUR ACTUAL SDK PATH (e.g. $HOME/Android/Sdk)
export ANDROID_HOME=${ANDROID_HOME:-"$HOME/Android/ndk"}
export ANDROID_SDK_ROOT=$ANDROID_HOME
export NODE_OPTIONS="--max-old-space-size=8192"

# 2. Run Expo Prebuild if android folder doesn't exist
if [ ! -d "android" ]; then
    echo -e "\e[33mRunning expo prebuild...\e[0m"
    npx expo prebuild
fi

# 3. Clean stale build artifacts in android/app/build
stale_dirs=(
    "android/app/build"
)

for dir in "${stale_dirs[@]}"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo "Cleaned: $dir"
    fi
done

# 4. Pre-create codegen directory structure to work around React Native codegen bug
codegen_dirs=(
    "node_modules/react-native-screens/android/build/generated/source/codegen/jni/react/renderer/components/rnscreens"
    "node_modules/react-native-gesture-handler/android/build/generated/source/codegen/jni/react/renderer/components/rngesturehandler"
)

for dir in "${codegen_dirs[@]}"; do
    mkdir -p "$dir"
done

# 5. Build Release APK using Linux Gradle Wrapper
cd android

# Ensure the Gradle wrapper has execute permissions
chmod +x gradlew

./gradlew assembleRelease

cd ..

echo -e "\e[32mDone! APK at: android/app/build/outputs/apk/release/app-release.apk\e[0m"
