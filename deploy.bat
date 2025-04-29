@echo off
echo 正在部署TapMe游戏...

:: 检查是否安装了Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    :: 检查Python版本
    for /f "tokens=2 delims=." %%i in ('python -c "import sys; print(sys.version)"') do (
        set python_version=%%i
        goto :check_python_version
    )
) else (
    goto :try_node
)

:check_python_version
if %python_version% geq 3 (
    echo 使用Python 3启动服务器...
    python -m http.server 8080
    goto :end
) else (
    echo 使用Python 2启动服务器...
    python -m SimpleHTTPServer 8080
    goto :end
)

:try_node
:: 检查是否安装了Node.js
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo 使用Node.js启动服务器...
    npx http-server -p 8080
) else (
    echo 错误: 未安装Python或Node.js。
    echo 请安装Python或Node.js后重试，或使用其他HTTP服务器部署。
    pause
    exit /b 1
)

:end
pause 
