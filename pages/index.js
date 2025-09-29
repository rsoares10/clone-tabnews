"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- STYLING ---
const styles = {
    gameContainer: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2c2c2c', // Outer area background
        width: '100vw',
        height: '100vh',
        fontFamily: "'Consolas', 'Menlo', monospace",
        overflow: 'hidden', // Prevents scrollbars from distraction snakes
    },
    board: {
        backgroundColor: '#1e1e1e',
        border: '2px solid #555',
        position: 'relative',
        boxShadow: '0 0 25px rgba(0,0,0,0.6)',
        transition: 'width 0.5s ease-in-out, height 0.5s ease-in-out',
        borderRadius: '4px',
        overflow: 'hidden',
        zIndex: 1, // Keep board above distraction snakes
    },
    snakeSegment: {
        position: 'absolute',
        backgroundColor: '#61dafb',
        borderRadius: '20%',
        boxShadow: '0 0 8px #61dafb',
        transition: 'all 0.1s linear',
        zIndex: 2,
    },
    food: {
        position: 'absolute',
        borderRadius: '50%',
        transition: 'background-color 0.3s ease',
        zIndex: 1,
    },
    foodRed: { backgroundColor: '#ff6b6b', boxShadow: '0 0 10px #ff6b6b' },
    foodOrange: { backgroundColor: '#ffb366', boxShadow: '0 0 10px #ffb366' },
    foodPurple: { backgroundColor: '#c566ff', boxShadow: '0 0 10px #c566ff' },
    foodPink: { backgroundColor: '#ff66c4', boxShadow: '0 0 10px #ff66c4' },
    score: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#61dafb',
        marginBottom: '20px',
        textShadow: '0 0 8px rgba(97, 218, 251, 0.7)',
        zIndex: 5, // Keep score visible
    },
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        textAlign: 'center', zIndex: 10,
    },
    title: {
        fontSize: '4rem', fontWeight: 'bold',
        color: '#61dafb', textShadow: '0 0 15px #61dafb',
        marginBottom: '20px',
    },
    instruction: {
        fontSize: '1.5rem', color: '#f0f0f0',
        animation: 'blink 1.5s linear infinite',
    },
    neonWall: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 0, 0.1)',
        boxShadow: '0 0 10px 3px rgba(255, 255, 0, 0.7), inset 0 0 8px rgba(255, 255, 0, 0.5)',
        borderRadius: '2px',
    },
    shrinkingWall: {
        position: 'absolute',
        backgroundColor: '#9370DB',
        animation: 'purple-blink 0.5s ease-in-out',
    }
};

// --- GAME CONFIGURATION ---
const INITIAL_BOARD_SIZE = 25;
const CELL_SIZE = 20;
const INITIAL_SPEED = 120;
const SPEED_INCREMENT = 2;
const MIN_BOARD_SIZE = 10;
const DISTRACTION_SNAKE_LENGTH = 7;
const SLOW_EFFECT = 75; // ms to add to speed when near neon wall

// --- HELPER FUNCTIONS ---
const getRandomCoordinate = (max) => ({ x: Math.floor(Math.random() * max), y: Math.floor(Math.random() * max) });
const getInitialSnake = (boardSize) => ({ x: Math.floor(boardSize / 2), y: Math.floor(boardSize / 2) });
const getRandomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

// --- MAIN GAME COMPONENT ---
const SnakeGame = () => {
    const [gameState, setGameState] = useState('start');
    const [boardSize, setBoardSize] = useState(INITIAL_BOARD_SIZE);
    const [snake, setSnake] = useState(() => [getInitialSnake(INITIAL_BOARD_SIZE)]);
    const [foods, setFoods] = useState([]);
    const [score, setScore] = useState(0);
    const [speed, setSpeed] = useState(INITIAL_SPEED);
    const [distractionSnakes, setDistractionSnakes] = useState([]);
    const [lShapePath, setLShapePath] = useState([]);
    const [neonWall, setNeonWall] = useState(null);
    const [isTrueFoodDiscovered, setIsTrueFoodDiscovered] = useState(false);
    const [isShrinking, setIsShrinking] = useState(false);
    const [isMistakeMade, setIsMistakeMade] = useState(false); // ADDED: State for revealing true food

    const gameLoopRef = useRef(null);
    const lastUpdateTimeRef = useRef(0);
    const directionRef = useRef({ x: 0, y: -1 });
    const directionChangedInTickRef = useRef(false);

    const generateLevel = useCallback((currentScore, currentSnake, currentBoardSize) => {
        setIsTrueFoodDiscovered(false); // Reset discovery on new level
        setIsMistakeMade(false); // ADDED: Reset mistake tracking on new level
        let occupiedSpaces = new Set(currentSnake.map(s => `${s.x},${s.y}`));
        const placeItem = (maxCoord) => {
            let pos;
            do { pos = getRandomCoordinate(maxCoord); }
            while (occupiedSpaces.has(`${pos.x},${pos.y}`));
            occupiedSpaces.add(`${pos.x},${pos.y}`);
            return pos;
        };

        if (currentScore >= 25 && (currentScore - 25) % 5 === 0) {
            const start = placeItem(currentBoardSize - 3);
            const path = [ { x: start.x, y: start.y }, { x: start.x, y: start.y + 1 }, { x: start.x, y: start.y + 2 }, { x: start.x + 1, y: start.y + 2 }, { x: start.x + 2, y: start.y + 2 } ];
            path.forEach(p => occupiedSpaces.add(`${p.x},${p.y}`));
            setLShapePath(path);
        } else {
            setLShapePath([]);
        }

        let newFoods = [];
        if (currentScore < 20) {
            newFoods.push({ ...placeItem(currentBoardSize), isReal: true });
        } else {
            const numFoods = Math.floor(currentScore / 10) + 1;
            const realFoodIndex = Math.floor(Math.random() * numFoods);
            for (let i = 0; i < numFoods; i++) {
                newFoods.push({ ...placeItem(currentBoardSize), isReal: i === realFoodIndex });
            }
        }
        setFoods(newFoods);
    }, []);

    useEffect(() => {
        generateLevel(0, [getInitialSnake(INITIAL_BOARD_SIZE)], INITIAL_BOARD_SIZE);
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `
            @keyframes blink { 50% { opacity: 0.3; } }
            @keyframes purple-blink {
                0% { box-shadow: 0 0 5px 2px #c566ff; opacity: 0.5; }
                50% { box-shadow: 0 0 20px 8px #c566ff; opacity: 1; }
                100% { box-shadow: 0 0 5px 2px #c566ff; opacity: 0.5; }
            }
        `;
        document.head.appendChild(styleSheet);
        return () => { document.head.removeChild(styleSheet); };
    }, [generateLevel]);

    useEffect(() => {
        if (gameState === 'playing' && score > 0 && score % 3 === 0) {
            const createDistractionSnake = () => {
                const side = Math.floor(Math.random() * 4); let x, y, dir;
                switch (side) {
                    case 0: x = Math.random() * window.innerWidth; y = -DISTRACTION_SNAKE_LENGTH * CELL_SIZE; dir = { x: 0, y: 1 }; break;
                    case 1: x = window.innerWidth + DISTRACTION_SNAKE_LENGTH * CELL_SIZE; y = Math.random() * window.innerHeight; dir = { x: -1, y: 0 }; break;
                    case 2: x = Math.random() * window.innerWidth; y = window.innerHeight + DISTRACTION_SNAKE_LENGTH * CELL_SIZE; dir = { x: 0, y: -1 }; break;
                    default: x = -DISTRACTION_SNAKE_LENGTH * CELL_SIZE; y = Math.random() * window.innerHeight; dir = { x: 1, y: 0 }; break;
                }
                const segments = Array.from({ length: DISTRACTION_SNAKE_LENGTH }, (_, i) => ({ x: x - i * dir.x * CELL_SIZE, y: y - i * dir.y * CELL_SIZE }));
                return { id: Date.now() + Math.random(), segments, color: getRandomColor(), direction: dir };
            };
            setDistractionSnakes(prev => [...prev, createDistractionSnake()]);
        }
    }, [score, gameState]);

    const resetGame = useCallback(() => {
        setBoardSize(INITIAL_BOARD_SIZE);
        const initialSnake = [getInitialSnake(INITIAL_BOARD_SIZE)];
        setSnake(initialSnake);
        generateLevel(0, initialSnake, INITIAL_BOARD_SIZE);
        directionRef.current = { x: 0, y: -1 };
        setScore(0);
        setSpeed(INITIAL_SPEED);
        setDistractionSnakes([]);
        setLShapePath([]);
        setNeonWall(null);
        setIsTrueFoodDiscovered(false);
        setIsShrinking(false);
        setIsMistakeMade(false); // ADDED: Reset mistake tracking
        setGameState('playing');
    }, [generateLevel]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === ' ' && (gameState === 'start' || gameState === 'gameOver')) { resetGame(); return; }
        if (gameState !== 'playing' || directionChangedInTickRef.current) return;
        const keyMap = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
        const newDirection = keyMap[e.key];
        if (newDirection) {
            e.preventDefault();
            const isOpposite = newDirection.x === -directionRef.current.x && newDirection.y === -directionRef.current.y;
            if (!isOpposite) { directionRef.current = newDirection; directionChangedInTickRef.current = true; }
        }
    }, [gameState, resetGame]);

    const gameLoop = useCallback((currentTime) => {
        if (gameState !== 'playing') return;
        gameLoopRef.current = requestAnimationFrame(gameLoop);

        let effectiveSpeed = speed;
        if (neonWall && snake.length > 0) {
            const head = snake[snake.length - 1];
            const isNearWall = (neonWall === 'top' && head.y === 1) || (neonWall === 'bottom' && head.y === boardSize - 2) || (neonWall === 'left' && head.x === 1) || (neonWall === 'right' && head.x === boardSize - 2);
            if (isNearWall) effectiveSpeed += SLOW_EFFECT;
        }

        if (currentTime - lastUpdateTimeRef.current < effectiveSpeed) return;
        lastUpdateTimeRef.current = currentTime;
        directionChangedInTickRef.current = false;

        setSnake(prevSnake => {
            const newSnake = [...prevSnake];
            const head = { ...newSnake[newSnake.length - 1] };
            head.x += directionRef.current.x; head.y += directionRef.current.y;

            if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize || prevSnake.some(s => s.x === head.x && s.y === head.y)) {
                setGameState('gameOver'); return prevSnake;
            }
            newSnake.push(head);

            let ateRealFood = false;
            const lPathIndex = lShapePath.findIndex(p => p.x === head.x && p.y === head.y);
            if (lPathIndex > -1) setLShapePath(prev => prev.filter((_, i) => i !== lPathIndex));

            const foodIndex = foods.findIndex(f => f.x === head.x && f.y === head.y);
            if (foodIndex > -1) {
                const eatenFood = foods[foodIndex];
                if (eatenFood.isReal) {
                    if (lShapePath.length > 0) {
                        setIsTrueFoodDiscovered(true); // Discovered, but not eaten
                    } else {
                        ateRealFood = true; // Eaten
                        const newScore = score + 1;
                        setScore(newScore);
                        setSpeed(s => Math.max(40, s - SPEED_INCREMENT));

                        if (newScore >= 28 && (newScore - 28) % 5 === 0) {
                            const walls = ['top', 'bottom', 'left', 'right'];
                            setNeonWall(walls[Math.floor(Math.random() * walls.length)]);
                        } else if (newScore < 28 || (newScore - 28) % 5 !== 0) {
                            setNeonWall(null);
                        }

                        if (newScore > 0 && newScore % 10 === 0 && boardSize > MIN_BOARD_SIZE) {
                            setIsShrinking(true); setTimeout(() => setIsShrinking(false), 500);
                            const nextBoardSize = boardSize - 1;
                            setBoardSize(nextBoardSize);
                            const resetSnake = [getInitialSnake(nextBoardSize)];
                            generateLevel(newScore, resetSnake, nextBoardSize);
                            return resetSnake;
                        } else {
                            generateLevel(newScore, newSnake, boardSize);
                        }
                    }
                } else { // Ate a false food
                    setIsMistakeMade(true); // CHANGED: Set mistake flag to reveal true food
                    setFoods(prevFoods => prevFoods.filter((_, i) => i !== foodIndex));
                }
            }

            if (!ateRealFood) newSnake.shift();
            return newSnake;
        });

        setDistractionSnakes(prevSnakes => prevSnakes.map(ds => {
            let newSegments = [...ds.segments]; let head = { ...newSegments[0] }; let dir = ds.direction;
            if (Math.random() < 0.02) {
                const newDir = Math.floor(Math.random() * 4);
                if (newDir === 0 && dir.y === 0) dir = { x: 0, y: -1 }; else if (newDir === 1 && dir.y === 0) dir = { x: 0, y: 1 };
                else if (newDir === 2 && dir.x === 0) dir = { x: -1, y: 0 }; else if (newDir === 3 && dir.x === 0) dir = { x: 1, y: 0 };
            }
            if ((head.x > window.innerWidth + 50 && dir.x > 0) || (head.x < -50 && dir.x < 0) || (head.y > window.innerHeight + 50 && dir.y > 0) || (head.y < -50 && dir.y < 0)) return null;
            head.x += dir.x * (CELL_SIZE / 2); head.y += dir.y * (CELL_SIZE / 2);
            newSegments.unshift(head); newSegments.pop();
            return { ...ds, segments: newSegments, direction: dir };
        }).filter(Boolean));
    }, [gameState, speed, score, foods, generateLevel, boardSize, lShapePath, snake, neonWall]);

    useEffect(() => { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);
    useEffect(() => {
        if (gameState === 'playing') { lastUpdateTimeRef.current = performance.now(); gameLoopRef.current = requestAnimationFrame(gameLoop); }
        return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
    }, [gameState, gameLoop]);

    const boardPixelSize = boardSize * CELL_SIZE;

    const renderNeonWall = () => {
        if (!neonWall) return null;
        const wallStyle = { ...styles.neonWall };
        const wallThickness = CELL_SIZE / 4;

        switch (neonWall) {
            case 'top': wallStyle.top = 0; wallStyle.left = 0; wallStyle.width = '100%'; wallStyle.height = wallThickness; break;
            case 'bottom': wallStyle.bottom = 0; wallStyle.left = 0; wallStyle.width = '100%'; wallStyle.height = wallThickness; break;
            case 'left': wallStyle.top = 0; wallStyle.left = 0; wallStyle.width = wallThickness; wallStyle.height = '100%'; break;
            case 'right': wallStyle.top = 0; wallStyle.right = 0; wallStyle.width = wallThickness; wallStyle.height = '100%'; break;
            default: return null;
        }
        return <div style={wallStyle} />;
    };
    
    const renderShrinkingWalls = () => {
        if (!isShrinking) return null;
        return <>
            <div style={{...styles.shrinkingWall, top: 0, left: 0, width: '100%', height: 4}} />
            <div style={{...styles.shrinkingWall, bottom: 0, left: 0, width: '100%', height: 4}} />
            <div style={{...styles.shrinkingWall, top: 0, left: 0, width: 4, height: '100%'}} />
            <div style={{...styles.shrinkingWall, top: 0, right: 0, width: 4, height: '100%'}} />
        </>;
    };

    return (
        <div style={styles.gameContainer}>
            {distractionSnakes.map(ds => (<React.Fragment key={ds.id}>{ds.segments.map((seg, i) => (<div key={i} style={{ position: 'absolute', left: seg.x, top: seg.y, width: CELL_SIZE, height: CELL_SIZE, backgroundColor: ds.color, boxShadow: `0 0 8px ${ds.color}`, borderRadius: '20%', zIndex: 0, transition: 'all 0.1s linear' }} />))}</React.Fragment>))}
            <div style={styles.score}>SCORE: {score}</div>
            <div style={{ ...styles.board, width: boardPixelSize, height: boardPixelSize }}>
                {renderNeonWall()}
                {renderShrinkingWalls()}
                {(gameState === 'start' || gameState === 'gameOver') && (<div style={styles.overlay}>
                    {gameState === 'start' && <div style={styles.title}>Snake Game</div>}
                    {gameState === 'gameOver' && (<><div style={styles.title}>GAME OVER</div><div style={{ ...styles.score, fontSize: '1.5rem', marginBottom: '20px' }}>Final Score: {score}</div></>)}
                    <div style={styles.instruction}>Press Space to {gameState === 'start' ? 'Start' : 'Restart'}</div>
                </div>)}
                {snake.map((seg, i) => (<div key={i} style={{ ...styles.snakeSegment, left: `${seg.x * CELL_SIZE}px`, top: `${seg.y * CELL_SIZE}px`, width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }} />))}
                {lShapePath.map((dot, i) => (<div key={`l-dot-${i}`} style={{ ...styles.food, ...styles.foodPurple, left: `${dot.x * CELL_SIZE}px`, top: `${dot.y * CELL_SIZE}px`, width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }} />))}
                {foods.map((food, i) => {
                    let colorStyle;
                    if (score < 20) {
                        colorStyle = styles.foodRed;
                    } else if (food.isReal) {
                        if (lShapePath.length > 0) {
                            colorStyle = isTrueFoodDiscovered ? styles.foodPink : styles.foodOrange;
                        } else {
                            // CHANGED: True food is only red after a mistake
                            colorStyle = isMistakeMade ? styles.foodRed : styles.foodOrange;
                        }
                    } else {
                        colorStyle = styles.foodOrange;
                    }
                    return <div key={i} style={{ ...styles.food, ...colorStyle, left: `${food.x * CELL_SIZE}px`, top: `${food.y * CELL_SIZE}px`, width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }} />;
                })}
            </div>
        </div>
    );
};

export default SnakeGame;

