@echo off
REM Double-cliquez sur ce fichier pour construire l APK Android.
REM Il appelle construire.ps1, qui fait tout le travail.
title Saramaya Transport - Construction Android
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0construire.ps1"
echo.
pause
