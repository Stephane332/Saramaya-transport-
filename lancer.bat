@echo off
REM Double-cliquez sur ce fichier pour preparer et lancer Siraba.
REM Il appelle lancer.ps1, qui fait tout le travail.
title Siraba - Saramaya Transport
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lancer.ps1"
echo.
pause
