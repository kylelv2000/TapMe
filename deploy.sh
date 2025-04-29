#!/bin/bash

echo "正在部署TapMe游戏..."

# 检查是否安装了Python
if command -v python3 &>/dev/null; then
    echo "使用Python 3启动服务器..."
    python3 -m http.server 8080
elif command -v python &>/dev/null; then
    # 检查Python版本
    python_version=$(python -c 'import sys; print(sys.version_info[0])')
    if [ "$python_version" == "3" ]; then
        echo "使用Python 3启动服务器..."
        python -m http.server 8080
    else
        echo "使用Python 2启动服务器..."
        python -m SimpleHTTPServer 8080
    fi
else
    echo "未检测到Python，尝试使用Node.js..."
    # 检查是否安装了Node.js
    if command -v npx &>/dev/null; then
        echo "使用Node.js启动服务器..."
        npx http-server -p 8080
    else
        echo "错误: 未安装Python或Node.js。"
        echo "请安装Python或Node.js后重试，或使用其他HTTP服务器部署。"
        exit 1
    fi
fi 
