$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node (Join-Path $ScriptDir "copilot_skill.mjs") @args
exit $LASTEXITCODE
