# TapMe 游戏

一个简单有趣的数字合并游戏。点击方块使数字+1，三个或以上相邻的相同数字会合并成更高级的数字。

## 游戏规则

- 点击格子会使数字**+1**
- 当**三个或更多**相同数字相邻时，它们会合并成下一个数字
- 每局游戏最多有**5次行动机会**
- 每次消除可以**恢复1点行动力**
- 尝试创造出最大的数字并获得最高分

## 本地部署

### 使用部署脚本

#### Windows系统

1. 双击运行 `deploy.bat` 文件
2. 脚本会自动检测系统中是否安装了Python或Node.js，并启动相应的HTTP服务器
3. 服务器启动后，在浏览器中访问 `http://localhost:8080` 即可开始游戏

#### Linux/macOS系统

1. 打开终端，进入游戏目录
2. 执行以下命令给部署脚本添加执行权限：
   ```bash
   chmod +x deploy.sh
   ```
3. 执行部署脚本：
   ```bash
   ./deploy.sh
   ```
4. 脚本会自动检测系统中是否安装了Python或Node.js，并启动相应的HTTP服务器
5. 服务器启动后，在浏览器中访问 `http://localhost:8080` 即可开始游戏

### 使用NPM部署

如果您已经安装了Node.js和npm，可以使用以下命令进行部署：

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm start
   ```

3. 在浏览器中访问 `http://localhost:8080` 即可开始游戏

## 手动部署

如果自动部署脚本无法正常工作，可以尝试以下手动部署方法：

### 使用Python

```bash
# Python 3
python3 -m http.server 8080

# 或 Python 2
python -m SimpleHTTPServer 8080
```

### 使用Node.js

```bash
# 如果已安装http-server
http-server -p 8080

# 或使用npx直接运行
npx http-server -p 8080
```

### 使用其他HTTP服务器

您也可以使用任何其他HTTP服务器（如Nginx、Apache等）来部署此游戏。只需要将游戏文件放置在服务器的根目录或子目录中即可。

## 游戏存档

游戏会自动保存您的进度和最高记录到浏览器的本地存储中。清除浏览器数据可能会导致游戏存档丢失。
