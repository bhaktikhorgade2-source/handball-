import React, { useEffect, useRef, useState } from 'react';

interface GameState {
  score: number;
  highScore: number;
  isGameOver: boolean;
}

export const HandballGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: parseInt(localStorage.getItem('handball-high-score') || '0'),
    isGameOver: false,
  });

  // Game constants
  const PADDLE_HEIGHT = 12;
  const PADDLE_WIDTH = 100;
  const BALL_RADIUS = 8;
  const INITIAL_BALL_SPEED = 5;
  const SPEED_INCREMENT = 0.2;

  // Game variables (refs to avoid re-renders)
  const ballPos = useRef({ x: 0, y: 0 });
  const ballVel = useRef({ x: 0, y: 0 });
  const paddleX = useRef(0);
  const scoreRef = useRef(0);
  const animationFrameId = useRef<number>(null);

  const initGame = (width: number, height: number) => {
    ballPos.current = { x: width / 2, y: height / 2 };
    const angle = (Math.random() * Math.PI / 2) + Math.PI / 4; // 45 to 135 degrees
    ballVel.current = {
      x: INITIAL_BALL_SPEED * Math.cos(angle),
      y: -INITIAL_BALL_SPEED * Math.sin(angle)
    };
    paddleX.current = (width - PADDLE_WIDTH) / 2;
    scoreRef.current = 0;
    setGameState(prev => ({ ...prev, score: 0, isGameOver: false }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        initGame(canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const update = () => {
      if (gameState.isGameOver) return;

      // Move ball
      ballPos.current.x += ballVel.current.x;
      ballPos.current.y += ballVel.current.y;

      // Wall collisions (Left/Right)
      if (ballPos.current.x - BALL_RADIUS < 0 || ballPos.current.x + BALL_RADIUS > canvas.width) {
        ballVel.current.x *= -1;
        // Keep ball inside
        ballPos.current.x = ballPos.current.x < BALL_RADIUS ? BALL_RADIUS : canvas.width - BALL_RADIUS;
      }

      // Wall collisions (Top)
      if (ballPos.current.y - BALL_RADIUS < 0) {
        ballVel.current.y *= -1;
        ballPos.current.y = BALL_RADIUS;
      }

      // Paddle collision
      if (
        ballPos.current.y + BALL_RADIUS > canvas.height - PADDLE_HEIGHT &&
        ballPos.current.x > paddleX.current &&
        ballPos.current.x < paddleX.current + PADDLE_WIDTH
      ) {
        // Calculate hit position relative to paddle center (-0.5 to 0.5)
        const hitPos = (ballPos.current.x - (paddleX.current + PADDLE_WIDTH / 2)) / PADDLE_WIDTH;
        
        // Reverse Y velocity
        ballVel.current.y = -Math.abs(ballVel.current.y);
        
        // Change X velocity based on hit position
        const speed = Math.sqrt(ballVel.current.x ** 2 + ballVel.current.y ** 2) + SPEED_INCREMENT;
        const maxBounceAngle = Math.PI / 3; // 60 degrees
        const bounceAngle = hitPos * maxBounceAngle;
        
        ballVel.current.x = speed * Math.sin(bounceAngle);
        ballVel.current.y = -speed * Math.cos(bounceAngle);

        scoreRef.current += 1;
        setGameState(prev => ({ ...prev, score: scoreRef.current }));
      }

      // Bottom collision (Game Over)
      if (ballPos.current.y + BALL_RADIUS > canvas.height) {
        setGameState(prev => {
          const newHighScore = Math.max(prev.highScore, scoreRef.current);
          localStorage.setItem('handball-high-score', newHighScore.toString());
          return { ...prev, isGameOver: true, highScore: newHighScore };
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background glow
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Ball
      ctx.beginPath();
      ctx.arc(ballPos.current.x, ballPos.current.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee'; // Cyan-400
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#22d3ee';
      ctx.fill();
      ctx.closePath();

      // Draw Paddle
      ctx.beginPath();
      ctx.roundRect(paddleX.current, canvas.height - PADDLE_HEIGHT - 5, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
      ctx.fillStyle = '#f472b6'; // Pink-400
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#f472b6';
      ctx.fill();
      ctx.closePath();

      // Reset shadow for text
      ctx.shadowBlur = 0;
    };

    const loop = () => {
      update();
      draw();
      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameState.isGameOver]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    const x = clientX - rect.left;
    paddleX.current = Math.max(0, Math.min(x - PADDLE_WIDTH / 2, canvas.width - PADDLE_WIDTH));
  };

  const restartGame = () => {
    if (canvasRef.current) {
      initGame(canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-slate-950 overflow-hidden cursor-none touch-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none">
        <div className="text-cyan-400 font-mono text-sm uppercase tracking-widest opacity-50">Score</div>
        <div className="text-white font-mono text-4xl font-bold">{gameState.score}</div>
      </div>

      <div className="absolute top-6 right-6 flex flex-col items-end gap-1 pointer-events-none">
        <div className="text-pink-400 font-mono text-sm uppercase tracking-widest opacity-50">Best</div>
        <div className="text-white font-mono text-2xl font-bold">{gameState.highScore}</div>
      </div>

      {/* Game Over Overlay */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10">
          <div className="text-center p-8 rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
            <h2 className="text-pink-500 font-mono text-5xl font-black mb-2 tracking-tighter uppercase italic">Game Over</h2>
            <p className="text-slate-400 font-mono mb-8">Final Score: {gameState.score}</p>
            <button 
              onClick={restartGame}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!gameState.isGameOver && gameState.score === 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/30 font-mono text-xs uppercase tracking-[0.3em] animate-pulse pointer-events-none">
          Move Mouse to Control Paddle
        </div>
      )}
    </div>
  );
};
