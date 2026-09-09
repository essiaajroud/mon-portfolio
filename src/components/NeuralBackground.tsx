import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  pulsePhase: number;
  pulseSpeed: number;
  depth: number; // 0.5 to 1.5 for 3D depth effect
}

interface Signal {
  fromIndex: number;
  toIndex: number;
  progress: number; // 0 to 1
  speed: number;
}

const NeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let bgGradient: CanvasGradient;
    const createGradient = () => {
      bgGradient = ctx.createRadialGradient(
        width / 2, 
        height / 2, 
        10, 
        width / 2, 
        height / 2, 
        Math.max(width, height)
      );
      bgGradient.addColorStop(0, '#020617'); // slate-950
      bgGradient.addColorStop(1, '#080c14');
    };
    createGradient();

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      createGradient();
    };
    window.addEventListener('resize', resize);

    // Mouse tracking
    const mouse = { x: -1000, y: -1000, active: false };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Particles setup (capped to 50 for max 60fps performance)
    const particles: Particle[] = [];
    const particleCount = Math.min(50, Math.max(25, Math.floor((width * height) / 22000)));

    for (let i = 0; i < particleCount; i++) {
      const depth = Math.random() * 0.8 + 0.6; // 0.6 to 1.4
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3 * depth,
        vy: (Math.random() - 0.5) * 0.3 * depth,
        radius: (Math.random() * 1.2 + 1) * depth,
        baseRadius: (Math.random() * 1.2 + 1) * depth,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        depth,
      });
    }

    // Active electrical signals
    const signals: Signal[] = [];
    const maxSignals = 10;

    let animationFrameId: number;

    const draw = () => {
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Connective distance based on screen size
      const maxDist = Math.min(150, width / 9 + 60);
      const maxDistSq = maxDist * maxDist;

      // 1. Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxDist) * 0.22 * ((p.depth + p2.depth) / 2);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 0.45 * ((p.depth + p2.depth) / 2);
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Spawn electrical pulses along this line
            if (signals.length < maxSignals && Math.random() < 0.0003) {
              signals.push({
                fromIndex: i,
                toIndex: j,
                progress: 0,
                speed: 0.008 + Math.random() * 0.012
              });
            }
          }
        }

        // Connect nodes to mouse pointer if active and nearby
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 32400) { // 180^2
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / 180) * 0.35;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = 0.75 * p.depth;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();

            const force = (1 - dist / 180) * 0.1;
            p.x -= dx * force * 0.03;
            p.y -= dy * force * 0.03;
          }
        }
      }

      // 2. Draw and update active electrical signals
      for (let s = signals.length - 1; s >= 0; s--) {
        const signal = signals[s];
        signal.progress += signal.speed;

        if (signal.progress >= 1) {
          signals.splice(s, 1);
          continue;
        }

        const pFrom = particles[signal.fromIndex];
        const pTo = particles[signal.toIndex];
        
        if (pFrom && pTo) {
          const sx = pFrom.x + (pTo.x - pFrom.x) * signal.progress;
          const sy = pFrom.y + (pTo.y - pFrom.y) * signal.progress;

          // High-perf dual arc glow without costly context shadowBlur
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(34, 211, 238, 0.45)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        } else {
          signals.splice(s, 1);
        }
      }

      // 3. Draw and update particles (Nodes)
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Smooth boundaries wrap-around
        const pad = 40;
        if (p.x < -pad) p.x = width + pad;
        else if (p.x > width + pad) p.x = -pad;
        
        if (p.y < -pad) p.y = height + pad;
        else if (p.y > height + pad) p.y = -pad;

        // Breathe pulse calculation
        p.pulsePhase += p.pulseSpeed;
        const scale = 1 + Math.sin(p.pulsePhase) * 0.25;
        p.radius = p.baseRadius * scale;

        // Node Halo glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${0.12 * p.depth})`;
        ctx.fill();

        // Node center solid core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${0.85 * p.depth})`;
        
        // Inner core glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#22d3ee';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 bg-slate-950 pointer-events-none"
    />
  );
};

export default NeuralBackground;
