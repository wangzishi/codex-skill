@echo off
setlocal
node "%~dp0copilot_skill.mjs" %* review
exit /b %ERRORLEVEL%
