@echo off
setlocal
node "%~dp0copilot_skill.mjs" %*
exit /b %ERRORLEVEL%
