import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

class Particle {
  startX: number;
  startY: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number = 0;
  vy: number = 0;
  text: string;
  size: number;
  
  delay: number;
  timeAlive: number = 0;
  active: boolean = false;
  opacity: number = 0;

  constructor(w: number, h: number, tx: number, ty: number, text: string, delay: number) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.max(w, h) * (0.8 + Math.random() * 0.5);
    this.startX = w/2 + Math.cos(angle) * radius;
    this.startY = h/2 + Math.sin(angle) * radius;
    
    this.x = this.startX;
    this.y = this.startY;
    this.tx = tx;
    this.ty = ty;
    this.text = text;
    this.delay = delay;
    this.size = window.innerWidth < 640 ? 9 : 11;
  }

  update(dt: number, mouse: {x: number, y: number, active: boolean, click: boolean}) {
    if (!this.active) {
      if (this.delay > 0) {
        this.delay -= dt;
      } else {
        this.active = true;
      }
      return;
    }
    
    this.timeAlive += dt;
    this.opacity = Math.min(1, this.timeAlive / 1500); 

    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    
    let fx = 0;
    let fy = 0;
    if (mouse.active) {
      const mdx = this.x - mouse.x;
      const mdy = this.y - mouse.y;
      const distSq = mdx * mdx + mdy * mdy;
      const maxDist = mouse.click ? 280 : 150;
      if (distSq < maxDist * maxDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = Math.pow((maxDist - dist) / maxDist, 2);
        const strength = mouse.click ? 120 : 35;
        fx = (mdx / dist) * force * strength;
        fy = (mdy / dist) * force * strength;
      }
    }

    const spring = 0.015;
    const friction = 0.88;

    this.vx += dx * spring + fx;
    this.vy += dy * spring + fy;
    
    this.vx *= friction;
    this.vy *= friction;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    
    ctx.font = `bold ${this.size}px "Share Tech Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillStyle = `rgba(255, 30, 30, ${this.opacity * 0.9})`;
    ctx.fillText(this.text, this.x, this.y);
    
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 1.5 || this.timeAlive < 1500) {
       const glowAlpha = Math.min(1, (speed / 15) + (1500 - this.timeAlive)/1500) * this.opacity * 0.8;
       ctx.fillStyle = `rgba(255, 200, 200, ${glowAlpha})`;
       ctx.fillText(this.text, this.x, this.y);
    }
  }
}

function createParticles(targetWidth: number, targetHeight: number): Particle[] {
  const offW = 400; 
  const offH = 400; 
  
  const offscreen = document.createElement('canvas');
  offscreen.width = offW;
  offscreen.height = offH;
  const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return [];

  offCtx.translate(offW / 2, offH / 2.3); 
  const heartScale = offW / 35; 
  offCtx.scale(heartScale, heartScale);

  offCtx.fillStyle = '#fff';
  offCtx.beginPath();
  for (let t = 0; t <= Math.PI * 2; t += 0.05) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    if (t === 0) offCtx.moveTo(x, y);
    else offCtx.lineTo(x, y);
  }
  offCtx.closePath();
  offCtx.fill();

  const data = offCtx.getImageData(0, 0, offW, offH).data;

  const scale = Math.min(targetWidth, targetHeight) * 0.85 / offW; 
  
  const realW = offW * scale;
  const realH = offH * scale;

  const startX = targetWidth / 2 - realW / 2;
  const startY = targetHeight / 2 - realH / 2;

  const newParticles: Particle[] = [];
  const text = "I LOVE YOU";
  
  const isMobile = targetWidth < 640;
  const cellW = isMobile ? 45 : 60; 
  const cellH = isMobile ? 12 : 16; 
  
  let globalMaxY = 0;
  const tempPoints: {x: number, y: number}[] = [];

  for(let layer = 0; layer < 2; layer++) {
    const offsetX = layer * (cellW / 2);
    const offsetY = layer * (cellH / 2);

    for (let py = startY + offsetY; py < startY + realH; py += cellH) {
      for (let px = startX + offsetX; px < startX + realW; px += cellW) {
        
        const maskX = Math.floor((px - startX) / scale);
        const maskY = Math.floor((py - startY) / scale);
        
        if (maskX >= 0 && maskX < offW && maskY >= 0 && maskY < offH) {
          const idx = (maskY * offW + maskX) * 4 + 3;
          if (data[idx] > 128) { 
             if (py > globalMaxY) globalMaxY = py;
             tempPoints.push({ x: px, y: py });
          }
        }
      }
    }
  }

  tempPoints.forEach(pt => {
    const baseDelay = (globalMaxY - pt.y) * 15; 
    const totalDelay = baseDelay + Math.random() * 2000; // localized variance
    newParticles.push(new Particle(targetWidth, targetHeight, pt.x, pt.y, text, totalDelay));
  });

  return newParticles;
}

const ParticleHeart = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    const mouse = { x: -1000, y: -1000, active: false, click: false };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    
    const handleMouseLeave = () => { mouse.active = false; };
    const handleMouseDown = () => { mouse.click = true; };
    const handleMouseUp = () => { mouse.click = false; };
    
    const handleTouchMove = (e: TouchEvent) => {
      if(e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
      }
    };
    const handleTouchEnd = () => { mouse.active = false; mouse.click = false; };
    const handleTouchStart = (e: TouchEvent) => {
      mouse.click = true;
      if(e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = createParticles(canvas.width, canvas.height);
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    resizeCanvas();
    
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(time - lastTime, 40); 
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update(dt, mouse);
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchstart', handleTouchStart);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-10 touch-none block" 
    />
  );
};

export default function App() {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'running'>('idle');
  const [scanText, setScanText] = useState<string[]>([]);
  
  useEffect(() => {
    if (phase === 'scanning') {
      const sequence = [
        "INITIATING KINETIC SCAN...",
        "> BIOMETRIC LOCK OVERRIDDEN",
        "> SCANNING NEURAL PATHWAYS",
        "> TARGET MATCH DETECTED",
        "> EMOTIONAL OVERLOAD ENGAGED",
        "PROTOCOL_LOVE::INITIALIZING"
      ];
      let step = 0;
      setScanText([sequence[0]]);
      const interval = setInterval(() => {
        step++;
        if (step < sequence.length) {
          setScanText(prev => [...prev, sequence[step]]);
        } else {
          clearInterval(interval);
          setTimeout(() => setPhase('running'), 1200);
        }
      }, 600);
      return () => clearInterval(interval);
    }
  }, [phase]);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-mono text-red-500 selection:bg-red-900 selection:text-white">
      {/* Deep Cyber Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.07)_1px,transparent_1px)] bg-[size:50px_50px] opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,black_100%)] pointer-events-none" />

      <AnimatePresence>
        {phase === 'idle' && (
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="text-center mb-16 select-none">
               <h1 className="text-5xl md:text-7xl font-bold tracking-[0.4em] drop-shadow-[0_0_20px_rgba(239,68,68,1)] text-red-100 mb-6">
                 PROTOCOL Love
               </h1>
               <div className="flex items-center justify-center gap-4 text-xs md:text-sm text-red-700 uppercase tracking-[1em]">
                  <span className="w-12 h-[1px] bg-red-800"></span>
                  SYSTEM AWAITING INPUT
                  <span className="w-12 h-[1px] bg-red-800"></span>
               </div>
            </div>
            
            <button 
              onClick={() => setPhase('scanning')}
              className="group relative px-10 py-6 border border-red-900 bg-red-950/10 hover:bg-black/50 hover:border-red-500 transition-all duration-[0.6s] cursor-pointer outline-none overflow-hidden hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            >
              {/* Scanline / sweep effect */}
              <div className="absolute inset-0 -translate-y-[100%] group-hover:animate-[scan_1.5s_linear_infinite] bg-gradient-to-b from-transparent via-red-500/20 to-transparent pointer-events-none" />
              
              <span className="relative z-10 uppercase tracking-[0.5em] font-bold text-sm md:text-base text-red-700 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] group-hover:text-red-100 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-300">
                Initialize Sequence
              </span>

              {/* Advanced Corner accents */}
              <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-800 group-hover:border-red-400 transition-colors duration-300" />
              <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-800 group-hover:border-red-400 transition-colors duration-300" />
              <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-900 group-hover:border-red-600 transition-colors duration-300" />
              <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-900 group-hover:border-red-600 transition-colors duration-300" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

        {phase === 'scanning' && (
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.5 }}
          >
             <div className="w-full max-w-2xl border border-red-900 bg-red-950/20 p-6 sm:p-10 shadow-[0_0_30px_rgba(239,68,68,0.2)] relative overflow-hidden backdrop-blur-sm shadow-red-900/20">
                {/* Scanner sweep going up and down */}
                <div className="absolute top-0 left-0 right-0 bg-red-500/20 h-24 w-full animate-[scan_2.5s_ease-in-out_infinite_alternate] shadow-[0_0_20px_rgba(239,68,68,0.6)] blur-[4px] pointer-events-none" />
                
                <h2 className="text-xl md:text-3xl font-bold text-red-500 mb-6 sm:mb-10 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] border-b border-red-900/50 pb-4 flex items-center gap-4">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                  SYSTEM OVERRIDE
                </h2>
                
                <div className="flex flex-col gap-4 font-mono text-xs sm:text-sm md:text-base text-red-400">
                   {scanText.map((text, i) => (
                     <motion.div 
                       key={i}
                       initial={{ opacity: 0, x: -30 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="flex items-center gap-4"
                     >
                        <span className="w-2.5 h-2.5 bg-red-600 block animate-pulse border border-red-400"></span>
                        {text}
                     </motion.div>
                   ))}
                </div>

                {/* Cyber decorative elements */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-red-700/50" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-red-700/50" />
             </div>
          </motion.div>
        )}

      {phase === 'running' && <ParticleHeart />}
      
      {/* Persistent Cyberspace Diagnostics UI Overlay */}
      <div className="absolute bottom-6 justify-between inset-x-6 flex items-end text-[10px] md:text-xs text-red-800 uppercase tracking-widest pointer-events-none z-20 mix-blend-screen">
          <div className="flex flex-col gap-1 w-32 hidden sm:flex">
            <span>MEM // ALLOCATED</span>
            <span>ENG // OPTIMAL</span>
          </div>
          <div className="flex-1 text-center font-bold text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse">
            {phase === 'running' ? 'PROTOCOL ACTIVE // INTERACTIVE MODE' : phase === 'scanning' ? 'SCANNING SYSTEM DATA...' : ''}
          </div>
          <div className="flex flex-col text-right gap-1 w-32 hidden sm:flex">
            <span className="opacity-50">KINETICS x9</span>
            <span>STATUS // {phase === 'running' ? 'ON' : phase === 'scanning' ? 'BSY' : 'STDBY'}</span>
          </div>
       </div>
    </div>
  );
}
