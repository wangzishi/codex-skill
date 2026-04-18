@echo off
setlocal
node "%~dp0copilot_skill.mjs" %* chat
exit /b %ERRORLEVEL%
