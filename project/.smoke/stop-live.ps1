$targets = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" | Where-Object { $_.CommandLine -like '*remote-debugging-port=9223*' }
foreach ($item in $targets) { Stop-Process -Id $item.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 600
$left = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" | Where-Object { $_.CommandLine -like '*remote-debugging-port=9223*' }
Write-Output ("remaining=" + @($left).Count)
