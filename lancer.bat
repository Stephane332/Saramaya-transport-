@echo off
REM Double-cliquez sur ce fichier pour preparer et lancer l'application.
REM Il appelle lancer.ps1, qui fait tout le travail.
title Saramaya Transport
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lancer.ps1"
echo.
pause
