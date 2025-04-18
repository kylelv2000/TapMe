document.addEventListener('DOMContentLoaded', () => {
    // 游戏状态
    const gameState = {
        board: [], // 5x5 棋盘
        clicksLeft: 5, // 剩余点击次数
        boardSize: 5, // 棋盘大小
        isAnimating: false, // 动画进行中标记
        cellElements: [] // 存储DOM元素引用
    };

    const gameBoard = document.getElementById('game-board');
    const clicksLeftElement = document.getElementById('clicks-left');
    const restartButton = document.getElementById('restart-btn');
    const themeToggle = document.getElementById('theme-toggle');

    // 初始化主题
    initTheme();
    
    // 初始化游戏
    initGame();

    // 重新开始游戏按钮事件
    restartButton.addEventListener('click', () => {
        // 清除存档
        localStorage.removeItem('tapmeGameState');
        initGame();
    });
    
    // 主题切换事件
    themeToggle.addEventListener('change', toggleTheme);

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
        } else {
            // 否则初始化新游戏
            gameState.clicksLeft = 5;
            initializeBoard();
        }
        
        clicksLeftElement.textContent = gameState.clicksLeft;
        gameState.isAnimating = false;
        
        // 创建或更新棋盘DOM
        createBoardDOM();
    }
    
    // 保存游戏状态到localStorage
    function saveGameState() {
        const stateToSave = {
            board: gameState.board,
            clicksLeft: gameState.clicksLeft
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
        // 当动画正在进行时，阻止用户点击
        // gameState.isAnimating 在动画开始时设置为 true，动画结束时设置为 false
        // 这确保了在消除、移动和下落动画期间用户不能点击格子
        if (gameState.isAnimating || gameState.clicksLeft <= 0) return;
        
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        if (gameState.board[row][col] === null) return;
        
        // 平滑增加点击的格子值，避免闪烁
        const oldValue = gameState.board[row][col];
        const newValue = oldValue + 1;
        gameState.board[row][col] = newValue;
        
        // 直接更新DOM元素，避免重新渲染
        const cellElement = gameState.cellElements[row][col];
        cellElement.textContent = newValue;
        cellElement.setAttribute('data-value', newValue);
        cellElement.classList.add('highlight');
        
        // 减少点击次数
        gameState.clicksLeft--;
        clicksLeftElement.textContent = gameState.clicksLeft;
        
        // 保存游戏状态
        saveGameState();
        
        // 在短暂延迟后移除高亮效果
        setTimeout(() => {
            cellElement.classList.remove('highlight');
            
            // 检查连通组并处理
            processConnectedGroups(row, col);
            
            // 检查游戏是否结束
            if (gameState.clicksLeft <= 0) {
                setTimeout(() => {
                    alert('游戏结束！');
                    // 清除存档
                    localStorage.removeItem('tapmeGameState');
                }, 250);
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
            // 判断点击的格子是否在连通组中
            const clickedInGroup = group.some(cell => cell.row === clickedRow && cell.col === clickedCol);
            
            // 记录需要清除的格子和目标格子
            let cellsToClear = [];
            let targetCell = null;
            
            if (clickedInGroup) {
                // 如果点击的格子在连通组中
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
            
            // 依次处理每个需要清除的格子
            processCellsSequentially(cellsToClear, 0, targetCell, targetRect, () => {
                // 所有格子消失后，增加目标格子的值
                setTimeout(() => {
                    gameState.board[targetCell.row][targetCell.col]++;
                    updateCellDisplay(targetCell.row, targetCell.col);
                    
                    // 当出现连通数>=3时，增加计数器的值，但最大为5
                    gameState.clicksLeft = Math.min(gameState.clicksLeft + 1, 5);
                    clicksLeftElement.textContent = gameState.clicksLeft;
                    
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

    // 应用重力效果（下落）
    function applyGravity() {
        let hasFalling = false;
        const movingCells = [];
        const newCells = [];
        
        // 从底部向上处理下落
        for (let col = 0; col < gameState.boardSize; col++) {
            for (let row = gameState.boardSize - 1; row > 0; row--) {
                if (gameState.board[row][col] === null) {
                    let sourceRow = row - 1;
                    while (sourceRow >= 0 && gameState.board[sourceRow][col] === null) {
                        sourceRow--;
                    }
                    
                    if (sourceRow >= 0) {
                        movingCells.push({
                            fromRow: sourceRow,
                            fromCol: col,
                            toRow: row,
                            toCol: col,
                            value: gameState.board[sourceRow][col]
                        });
                        
                        gameState.board[row][col] = gameState.board[sourceRow][col];
                        gameState.board[sourceRow][col] = null;
                        hasFalling = true;
                    }
                }
            }
        }
        
        // 填充顶部空格
        for (let col = 0; col < gameState.boardSize; col++) {
            if (gameState.board[0][col] === null) {
                const newValue = Math.floor(Math.random() * 5) + 1;
                gameState.board[0][col] = newValue;
                newCells.push({
                    row: 0,
                    col: col,
                    value: newValue
                });
                hasFalling = true;
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
                setTimeout(() => {
                    const cell = gameState.cellElements[newCell.row][newCell.col];
                    cell.classList.add('new-cell');
                    updateCellDisplay(newCell.row, newCell.col);
                    
                    setTimeout(() => {
                        cell.classList.remove('new-cell');
                    }, 250);
                }, 250);
            });
            
            setTimeout(() => {
                if (hasFalling) {
                    applyGravity();
                } else {
                    // 下落完成后检查是否有新的连通组
                    checkForNewConnectedGroups();
                }
            }, 300);
        } else {
            // 如果没有格子下落，也要检查是否有新的连通组
            checkForNewConnectedGroups();
        }
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
}); 