import { useEffect, useRef } from 'react';

export function TicketAnimation({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener('resize', resize);

    // Animation variables
    const tickets: any[] = [];
    const particles: any[] = [];
    let animationId: number;

    // Get theme colors
    const getColors = () => {
      const isDark = document.body.classList.contains('dark-mode');
      return {
        accent: isDark ? '#00E5FF' : '#3A76F0',
        success: isDark ? '#34D399' : '#10B981',
        text: isDark ? '#F3F4F6' : '#1E2530',
        bg: isDark ? '#1E222B' : '#E6E9EF'
      };
    };

    // Create ticket
    const createTicket = () => {
      const colors = getColors();
      tickets.push({
        x: Math.random() * canvas.offsetWidth,
        y: -50,
        width: 60,
        height: 30,
        speed: 1 + Math.random() * 2,
        rotation: (Math.random() - 0.5) * 0.3,
        color: Math.random() > 0.5 ? colors.accent : colors.success,
        opacity: 0.8 + Math.random() * 0.2
      });
    };

    // Create verification particle
    const createParticle = (x: number, y: number) => {
      const colors = getColors();
      for (let i = 0; i < 8; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 1,
          color: colors.success,
          size: 2 + Math.random() * 3
        });
      }
    };

    // Draw ticket
    const drawTicket = (ticket: any) => {
      ctx.save();
      ctx.translate(ticket.x + ticket.width / 2, ticket.y + ticket.height / 2);
      ctx.rotate(ticket.rotation);
      ctx.globalAlpha = ticket.opacity;

      // Ticket body
      ctx.fillStyle = ticket.color;
      ctx.beginPath();
      ctx.roundRect(-ticket.width / 2, -ticket.height / 2, ticket.width, ticket.height, 4);
      ctx.fill();

      // Ticket perforation
      ctx.strokeStyle = getColors().bg;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(-ticket.width / 2 + 15, -ticket.height / 2);
      ctx.lineTo(-ticket.width / 2 + 15, ticket.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // QR code placeholder
      ctx.fillStyle = getColors().bg;
      ctx.fillRect(-ticket.width / 2 + 3, -ticket.height / 2 + 3, 10, 10);

      ctx.restore();
    };

    // Draw particle
    const drawParticle = (particle: any) => {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // Animation loop
    const animate = () => {
      const colors = getColors();
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Create new tickets
      if (Math.random() < 0.02) {
        createTicket();
      }

      // Update and draw tickets
      for (let i = tickets.length - 1; i >= 0; i--) {
        const ticket = tickets[i];
        ticket.y += ticket.speed;
        ticket.rotation += 0.01;

        // Create verification particles at bottom
        if (ticket.y > canvas.offsetHeight - 100 && Math.random() < 0.1) {
          createParticle(ticket.x + ticket.width / 2, ticket.y);
          tickets.splice(i, 1);
          continue;
        }

        // Remove if off screen
        if (ticket.y > canvas.offsetHeight) {
          tickets.splice(i, 1);
          continue;
        }

        drawTicket(ticket);
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;

        if (particle.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        drawParticle(particle);
      }

      // Draw verification text
      ctx.save();
      ctx.fillStyle = colors.text;
      ctx.font = '400 16px Unlock';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.3;
      ctx.fillText('✓ Verified', canvas.offsetWidth / 2, canvas.offsetHeight - 30);
      ctx.restore();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
}
