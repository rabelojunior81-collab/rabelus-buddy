@echo off
rem Rabelus Buddy: abre a console web local (ADR 0017). Sobe o nucleo se preciso e abre o navegador.
cd /d "%~dp0"
start "" /min node packages\cli\bin\rbuddy.mjs ui
