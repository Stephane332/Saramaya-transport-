@echo off
REM Double-cliquez sur ce fichier pour publier la version web et obtenir le lien.
REM Il appelle publier.ps1, qui fait tout le travail.
title Saramaya Transport - Publication
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publier.ps1"
echo.
pause
