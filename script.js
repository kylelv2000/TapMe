document.addEventListener('DOMContentLoaded', () => {
    // 游戏状态
    const gameState = {
        board: [], // 5x5 棋盘
        clicksLeft: 5, // 剩余点击次数
        maxClicks: 5, // 最大点击次数
        boardSize: 5, // 棋盘大小
        isAnimating: false, // 动画进行中标记
        cellElements: [], // 存储DOM元素引用
        score: 0, // 积分
        maxNumberInGame: 1, // 本局游戏中的最大数字
        isNewNumberRecord: false,
        isNewScoreRecord: false,
        hasSeenTutorial: false, // 是否已经查看过教程
        advancedHintsLeft: 0, // 高级提示剩余次数，初始为0，只有在新游戏时才重置
        shuffleLeft: 0 // 打乱剩余次数，初始为0，只有在新游戏时才重置
    };

    const gameBoard = document.getElementById('game-board');
    const clicksLeftElement = document.getElementById('clicks-left');
    const clicksProgressBar = document.getElementById('clicks-progress-bar');
    const restartButton = document.getElementById('restart-btn');
    const tutorialButton = document.getElementById('tutorial-btn');
    const hintButton = document.getElementById('hint-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const scoreElement = document.createElement('div');
    scoreElement.classList.add('score-display');
    scoreElement.textContent = '积分: 0';
    document.querySelector('.game-info').appendChild(scoreElement);

    // 获取高级提示按钮和打乱按钮（已在HTML中创建）
    const advancedHintButton = document.getElementById('advanced-hint-btn');
    const shuffleButton = document.getElementById('shuffle-btn');
    
    // 获取或创建历史记录显示元素
    const recordsElement = document.querySelector('.records-display');
    
    // 获取顶部容器
    const topContainer = document.querySelector('.top-container');
    
    // 初始化主题
    initTheme();
    
    // 初始化游戏
    initGame();

    // 重新开始游戏按钮事件
    restartButton.addEventListener('click', () => {
        // 显示自定义确认弹窗，而不是使用confirm
        showConfirmModal('确定要重新开始游戏吗？', '当前游戏进度将丢失。', () => {
            // 确认后执行
            // 清除游戏状态
            localStorage.removeItem('tapmeGameState');
            
            // 初始化新游戏
            initGame();
            
            // 更新显示和保存状态
            updateButtonsDisplay();
            saveGameState();
        });
    });
    
    // 教程按钮事件
    tutorialButton.addEventListener('click', () => {
        showTutorial();
    });
    
    // 提示按钮事件
    hintButton.addEventListener('click', () => {
        if (gameState.isAnimating || gameState.clicksLeft <= 0) {
            return;
        }
        showHint();
    });
    
    // 高级提示按钮事件
    advancedHintButton.addEventListener('click', () => {
        if (gameState.isAnimating || gameState.clicksLeft <= 0 || gameState.advancedHintsLeft <= 0) {
            return;
        }
        showAdvancedHint();
    });
    
    // 打乱按钮事件
    shuffleButton.addEventListener('click', () => {
        if (gameState.isAnimating || gameState.shuffleLeft <= 0) {
            return;
        }
        showConfirmModal('确定要打乱棋盘吗？', '这将随机重新排列所有方块。', () => {
            shuffleBoard();
        });
    });
    
    // 主题切换事件
    themeToggle.addEventListener('change', toggleTheme);

    // 添加点击队列以处理连续点击
    const clickQueue = [];
    let isProcessingClick = false;

    // 初始化主题
    function initTheme() {
        // 检查本地存储中是否有保存的主题偏好
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            themeToggle.checked = savedTheme === 'dark';
        } else {
            // 检查系统偏好
            const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDarkScheme) {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeToggle.checked = true;
                localStorage.setItem('theme', 'dark');
            }
        }
    }
    
    // 切换主题函数
    function toggleTheme() {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // 初始化游戏
    function initGame() {
        // 尝试从localStorage加载游戏状态
        const savedState = loadGameState();
        
        if (savedState) {
            // 如果有已保存的状态，加载它
            gameState.board = savedState.board;
            gameState.clicksLeft = savedState.clicksLeft;
            gameState.score = savedState.score || 0; // 兼容旧存档
            gameState.maxNumberInGame = savedState.maxNumberInGame || 1; // 兼容旧存档
            gameState.hasSeenTutorial = savedState.hasSeenTutorial || false; // 加载教程状态
            gameState.advancedHintsLeft = savedState.advancedHintsLeft !== undefined ? savedState.advancedHintsLeft : 0; // 兼容旧存档
            gameState.shuffleLeft = savedState.shuffleLeft !== undefined ? savedState.shuffleLeft : 0; // 兼容旧存档
        } else {
            // 否则初始化新游戏
            gameState.clicksLeft = gameState.maxClicks;
            gameState.score = 0;
            gameState.maxNumberInGame = 1;
            gameState.hasSeenTutorial = false; // 新游戏，重置教程状态
            gameState.advancedHintsLeft = 3; // 只有新游戏才重置高级提示次数
            gameState.shuffleLeft = 1; // 只有新游戏才重置打乱次数
            initializeBoard();
        }
        
        // 更新点击次数显示和进度条
        updateClicksDisplay();
        updateScoreDisplay();
        updateRecordsDisplay();
        updateButtonsDisplay();
        gameState.isAnimating = false;
        
        // 创建或更新棋盘DOM
        createBoardDOM();
        
        // 移除任何可能存在的游戏结束弹框
        const existingModal = document.getElementById('game-end-modal');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // 检查是否需要显示教程
        const hasTutorialSeen = localStorage.getItem('tapmeTutorialSeen');
        if (!hasTutorialSeen && !gameState.hasSeenTutorial) {
            showTutorial();
        }
    }
    
    // 更新点击次数显示和进度条
    function updateClicksDisplay() {
        // 更新数字显示
        clicksLeftElement.textContent = gameState.clicksLeft;
        
        // 更新进度条
        const progressPercent = (gameState.clicksLeft / gameState.maxClicks) * 100;
        clicksProgressBar.style.width = `${progressPercent}%`;
        
        // 根据剩余次数更改进度条颜色
        if (progressPercent <= 20) {
            clicksProgressBar.style.backgroundColor = '#ff5252'; // 红色
        } else if (progressPercent <= 60) {
            clicksProgressBar.style.backgroundColor = '#ffd740'; // 黄色
        } else {
            clicksProgressBar.style.backgroundColor = ''; // 使用默认颜色(变量)
        }
    }
    
    // 更新积分显示
    function updateScoreDisplay() {
        scoreElement.textContent = `积分: ${gameState.score}`;
    }
    
    // 更新历史记录显示
    function updateRecordsDisplay() {
        const highestNumber = localStorage.getItem('tapmeHighestNumber') || 1;
        const highestScore = localStorage.getItem('tapmeHighestScore') || 0;
        
        recordsElement.innerHTML = `
            <div>最高数字: ${highestNumber}</div>
            <div>最高积分: ${highestScore}</div>
        `;
    }
    
    // 更新按钮显示
    function updateButtonsDisplay() {
        advancedHintButton.textContent = `高级提示(${gameState.advancedHintsLeft})`;
        shuffleButton.textContent = `打乱(${gameState.shuffleLeft})`;
        
        // 根据剩余次数禁用按钮
        advancedHintButton.disabled = gameState.advancedHintsLeft <= 0;
        shuffleButton.disabled = gameState.shuffleLeft <= 0;
        
        // 视觉上区分禁用状态
        if (gameState.advancedHintsLeft <= 0) {
            advancedHintButton.classList.add('disabled');
        } else {
            advancedHintButton.classList.remove('disabled');
        }
        
        if (gameState.shuffleLeft <= 0) {
            shuffleButton.classList.add('disabled');
        } else {
            shuffleButton.classList.remove('disabled');
        }
    }
    
    // 保存游戏状态到localStorage
    function saveGameState() {
        const stateToSave = {
            board: gameState.board,
            clicksLeft: gameState.clicksLeft,
            score: gameState.score,
            maxNumberInGame: gameState.maxNumberInGame,
            hasSeenTutorial: gameState.hasSeenTutorial,
            advancedHintsLeft: gameState.advancedHintsLeft,
            shuffleLeft: gameState.shuffleLeft
        };
        localStorage.setItem('tapmeGameState', JSON.stringify(stateToSave));
    }
    
    // 从localStorage加载游戏状态
    function loadGameState() {
        const savedState = localStorage.getItem('tapmeGameState');
        if (savedState) {
            try {
                return JSON.parse(savedState);
            } catch (e) {
                console.error('加载游戏存档失败:', e);
                return null;
            }
        }
        return null;
    }

    // 初始化棋盘，保证初始状态没有连通组
    function initializeBoard() {
        gameState.board = [];
        
        // 创建随机棋盘
        for (let i = 0; i < gameState.boardSize; i++) {
            gameState.board[i] = [];
            for (let j = 0; j < gameState.boardSize; j++) {
                gameState.board[i][j] = Math.floor(Math.random() * 5) + 1; // 1-5的随机数
            }
        }
        
        // 检查并修复初始连通组
        while (hasConnectedGroups()) {
            for (let i = 0; i < gameState.boardSize; i++) {
                for (let j = 0; j < gameState.boardSize; j++) {
                    gameState.board[i][j] = Math.floor(Math.random() * 5) + 1;
                }
            }
        }
    }

    // 创建棋盘DOM元素
    function createBoardDOM() {
        gameBoard.innerHTML = '';
        gameState.cellElements = [];
        
        for (let i = 0; i < gameState.boardSize; i++) {
            gameState.cellElements[i] = [];
            for (let j = 0; j < gameState.boardSize; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                
                const value = gameState.board[i][j];
                if (value !== null) {
                    cell.textContent = value;
                    cell.setAttribute('data-value', value);
                } else {
                    cell.classList.add('empty');
                }
                
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', handleCellClick);
                
                gameBoard.appendChild(cell);
                gameState.cellElements[i][j] = cell;
            }
        }
    }

    // 更新单个格子的显示
    function updateCellDisplay(row, col) {
        const cell = gameState.cellElements[row][col];
        const value = gameState.board[row][col];
        
        if (value !== null) {
            cell.textContent = value;
            cell.setAttribute('data-value', value);
            cell.classList.remove('empty');
        } else {
            cell.textContent = '';
            cell.removeAttribute('data-value');
            cell.classList.add('empty');
        }
    }

    // 处理格子点击事件
    function handleCellClick(event) {
        // 当剩余点击次数为0时，直接阻止用户点击
        if (gameState.clicksLeft <= 0) return;
        
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        if (gameState.board[row][col] === null) return;
        
        // 将点击添加到队列
        clickQueue.push({row, col});
        
        // 如果当前没有处理点击，启动处理
        if (!isProcessingClick) {
            processNextClick();
        }
    }
    
    // 处理队列中的下一个点击
    function processNextClick() {
        if (clickQueue.length === 0) {
            isProcessingClick = false;
            return;
        }
        
        isProcessingClick = true;
        const {row, col} = clickQueue.shift();
        
        // 在动画进行中时，将点击暂时保存并稍后处理
        if (gameState.isAnimating) {
            setTimeout(() => processNextClick(), 100);
            return;
        }
        
        // 再次检查点击的格子是否有效（可能已被动画消除）
        if (gameState.board[row][col] === null) {
            // 如果格子已无效，直接处理下一个点击
            processNextClick();
            return;
        }
        
        // 仅清除高亮效果，不影响提示计数
        document.querySelectorAll('.hint-cell').forEach(el => {
            el.classList.remove('hint-cell');
        });
        
        // 平滑增加点击的格子值，避免闪烁
        const oldValue = gameState.board[row][col];
        const newValue = oldValue + 1;
        gameState.board[row][col] = newValue;
        
        // 更新本局游戏中的最大数字
        if (newValue > gameState.maxNumberInGame) {
            gameState.maxNumberInGame = newValue;
        }
        
        // 直接更新DOM元素，避免重新渲染
        const cellElement = gameState.cellElements[row][col];
        cellElement.textContent = newValue;
        cellElement.setAttribute('data-value', newValue);
        cellElement.classList.add('highlight');
        
        // 减少点击次数
        gameState.clicksLeft--;
        updateClicksDisplay();
        
        // 保存游戏状态
        saveGameState();
        
        // 在短暂延迟后移除高亮效果
        setTimeout(() => {
            cellElement.classList.remove('highlight');
            
            // 检查连通组并处理
            processConnectedGroups(row, col);
            
            // 检查游戏是否结束
            if (gameState.clicksLeft <= 0) {
                // 不立即结束游戏，而是等待所有连通组和下落处理完成
                // 创建一个等待函数来检查动画是否完成
                function checkAnimationStatus() {
                    if (gameState.isAnimating) {
                        // 如果仍在动画中，继续等待
                        setTimeout(checkAnimationStatus, 300);
                    } else {
                        // 动画完成后，检查剩余点击次数
                        if (gameState.clicksLeft <= 0) {
                            // 如果仍然为0，才真正结束游戏
                            // 更新历史记录
                            checkGameEndAndUpdateRecords();
                            
                            // 显示自定义游戏结束弹框，而不是使用alert
                            showGameEndModal();
                            
                            // 清除存档
                            localStorage.removeItem('tapmeGameState');
                        } else {
                            // 否则继续游戏
                            console.log('连锁反应增加了点击次数，游戏继续！');
                            // 保存游戏状态
                            saveGameState();
                            
                            // 处理下一个点击（如果有）
                            processNextClick();
                        }
                    }
                }
                // 开始检查
                setTimeout(checkAnimationStatus, 300);
            } else {
                // 如果剩余点击次数大于0，处理下一个点击
                setTimeout(() => {
                    processNextClick();
                }, 100);
            }
        }, 150);
    }

    // 检查并处理连通组
    function processConnectedGroups(clickedRow, clickedCol) {
        const connectedGroups = findAllConnectedGroups();
        
        if (connectedGroups.length > 0) {
            gameState.isAnimating = true;
            
            // 依次处理连通组，而不是同时处理
            processNextGroup(connectedGroups, 0, clickedRow, clickedCol);
        } else {
            // 如果没有连通组，确保重置isAnimating状态
            gameState.isAnimating = false;
            // 保存游戏状态
            saveGameState();
        }
    }
    
    // 递归处理连通组，一次处理一个
    function processNextGroup(groups, index, clickedRow, clickedCol) {
        if (index >= groups.length) {
            // 所有连通组都处理完毕，进行下落
            setTimeout(() => {
                applyGravity();
            }, 50);
            return;
        }
        
        const group = groups[index];
        
        if (group.length >= 3) {
            // 始终使用点击的格子作为目标格子（如果点击的格子在连通组中）
            let targetCell = null;
            let cellsToClear = [];
            
            // 判断点击的格子是否在连通组中
            const clickedInGroup = clickedRow >= 0 && clickedCol >= 0 && 
                                 group.some(cell => cell.row === clickedRow && cell.col === clickedCol);
            
            if (clickedInGroup) {
                // 如果点击的格子在连通组中，使用它作为目标
                targetCell = group.find(cell => cell.row === clickedRow && cell.col === clickedCol);
                cellsToClear = group.filter(cell => cell.row !== clickedRow || cell.col !== clickedCol);
            } else {
                // 选择x最大，若x相等则选y最大的格子
                targetCell = group[0];
                for (const cell of group) {
                    if (cell.row > targetCell.row || 
                        (cell.row === targetCell.row && cell.col < targetCell.col)) {
                        targetCell = cell;
                    }
                }
                cellsToClear = group.filter(cell => cell.row !== targetCell.row || cell.col !== targetCell.col);
            }
            
            // 获取目标格子的DOM元素和位置
            const targetElement = gameState.cellElements[targetCell.row][targetCell.col];
            const targetRect = targetElement.getBoundingClientRect();
            
            // 计算增加的积分
            const baseValue = gameState.board[targetCell.row][targetCell.col];
            const scoreIncrease = baseValue * cellsToClear.length;
            
            // 创建并显示得分动画
            const scorePopup = document.createElement('div');
            scorePopup.classList.add('score-popup');
            scorePopup.textContent = `+${scoreIncrease}`;
            scorePopup.style.left = `${targetRect.left}px`;
            scorePopup.style.top = `${targetRect.top - 30}px`;
            document.body.appendChild(scorePopup);
            
            setTimeout(() => {
                scorePopup.classList.add('fade-up');
                setTimeout(() => {
                    document.body.removeChild(scorePopup);
                }, 1000);
            }, 10);
            
            // 增加积分
            gameState.score += scoreIncrease;
            updateScoreDisplay();
            
            // 依次处理每个需要清除的格子
            processCellsSequentially(cellsToClear, 0, targetCell, targetRect, () => {
                // 所有格子消失后，增加目标格子的值
                setTimeout(() => {
                    gameState.board[targetCell.row][targetCell.col]++;
                    
                    // 更新本局游戏中的最大数字
                    if (gameState.board[targetCell.row][targetCell.col] > gameState.maxNumberInGame) {
                        gameState.maxNumberInGame = gameState.board[targetCell.row][targetCell.col];
                    }
                    
                    updateCellDisplay(targetCell.row, targetCell.col);
                    
                    // 当出现连通数>=3时，增加计数器的值，但最大为5
                    gameState.clicksLeft = Math.min(gameState.clicksLeft + 1, gameState.maxClicks);
                    updateClicksDisplay();
                    
                    // 不需要等待放大动画结束，直接处理下一个连通组
                    setTimeout(() => {
                        // 处理下一个连通组
                        setTimeout(() => {
                            processNextGroup(groups, index + 1, clickedRow, clickedCol);
                        }, 50);
                    }, 50); // 从120ms减少到50ms，因为不再需要等待grow动画
                }, 50);
            });
        } else {
            // 如果当前连通组不满足条件，处理下一个
            processNextGroup(groups, index + 1, clickedRow, clickedCol);
        }
    }
    
    // 递归处理格子，一次处理一个
    function processCellsSequentially(cells, index, targetCell, targetRect, onComplete) {
        if (index >= cells.length) {
            // 所有格子都处理完毕
            onComplete();
            return;
        }
        
        const cell = cells[index];
        const cellElement = gameState.cellElements[cell.row][cell.col];
        const cellRect = cellElement.getBoundingClientRect();
        
        const clone = cellElement.cloneNode(true);
        clone.classList.add('cell-clone');
        clone.style.width = `${cellRect.width}px`;
        clone.style.height = `${cellRect.height}px`;
        clone.style.left = `${cellRect.left}px`;
        clone.style.top = `${cellRect.top}px`;
        document.body.appendChild(clone);
        
        // 计算移动路径
        const path = findPath(cell, targetCell);
        
        // 确定消失的目标位置
        const finalPos = calculateFinalPosition(cell, targetCell, targetRect);
        
        // 立即在原位置显示空格子
        gameState.board[cell.row][cell.col] = null;
        updateCellDisplay(cell.row, cell.col);
        
        if (path && path.length > 0) {
            animatePath(clone, path, finalPos, () => {
                document.body.removeChild(clone);
                // 处理下一个格子，延迟50ms，创造依次消失的效果
                setTimeout(() => {
                    processCellsSequentially(cells, index + 1, targetCell, targetRect, onComplete);
                }, 50);
            });
        } else {
            clone.classList.add('vanish');
            setTimeout(() => {
                document.body.removeChild(clone);
                // 处理下一个格子
                setTimeout(() => {
                    processCellsSequentially(cells, index + 1, targetCell, targetRect, onComplete);
                }, 50);
            }, 80);
        }
    }

    // 根据格子与目标格子的相对位置计算最终消失位置
    function calculateFinalPosition(cell, targetCell, targetRect) {
        // 计算偏移量
        const offset = 20; // 消失时的偏移距离
        
        // 判断相对位置
        if (cell.row < targetCell.row) {
            // 在目标格子上方，向上消失
            return {
                x: targetRect.left + targetRect.width / 2,
                y: targetRect.top - offset
            };
        } else if (cell.row > targetCell.row) {
            // 在目标格子下方，向下消失
            return {
                x: targetRect.left + targetRect.width / 2,
                y: targetRect.bottom + offset
            };
        } else if (cell.col < targetCell.col) {
            // 在目标格子左侧，向左消失
            return {
                x: targetRect.left - offset,
                y: targetRect.top + targetRect.height / 2
            };
        } else {
            // 在目标格子右侧，向右消失
            return {
                x: targetRect.right + offset,
                y: targetRect.top + targetRect.height / 2
            };
        }
    }

    // 查找所有连通组
    function findAllConnectedGroups() {
        const visited = Array(gameState.boardSize).fill().map(() => Array(gameState.boardSize).fill(false));
        const groups = [];
        
        // 确保我们检查每个单元格
        for (let i = 0; i < gameState.boardSize; i++) {
            for (let j = 0; j < gameState.boardSize; j++) {
                if (!visited[i][j] && gameState.board[i][j] !== null) {
                    const group = [];
                    const value = gameState.board[i][j];
                    
                    // 使用队列进行广度优先搜索，更可靠地找出所有连通格子
                    const queue = [{row: i, col: j}];
                    visited[i][j] = true;
                    
                    while (queue.length > 0) {
                        const cell = queue.shift();
                        group.push(cell);
                        
                        // 检查四个方向
                        const directions = [
                            {row: cell.row - 1, col: cell.col}, // 上
                            {row: cell.row + 1, col: cell.col}, // 下
                            {row: cell.row, col: cell.col - 1}, // 左
                            {row: cell.row, col: cell.col + 1}  // 右
                        ];
                        
                        for (const dir of directions) {
                            const {row, col} = dir;
                            
                            // 检查边界和是否已访问
                            if (row >= 0 && row < gameState.boardSize && 
                                col >= 0 && col < gameState.boardSize && 
                                !visited[row][col] && 
                                gameState.board[row][col] === value) {
                                
                                visited[row][col] = true;
                                queue.push({row, col});
                            }
                        }
                    }
                    
                    if (group.length >= 3) {
                        groups.push(group);
                    }
                }
            }
        }
        
        return groups;
    }

    // 检查是否存在连通组
    function hasConnectedGroups() {
        return findAllConnectedGroups().length > 0;
    }

    // 应用重力效果，让空格子上方的数字下落
    function applyGravity() {
        const movingCells = [];
        const newCells = [];
        
        // 从底部向上检查每一列
        for (let col = 0; col < gameState.boardSize; col++) {
            let emptyRow = -1;
            for (let row = gameState.boardSize - 1; row >= 0; row--) {
                if (gameState.board[row][col] === null) {
                    // 找到一个空格子
                    if (emptyRow === -1) {
                        emptyRow = row;
                    }
                } else if (emptyRow !== -1) {
                    // 找到了空格子上方的一个数字，移动它
                    movingCells.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: emptyRow,
                        toCol: col,
                        value: gameState.board[row][col]
                    });
                    
                    // 更新棋盘
                    gameState.board[emptyRow][col] = gameState.board[row][col];
                    gameState.board[row][col] = null;
                    
                    // 更新emptyRow，继续向上查找
                    emptyRow--;
                }
            }
            
            // 为当前列的顶部空位置生成新数字
            let emptyCount = 0;
            for (let row = 0; row < gameState.boardSize; row++) {
                if (gameState.board[row][col] === null) {
                    emptyCount++;
                }
            }
            
            // 为所有顶部空位添加随机数字
            for (let i = 0; i < emptyCount; i++) {
                const newValue = Math.floor(Math.random() * 5) + 1; // 1-5的随机数
                gameState.board[i][col] = newValue;
                newCells.push({
                    row: i,
                    col: col,
                    value: newValue
                });
            }
        }
        
        // 应用下落动画
        if (movingCells.length > 0 || newCells.length > 0) {
            movingCells.forEach(move => {
                const fromCell = gameState.cellElements[move.fromRow][move.fromCol];
                const toCell = gameState.cellElements[move.toRow][move.toCol];
                
                const fromRect = fromCell.getBoundingClientRect();
                const toRect = toCell.getBoundingClientRect();
                
                const clone = fromCell.cloneNode(true);
                clone.style.position = 'absolute';
                clone.style.zIndex = '100';
                clone.style.left = `${fromRect.left}px`;
                clone.style.top = `${fromRect.top}px`;
                clone.style.width = `${fromRect.width}px`;
                clone.style.height = `${fromRect.height}px`;
                clone.style.transition = 'top 0.25s ease-in';
                document.body.appendChild(clone);
                
                fromCell.textContent = '';
                fromCell.removeAttribute('data-value');
                fromCell.classList.add('empty');
                
                setTimeout(() => {
                    clone.style.top = `${toRect.top}px`;
                    
                    setTimeout(() => {
                        document.body.removeChild(clone);
                        updateCellDisplay(move.toRow, move.toCol);
                    }, 250);
                }, 25);
            });
            
            newCells.forEach(newCell => {
                // 更新格子显示
                updateCellDisplay(newCell.row, newCell.col);
            });
            
            // 检查下落后是否有新的连通组
            setTimeout(() => {
                checkForNewConnectedGroups();
            }, 300);
            
            return true; // 表示有重力效果发生
        }
        
        return false; // 表示没有发生下落
    }
    
    // 下落后检查新连通组
    function checkForNewConnectedGroups() {
        const newGroups = findAllConnectedGroups();
        if (newGroups.length > 0) {
            console.log(`下落后发现${newGroups.length}个新连通组`);
            
            // 给新的连通组添加短暂高亮，提示玩家
            for (const group of newGroups) {
                for (const cell of group) {
                    const cellElement = gameState.cellElements[cell.row][cell.col];
                    cellElement.classList.add('new-connected');
                }
            }
            
            // 短暂延迟后开始处理新连通组
            setTimeout(() => {
                // 移除高亮提示
                document.querySelectorAll('.new-connected').forEach(el => {
                    el.classList.remove('new-connected');
                });
                
                // 依次处理连通组
                processConnectedGroups(-1, -1);
            }, 400);
        } else {
            // 没有新的连通组，结束动画状态
            gameState.isAnimating = false;
            // 保存最终状态
            saveGameState();
            
            // 检查是否有等待处理的点击
            if (isProcessingClick && clickQueue.length > 0) {
                setTimeout(processNextClick, 100);
            }
        }
    }

    // 使用广度优先搜索找到从起点到终点的路径，避开非空格子
    function findPath(startCell, targetCell) {
        // 定义可以移动的四个方向：上、右、下、左
        const directions = [
            { row: -1, col: 0 }, // 上
            { row: 0, col: 1 },  // 右
            { row: 1, col: 0 },  // 下
            { row: 0, col: -1 }  // 左
        ];
        
        // 创建一个队列，从起点开始
        const queue = [{ row: startCell.row, col: startCell.col, path: [] }];
        
        // 创建一个访问标记数组
        const visited = Array(gameState.boardSize).fill().map(() => Array(gameState.boardSize).fill(false));
        visited[startCell.row][startCell.col] = true;
        
        // 广度优先搜索
        while (queue.length > 0) {
            const current = queue.shift();
            
            // 如果到达目标格子旁边，返回路径
            if ((Math.abs(current.row - targetCell.row) === 1 && current.col === targetCell.col) || 
                (Math.abs(current.col - targetCell.col) === 1 && current.row === targetCell.row)) {
                return [...current.path, { row: current.row, col: current.col }];
            }
            
            // 尝试四个方向
            for (const dir of directions) {
                const newRow = current.row + dir.row;
                const newCol = current.col + dir.col;
                
                // 检查是否在边界内并且未访问过
                if (newRow >= 0 && newRow < gameState.boardSize && 
                    newCol >= 0 && newCol < gameState.boardSize && 
                    !visited[newRow][newCol]) {
                    
                    // 检查新位置是否为空或者是目标格子
                    if (gameState.board[newRow][newCol] === null || 
                        (newRow === targetCell.row && newCol === targetCell.col)) {
                        
                        // 标记为已访问
                        visited[newRow][newCol] = true;
                        
                        // 添加到队列中，并记录路径
                        queue.push({
                            row: newRow,
                            col: newCol,
                            path: [...current.path, { row: current.row, col: current.col }]
                        });
                    }
                }
            }
        }
        
        // 如果找不到路径，返回null
        return null;
    }
    
    // 动画播放路径上的每一步移动
    function animatePath(element, path, finalPos, callback) {
        const duration = 25; // 从50ms再减半到25ms
        let step = 0;
        
        // 获取路径中每个点的实际坐标
        const positions = path.map(point => {
            const cell = gameState.cellElements[point.row][point.col];
            const rect = cell.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        });
        
        // 添加最终位置
        positions.push(finalPos);
        
        // 执行路径动画
        function nextStep() {
            if (step < positions.length) {
                const pos = positions[step];
                const elementWidth = parseInt(element.style.width);
                const elementHeight = parseInt(element.style.height);
                
                element.style.left = `${pos.x - elementWidth / 2}px`;
                element.style.top = `${pos.y - elementHeight / 2}px`;
                
                step++;
                setTimeout(nextStep, duration);
            } else {
                // 到达目标位置后，执行消失动画
                element.classList.add('vanish');
                setTimeout(callback, 80); // 从150ms再减半
            }
        }
        
        // 开始执行动画
        setTimeout(nextStep, 5); // 从10ms减半
    }

    // 检查游戏是否结束并更新记录
    function checkGameEndAndUpdateRecords() {
        // 获取历史记录
        const highestNumber = parseInt(localStorage.getItem('tapmeHighestNumber') || 1);
        const highestScore = parseInt(localStorage.getItem('tapmeHighestScore') || 0);
        
        // 保存破纪录状态供游戏结束弹框使用
        gameState.isNewNumberRecord = gameState.maxNumberInGame > highestNumber;
        gameState.isNewScoreRecord = gameState.score > highestScore;
        
        // 检查并更新最高数字记录
        if (gameState.isNewNumberRecord) {
            localStorage.setItem('tapmeHighestNumber', gameState.maxNumberInGame);
            showNewRecordMessage('新的最高数字记录！');
        }
        
        // 检查并更新最高分记录
        if (gameState.isNewScoreRecord) {
            localStorage.setItem('tapmeHighestScore', gameState.score);
            showNewRecordMessage('新的最高积分记录！');
        }
        
        // 更新显示
        updateRecordsDisplay();
    }
    
    // 显示新记录消息
    function showNewRecordMessage(message) {
        const recordPopup = document.createElement('div');
        recordPopup.classList.add('record-popup');
        recordPopup.textContent = message;
        document.body.appendChild(recordPopup);
        
        setTimeout(() => {
            recordPopup.classList.add('show');
            setTimeout(() => {
                recordPopup.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(recordPopup);
                }, 500);
            }, 2000);
        }, 10);
    }

    // 显示自定义确认弹窗，而不是使用confirm
    function showConfirmModal(title, message, onConfirm) {
        // 创建弹框
        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'game-modal';
        
        // 设置弹框内容
        const content = `
            <div class="modal-content">
                <h2>${title}</h2>
                <div class="modal-message">${message}</div>
                <div class="modal-buttons">
                    <button id="modal-cancel-btn" class="modal-btn">取消</button>
                    <button id="modal-confirm-btn" class="modal-btn primary-btn">确定</button>
                </div>
            </div>
        `;
        
        modal.innerHTML = content;
        document.body.appendChild(modal);
        
        // 添加按钮事件监听
        setTimeout(() => {
            document.getElementById('modal-cancel-btn').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            
            document.getElementById('modal-confirm-btn').addEventListener('click', () => {
                document.body.removeChild(modal);
                if (typeof onConfirm === 'function') {
                    onConfirm();
                }
            });
            
            // 添加类以触发显示动画
            modal.classList.add('show');
        }, 10);
    }

    // 显示游戏结束弹框
    function showGameEndModal() {
        // 创建弹框
        const modal = document.createElement('div');
        modal.id = 'game-end-modal';
        modal.className = 'game-modal';
        
        // 设置弹框内容
        let message = `<div class="modal-content"><h2>游戏结束</h2>`;
        
        // 添加游戏结果
        message += `<div class="game-results">
            <p>本局得分: <span class="highlight-text">${gameState.score}</span></p>
            <p>最大数字: <span class="highlight-text">${gameState.maxNumberInGame}</span></p>
        </div>`;
        
        // 如果破纪录，添加恭喜信息
        if (gameState.isNewNumberRecord || gameState.isNewScoreRecord) {
            message += '<div class="congrats">恭喜你打破记录！</div>';
            
            if (gameState.isNewNumberRecord) {
                message += `<p>新的最高数字: <span class="record-text">${gameState.maxNumberInGame}</span></p>`;
            }
            
            if (gameState.isNewScoreRecord) {
                message += `<p>新的最高分数: <span class="record-text">${gameState.score}</span></p>`;
            }
        }
        
        // 添加按钮
        message += '<div class="modal-buttons">'+
            '<button id="modal-restart-btn" class="modal-btn primary-btn">重新开始</button>'+
        '</div></div>';
        
        modal.innerHTML = message;
        document.body.appendChild(modal);
        
        // 添加按钮事件监听
        setTimeout(() => {
            document.getElementById('modal-restart-btn').addEventListener('click', () => {
                document.body.removeChild(modal);
                
                // 清除存储
                localStorage.removeItem('tapmeGameState');
                
                // 初始化新游戏
                initGame();
                
                // 更新显示和保存状态
                updateButtonsDisplay();
                saveGameState();
            });
            
            // 添加类以触发显示动画
            modal.classList.add('show');
        }, 10);
    }

    // 显示游戏教程
    function showTutorial() {
        // 标记已经看过教程
        gameState.hasSeenTutorial = true;
        localStorage.setItem('tapmeTutorialSeen', 'true');
        
        // 检查是否已存在教程弹窗
        let modal = document.getElementById('tutorial-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
        
        // 创建教程弹窗
        modal = document.createElement('div');
        modal.classList.add('game-modal', 'tutorial-modal');
        modal.id = 'tutorial-modal';
        
        const modalContent = `
            <div class="tutorial-content">
                <h2>游戏指南</h2>
                <div class="tutorial-section">
                    <h3>游戏规则</h3>
                    <ul>
                        <li>点击格子消耗1个行动点数，使数字<strong>+1</strong></li>
                        <li>当<strong>三个或更多</strong>相同数字相邻时，它们会消除并合并成下一个数字</li>
                        <li>每次最高有<strong>5个行动点数</strong></li>
                        <li>每次实现消除可以<strong>恢复1个行动点数</strong></li>
                        <li>尝试创造出最大的数字并获得最高分</li>
                        <li><strong>高级提示</strong>可以显示最佳组合方案</li>
                        <li><strong>打乱</strong>可以重新排列所有方块</li>
                    </ul>
                </div>
            </div>
            <div class="tutorial-animation">
                <div class="demo-board">
                    <div class="demo-cell" data-value="2">2</div>
                    <div class="demo-cell" data-value="3">3</div>
                    <div class="demo-cell" data-value="3">3</div>
                    <div class="demo-cell" data-value="3">3</div>
                    <div class="demo-cell" data-value="2">2</div>
                    <div class="demo-cell" data-value="1">1</div>
                </div>
                <div class="demo-explanation">
                    三个相同数字会合并为下一个级别
                </div>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn primary-btn" id="tutorial-skip-btn">关闭</button>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
        
        // 添加动画效果
        setTimeout(() => {
            modal.classList.add('show');
            
            // 开始演示动画
            setTimeout(() => {
                startTutorialDemo();
            }, 500);
        }, 100);
        
        // 绑定按钮点击事件
        document.getElementById('tutorial-skip-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
    
    // 教程动画演示
    function startTutorialDemo() {
        // 获取演示区域中的单元格
        const demoCells = document.querySelectorAll('.demo-cell');
        if (!demoCells.length) return;
        
        // 模拟点击左上角的单元格（值为2）
        setTimeout(() => {
            const targetCell = demoCells[0]; // 点击左上角值为2的单元格
            
            // 清除所有可能的动画类
            demoCells.forEach(cell => {
                cell.className = 'demo-cell';
                const value = cell.getAttribute('data-value');
                cell.textContent = value;
            });
            
            // 先高亮显示被点击的单元格
            targetCell.classList.add('demo-clicked');
            
            // 显示点击效果后，延迟一段时间再更新值
            setTimeout(() => {
                // 更新值
                const currentValue = parseInt(targetCell.getAttribute('data-value'));
                const newValue = currentValue + 1;
                targetCell.setAttribute('data-value', newValue);
                targetCell.textContent = newValue;
                
                // 消除高亮
                setTimeout(() => {
                    targetCell.classList.remove('demo-clicked');
                    
                    // 检查是否有三个相同的值
                    const matchValue = 3;
                    const matchingCells = Array.from(demoCells).filter(cell => 
                        parseInt(cell.getAttribute('data-value')) === matchValue
                    );
                    
                    if (matchingCells.length >= 3) {
                        // 高亮显示合并的单元格
                        matchingCells.forEach(cell => {
                            cell.classList.add('demo-match');
                        });
                        
                        // 等待一会后合并
                        setTimeout(() => {
                            // 移除匹配的单元格，保留点击的单元格作为目标
                            matchingCells.forEach(cell => {
                                if (cell !== targetCell) {
                                    cell.classList.add('demo-vanish');
                                }
                            });
                            
                            // 目标单元格升级
                            targetCell.classList.add('demo-upgrade');
                            targetCell.setAttribute('data-value', matchValue + 1);
                            targetCell.textContent = matchValue + 1;
                            
                            // 更新演示文本
                            document.querySelector('.demo-explanation').textContent = 
                                "成功合并！获得一个更高级的数字，并恢复1点行动力";
                                
                            // 重置演示（如果需要重复演示）
                            setTimeout(() => {
                                // 重置演示区域供下一次演示
                                restartTutorialDemo();
                            }, 3000);
                        }, 1000);
                    }
                }, 500);
            }, 300); // 延迟变化值，让点击效果更明显
        }, 1000);
    }
    
    // 重置教程演示
    function restartTutorialDemo() {
        // 获取演示区域中的单元格
        const demoCells = document.querySelectorAll('.demo-cell');
        if (!demoCells.length) return;
        
        // 重置所有单元格
        demoCells.forEach((cell, index) => {
            // 清除所有类，只保留基本类
            cell.className = 'demo-cell';
            
            // 重置为初始值
            const initialValues = [2, 3, 3, 3, 2, 1]; // 初始值
            cell.setAttribute('data-value', initialValues[index]);
            cell.textContent = initialValues[index];
        });
        
        // 重置说明文本
        document.querySelector('.demo-explanation').textContent = 
            "三个相同数字会合并为下一个级别";
            
        // 短暂延迟后重新开始演示
        setTimeout(() => {
            startTutorialDemo();
        }, 500);
    }

    // 找到并突出显示连通组
    function findAndHighlightConnectedGroups() {
        const connectedGroups = findAllConnectedGroups();
        let hasConnected = false;
        
        // 移除所有之前的new-connected类
        document.querySelectorAll('.new-connected').forEach(el => {
            el.classList.remove('new-connected');
        });
        
        // 为连通组添加高亮效果
        connectedGroups.forEach(group => {
            if (group.length >= 3) {
                hasConnected = true;
                group.forEach(cell => {
                    const cellElement = gameState.cellElements[cell.row][cell.col];
                    cellElement.classList.add('new-connected');
                });
            }
        });
        
        return hasConnected;
    }

    // 添加提示功能：查找点击一次后能形成连通组的格子
    function showHint() {
        // 如果已经使用过提示，先清除之前的提示高亮
        clearHints();
        
        // 寻找能形成连通组的格子
        const hintCell = findHintCell();
        
        if (hintCell) {
            // 找到了可以提示的格子
            const cellElement = gameState.cellElements[hintCell.row][hintCell.col];
            cellElement.classList.add('hint-cell');
            
            // 5秒后自动清除提示
            setTimeout(() => {
                clearHints();
            }, 5000);
        } else {
            // 没找到可提示的格子，显示一个短暂的提示消息
            const noHintMsg = document.createElement('div');
            noHintMsg.classList.add('no-hint-message');
            noHintMsg.textContent = "没有找到可以消除的格子";
            document.body.appendChild(noHintMsg);
            
            setTimeout(() => {
                document.body.removeChild(noHintMsg);
            }, 2000);
        }
    }
    
    // 清除所有提示高亮
    function clearHints() {
        document.querySelectorAll('.hint-cell').forEach(el => {
            el.classList.remove('hint-cell');
        });
    }
    
    // 寻找点击一次后能形成连通组的格子
    function findHintCell() {
        // 遍历所有格子
        for (let i = 0; i < gameState.boardSize; i++) {
            for (let j = 0; j < gameState.boardSize; j++) {
                if (gameState.board[i][j] === null) continue;
                
                // 临时增加这个格子的值
                const originalValue = gameState.board[i][j];
                gameState.board[i][j]++;
                
                // 检查是否形成连通组
                const groups = findAllConnectedGroups();
                
                // 还原格子值
                gameState.board[i][j] = originalValue;
                
                // 如果有连通组形成，返回这个格子
                if (groups.length > 0 && groups.some(group => group.length >= 3)) {
                    return { row: i, col: j };
                }
            }
        }
        
        // 没找到能形成连通组的格子
        return null;
    }

    // 高级提示功能
    function showAdvancedHint() {
        // 如果已经使用过提示，先清除之前的提示高亮
        clearHints();
        
        // 寻找最佳连通方案
        const bestHint = findBestHintSequence();
        
        if (bestHint && bestHint.cells.length > 0) {
            // 找到了可以提示的连通方案
            bestHint.cells.forEach(cell => {
                const cellElement = gameState.cellElements[cell.row][cell.col];
                cellElement.classList.add('hint-cell');
            });
            
            // 显示提示消息
            const hintMsg = document.createElement('div');
            hintMsg.classList.add('no-hint-message');
            hintMsg.textContent = `推荐连通${bestHint.value}，需点击${bestHint.clicks}次`;
            document.body.appendChild(hintMsg);
            
            // 减少高级提示次数
            gameState.advancedHintsLeft--;
            updateButtonsDisplay();
            saveGameState();
            
            // 5秒后自动清除提示
            setTimeout(() => {
                clearHints();
                document.body.removeChild(hintMsg);
            }, 5000);
        } else {
            // 没找到可提示的方案，显示一个短暂的提示消息
            const noHintMsg = document.createElement('div');
            noHintMsg.classList.add('no-hint-message');
            noHintMsg.textContent = "没有找到可行的连通方案";
            document.body.appendChild(noHintMsg);
            
            setTimeout(() => {
                document.body.removeChild(noHintMsg);
            }, 2000);
        }
    }
    
    // 寻找最佳连通方案
    function findBestHintSequence() {
        // 最佳连通方案
        let bestHint = null;
        let bestScore = -1;
        
        // 尝试遍历所有格子组合，寻找最好的连通方案
        for (let value = 1; value <= 10; value++) {
            // 找出所有当前值的格子
            const sameCells = [];
            for (let i = 0; i < gameState.boardSize; i++) {
                for (let j = 0; j < gameState.boardSize; j++) {
                    if (gameState.board[i][j] === value) {
                        sameCells.push({row: i, col: j});
                    }
                }
            }
            
            // 至少需要3个相同值的格子才可能形成连通组
            if (sameCells.length < 3) continue;
            
            // 尝试找出哪些格子需要点击才能形成连通组
            const potentialHints = findPotentialConnections(sameCells, value);
            
            for (const hint of potentialHints) {
                // 计算这个提示的分数（基于需要点击的次数和连通组的大小）
                const score = (hint.group.length * 10) - (hint.clicksNeeded * 5);
                if (score > bestScore) {
                    bestScore = score;
                    bestHint = {
                        cells: hint.group,
                        clicks: hint.clicksNeeded,
                        value: value
                    };
                }
            }
        }
        
        return bestHint;
    }
    
    // 找出潜在的连接方案
    function findPotentialConnections(cells, value) {
        const results = [];
        
        // 创建一个临时板复制当前状态
        const tempBoard = [];
        for (let i = 0; i < gameState.boardSize; i++) {
            tempBoard[i] = [...gameState.board[i]];
        }
        
        // 尝试对每个格子增加不同的值，看是否能形成连通组
        for (let clicksNeeded = 1; clicksNeeded <= 3; clicksNeeded++) {  // 最多尝试3次点击
            for (const cell of cells) {
                // 临时增加这个格子的值
                tempBoard[cell.row][cell.col] = value + clicksNeeded;
                
                // 检查是否能形成连通组
                const connectedGroup = findConnectedGroup(tempBoard, cell.row, cell.col);
                
                if (connectedGroup && connectedGroup.length >= 3) {
                    results.push({
                        group: connectedGroup.map(c => ({row: c.row, col: c.col})),
                        clicksNeeded: clicksNeeded
                    });
                }
                
                // 还原格子值
                tempBoard[cell.row][cell.col] = value;
            }
        }
        
        return results;
    }
    
    // 在临时板上查找指定位置的连通组
    function findConnectedGroup(board, row, col) {
        const value = board[row][col];
        if (value === null) return null;
        
        const visited = Array(gameState.boardSize).fill().map(() => Array(gameState.boardSize).fill(false));
        const group = [];
        
        // 使用广度优先搜索找出所有连通的相同值格子
        const queue = [{row, col}];
        visited[row][col] = true;
        
        while (queue.length > 0) {
            const cell = queue.shift();
            group.push(cell);
            
            // 检查四个方向
            const directions = [
                {row: cell.row - 1, col: cell.col}, // 上
                {row: cell.row + 1, col: cell.col}, // 下
                {row: cell.row, col: cell.col - 1}, // 左
                {row: cell.row, col: cell.col + 1}  // 右
            ];
            
            for (const dir of directions) {
                const newRow = dir.row;
                const newCol = dir.col;
                
                if (newRow >= 0 && newRow < gameState.boardSize && 
                    newCol >= 0 && newCol < gameState.boardSize && 
                    !visited[newRow][newCol] && 
                    board[newRow][newCol] === value) {
                    
                    visited[newRow][newCol] = true;
                    queue.push({row: newRow, col: newCol});
                }
            }
        }
        
        return group.length >= 3 ? group : null;
    }
    
    // 打乱棋盘
    function shuffleBoard() {
        if (gameState.isAnimating) return;
        
        gameState.isAnimating = true;
        
        // 收集所有非空格子的值
        const allValues = [];
        for (let i = 0; i < gameState.boardSize; i++) {
            for (let j = 0; j < gameState.boardSize; j++) {
                if (gameState.board[i][j] !== null) {
                    allValues.push(gameState.board[i][j]);
                }
            }
        }
        
        // 打乱数组
        for (let i = allValues.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allValues[i], allValues[j]] = [allValues[j], allValues[i]];
        }
        
        // 添加动画效果：先让所有格子消失
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.add('vanish');
        });
        
        // 短暂延迟后重新分配值并显示
        setTimeout(() => {
            let valueIndex = 0;
            for (let i = 0; i < gameState.boardSize; i++) {
                for (let j = 0; j < gameState.boardSize; j++) {
                    if (gameState.board[i][j] !== null) {
                        gameState.board[i][j] = allValues[valueIndex++];
                    }
                }
            }
            
            // 更新显示
            cells.forEach(cell => {
                cell.classList.remove('vanish');
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                updateCellDisplay(row, col);
            });
            
            // 添加出现动画
            cells.forEach(cell => {
                cell.classList.add('new-cell');
                setTimeout(() => cell.classList.remove('new-cell'), 300);
            });
            
            // 减少打乱次数
            gameState.shuffleLeft--;
            updateButtonsDisplay();
            
            // 保存游戏状态
            saveGameState();
            
            // 检查是否有新的连通组
            setTimeout(() => {
                gameState.isAnimating = false;
                checkForNewConnectedGroups();
            }, 300);
        }, 300);
    }
}); 
