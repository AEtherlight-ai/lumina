#!/bin/bash

# Phase 1 Test Script
# This script helps test the system tray implementation after restart

echo "=========================================="
echo "Phase 1: System Tray Test Script"
echo "=========================================="
echo ""
echo "Prerequisites:"
echo "1. You have restarted your computer"
echo "2. All hung processes are cleared"
echo "3. Global hotkey registration is cleared"
echo ""
echo "This script will:"
echo "1. Navigate to lumina-desktop directory"
echo "2. Start the Tauri dev server"
echo "3. Wait for app to start in system tray"
echo ""
echo "Expected behavior:"
echo "- App appears in system tray (no window)"
echo "- Console shows: '✅ Global hotkey registered'"
echo "- Console shows: '🚀 Lumina running in system tray'"
echo "- Ctrl+Alt+R triggers hotkey from any app"
echo ""
read -p "Press Enter to start the test..."

cd "$(dirname "$0")"
echo ""
echo "Starting Tauri dev server..."
echo "=========================================="
npm run tauri dev
