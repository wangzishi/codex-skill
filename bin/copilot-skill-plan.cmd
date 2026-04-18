@echo off
setlocal
node "%~dp0copilot_skill.mjs" %* plan
exit /b %ERRORLEVEL%
