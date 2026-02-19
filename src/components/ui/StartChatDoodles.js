import React, { useRef, useEffect, useCallback, useState } from 'react';
import styled from 'styled-components';

const DoodleZone = styled.div`
  position: relative;
  width: 100%;
  height: 140px;
  min-height: 140px;
  pointer-events: none;
  z-index: 2;
  margin-top: auto;
  & > * { pointer-events: auto; }
`;

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

const DOODLE_COUNT = 18;
const MIN_X = 10;
const MIN_Y = 5;
const MAX_Y = 78;
const BASE_RUN_SPEED = 10;
const HIT_DRAG_THRESHOLD = 12;

class StickMan {
  constructor(x, y, speed, dir, isForeground = true) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.dir = dir;
    this.step = Math.random() * Math.PI * 2;
    this.vx = 0;
    this.vy = 0;
    this.dragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.isForeground = isForeground;
    this.scale = isForeground ? 1.35 : 0.95;
    this.opacity = isForeground ? 1 : 0.65;
    this.yOffset = isForeground ? 0 : (Math.random() * 8 - 4);
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.isThrown = false;
    this.bounceCount = 0;
    this.bodyTilt = 0;
    this.groundY = MAX_Y;
  }

  draw(ctx) {
    ctx.save();
    
    // Apply depth effects
    ctx.globalAlpha = this.dragging ? 0.8 : this.opacity;
    
    // Apply rotation for spin animation when kicked
    ctx.translate(this.x, this.y + this.yOffset);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.x, -(this.y + this.yOffset));

    // Light grey for body, arms, legs
    ctx.strokeStyle = "#aaaaaa";
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const headY = this.y + this.yOffset - 22;
    const bodyTop = this.y + this.yOffset - 14;
    const bodyBottom = this.y + this.yOffset + 6;
    const armY = this.y + this.yOffset - 6;

    // Head (green circle only) - increased size
    ctx.fillStyle = "#00ff88";
    ctx.beginPath();
    ctx.arc(this.x, headY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Body line (light grey) - increased line width
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, bodyTop);
    ctx.lineTo(this.x, bodyBottom);
    ctx.stroke();

    // Improved walking animation - only when not thrown
    if (!this.isThrown) {
      // Body tilt while walking (subtle)
      this.bodyTilt = Math.sin(this.step * 0.5) * 0.08;
      ctx.save();
      ctx.translate(this.x, bodyTop);
      ctx.rotate(this.bodyTilt);
      ctx.translate(-this.x, -bodyTop);
      
      // Arms swinging opposite to legs (realistic walking)
      const leftArmAngle = Math.sin(this.step);
      const rightArmAngle = -Math.sin(this.step);
      const armLength = 12;
      const leftArmX = this.x + Math.cos(leftArmAngle - Math.PI / 2) * armLength;
      const leftArmY = armY + Math.sin(leftArmAngle - Math.PI / 2) * armLength;
      const rightArmX = this.x + Math.cos(rightArmAngle - Math.PI / 2) * armLength;
      const rightArmY = armY + Math.sin(rightArmAngle - Math.PI / 2) * armLength;
      
      ctx.beginPath();
      ctx.moveTo(this.x, armY);
      ctx.lineTo(leftArmX, leftArmY);
      ctx.moveTo(this.x, armY);
      ctx.lineTo(rightArmX, rightArmY);
      ctx.stroke();
      
      // Legs moving in opposite phase (realistic walking)
      const leftLegAngle = Math.sin(this.step);
      const rightLegAngle = Math.sin(this.step + Math.PI); // Opposite phase
      const legLength = 10;
      const legSwingAmplitude = 12;
      const leftLegX = this.x + Math.cos(leftLegAngle - Math.PI / 2) * legLength;
      const leftLegY = bodyBottom + Math.sin(leftLegAngle - Math.PI / 2) * legLength + leftLegAngle * legSwingAmplitude;
      const rightLegX = this.x + Math.cos(rightLegAngle - Math.PI / 2) * legLength;
      const rightLegY = bodyBottom + Math.sin(rightLegAngle - Math.PI / 2) * legLength + rightLegAngle * legSwingAmplitude;
      
      ctx.beginPath();
      ctx.moveTo(this.x, bodyBottom);
      ctx.lineTo(leftLegX, leftLegY);
      ctx.moveTo(this.x, bodyBottom);
      ctx.lineTo(rightLegX, rightLegY);
      ctx.stroke();
      
      ctx.restore();
    } else {
      // When thrown - legs and arms in neutral position
      ctx.beginPath();
      ctx.moveTo(this.x, armY);
      ctx.lineTo(this.x - 10, armY - 2);
      ctx.moveTo(this.x, armY);
      ctx.lineTo(this.x + 10, armY - 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(this.x, bodyBottom);
      ctx.lineTo(this.x - 8, bodyBottom + 12);
      ctx.moveTo(this.x, bodyBottom);
      ctx.lineTo(this.x + 8, bodyBottom + 12);
      ctx.stroke();
    }

    ctx.restore();
  }

  update(dt, maxX, groundY) {
    this.groundY = groundY;
    
    // Update rotation (spin animation)
    this.rotation += this.rotationSpeed * dt;
    this.rotationSpeed *= 0.95; // Decay rotation speed
    
    if (!this.dragging) {
      if (this.isThrown) {
        // Physics for thrown state
        const GRAVITY = 120;
        const FRICTION = 0.98;
        const BOUNCE_DAMPING = 0.6;
        
        // Apply gravity
        this.vy += GRAVITY * dt;
        
        // Apply friction
        this.vx *= FRICTION;
        
        // Update position
        this.x += this.vx * dt * 100;
        this.y += this.vy * dt * 100;
        
        // Bounce on ground
        const groundLevel = groundY - 10;
        if (this.y + this.yOffset + 17 >= groundLevel && this.vy > 0) {
          if (this.bounceCount < 1) {
            // First bounce
            this.y = groundLevel - this.yOffset - 17;
            this.vy = -Math.abs(this.vy) * BOUNCE_DAMPING;
            this.vx *= 0.8; // Reduce horizontal velocity on bounce
            this.rotationSpeed *= 0.7; // Reduce spin on bounce
            this.bounceCount++;
          } else {
            // After bounce, settle and return to walking
            this.y = groundLevel - this.yOffset - 17;
            this.vy = 0;
            this.vx *= 0.9;
            
            // Smoothly return to walking state
            if (Math.abs(this.vx) < 5 && Math.abs(this.vy) < 5 && Math.abs(this.rotationSpeed) < 0.5) {
              this.isThrown = false;
              this.bounceCount = 0;
              this.rotation = 0;
              this.rotationSpeed = 0;
              this.vx = 0;
              this.vy = 0;
              // Reset to walking direction
              this.dir = Math.random() > 0.5 ? 1 : -1;
            }
          }
        }
        
        // Boundary checks for thrown state
        if (this.x < MIN_X) {
          this.x = MIN_X;
          this.vx = Math.abs(this.vx) * 0.5;
        }
        if (this.x > maxX) {
          this.x = maxX;
          this.vx = -Math.abs(this.vx) * 0.5;
        }
        if (this.y < MIN_Y) {
          this.y = MIN_Y;
          this.vy = Math.abs(this.vy) * 0.5;
        }
      } else {
        // Normal walking state
        this.step += dt * 2.5;
        
        const atRest = Math.abs(this.vx) < 8 && Math.abs(this.vy) < 8 && this.y >= MAX_Y - 10;
        if (atRest) {
          this.vx += this.dir * this.speed * dt;
          // Subtle vertical bobbing
          this.vy += Math.sin(Date.now() / 500 + this.phase) * 8 * dt;
        }
        
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.vy += 100 * dt;
        
        this.x += this.vx * dt * 100;
        this.y += this.vy * dt * 100;

        if (this.x < MIN_X) {
          this.x = MIN_X;
          this.vx = Math.abs(this.vx) * 0.4;
          this.dir = 1;
        }
        if (this.x > maxX) {
          this.x = maxX;
          this.vx = -Math.abs(this.vx) * 0.4;
          this.dir = -1;
        }
        if (this.y < MIN_Y) {
          this.y = MIN_Y;
          this.vy = Math.abs(this.vy) * 0.5;
        }
        if (this.y > MAX_Y) {
          this.y = MAX_Y;
          this.vy = -Math.abs(this.vy) * 0.5;
        }
      }
    }
  }

  startDrag(mouseX, mouseY) {
    this.dragging = true;
    this.dragOffsetX = mouseX - this.x;
    this.dragOffsetY = mouseY - this.y;
    this.vx = 0;
    this.vy = 0;
  }

  updateDrag(mouseX, mouseY) {
    if (this.dragging) {
      this.x = mouseX - this.dragOffsetX;
      this.y = mouseY - this.dragOffsetY;
    }
  }

  endDrag(velocityX, velocityY) {
    if (this.dragging) {
      this.dragging = false;
      this.vx = velocityX * 0.22;
      this.vy = velocityY * 0.22;
    }
  }

  hit(clickX, clickY) {
    // Calculate direction from stick to click point
    const dx = clickX - this.x;
    const dy = clickY - (this.y + this.yOffset);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and apply force
    const force = 200;
    const normalizedX = dx / distance;
    const normalizedY = dy / distance;
    
    this.vx = normalizedX * force;
    this.vy = normalizedY * force - 80; // Add upward component
    
    // Add spin based on throw direction
    this.rotationSpeed = (normalizedX * 12) + (Math.random() - 0.5) * 4;
    this.rotation = 0;
    
    // Set thrown state
    this.isThrown = true;
    this.bounceCount = 0;
  }

  isPointInside(x, y) {
    const dx = x - this.x;
    const dy = y - (this.y + this.yOffset);
    // Increased hit area for easier clicking
    return dx * dx + dy * dy < 600;
  }
}

function StartChatDoodles() {
  const canvasRef = useRef(null);
  const sticksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const dragRef = useRef({ index: null, startX: 0, startY: 0, lastX: 0, lastY: 0, lastTime: 0 });
  const hasMovedRef = useRef(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  const getMaxX = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.width - 20 : 300;
  }, []);

  const initSticks = useCallback(() => {
    const maxX = getMaxX();
    sticksRef.current = Array.from({ length: DOODLE_COUNT }, (_, i) => {
      const speedMultiplier = 0.5 + Math.random() * 1.2;
      // Mix foreground and background - roughly 30% foreground, 70% background
      const isForeground = i < Math.floor(DOODLE_COUNT * 0.3);
      return new StickMan(
        MIN_X + Math.random() * (maxX - MIN_X),
        MIN_Y + Math.random() * (MAX_Y - MIN_Y),
        BASE_RUN_SPEED * speedMultiplier,
        Math.random() > 0.5 ? 1 : -1,
        isForeground
      );
    });
    // Sort by depth: background first (lower z-index), then foreground
    sticksRef.current.sort((a, b) => a.isForeground === b.isForeground ? 0 : a.isForeground ? 1 : -1);
  }, [getMaxX]);

  useEffect(() => {
    resizeCanvas();
    initSticks();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [resizeCanvas, initSticks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ground line (light grey)
      ctx.strokeStyle = "#aaaaaa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 10);
      ctx.lineTo(canvas.width, canvas.height - 10);
      ctx.stroke();

      const maxX = getMaxX();
      const groundY = canvas.height;
      // Update all sticks
      sticksRef.current.forEach(stick => {
        stick.update(dt, maxX, groundY);
      });
      // Draw background first, then foreground (for proper layering)
      sticksRef.current.forEach(stick => {
        stick.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [getMaxX]);

  const getStickAtPoint = useCallback((x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    
    for (let i = sticksRef.current.length - 1; i >= 0; i--) {
      if (sticksRef.current[i].isPointInside(canvasX, canvasY)) {
        return i;
      }
    }
    return null;
  }, []);

  const handlePointerDown = useCallback((e) => {
    const index = getStickAtPoint(e.clientX, e.clientY);
    if (index === null) return;
    
    e.preventDefault();
    hasMovedRef.current = false;
    const stick = sticksRef.current[index];
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    stick.startDrag(e.clientX - rect.left, e.clientY - rect.top);
    
    dragRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
    };
  }, [getStickAtPoint]);

  const handlePointerMove = useCallback((e) => {
    if (dragRef.current.index === null) return;
    
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > 4 || dy > 4) hasMovedRef.current = true;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const stick = sticksRef.current[dragRef.current.index];
    stick.updateDrag(e.clientX - rect.left, e.clientY - rect.top);
    
    const now = performance.now();
    const dt = Math.min((now - dragRef.current.lastTime) / 1000, 0.1);
    const vx = (e.clientX - dragRef.current.lastX) / dt;
    const vy = (e.clientY - dragRef.current.lastY) / dt;
    
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = now;
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (dragRef.current.index === null) return;
    
    const stick = sticksRef.current[dragRef.current.index];
    const pointerDist = Math.hypot(
      dragRef.current.lastX - dragRef.current.startX,
      dragRef.current.lastY - dragRef.current.startY
    );
    
    // Increased threshold for easier kicking - if moved less than 15px, it's a kick
    const isHit = !hasMovedRef.current || pointerDist < 15;
    
    if (isHit) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const clickX = dragRef.current.lastX - rect.left;
      const clickY = dragRef.current.lastY - rect.top;
      stick.hit(clickX, clickY);
    } else {
      const now = performance.now();
      const dt = Math.min((now - dragRef.current.lastTime) / 1000, 0.1);
      const vx = (dragRef.current.lastX - dragRef.current.startX) / dt;
      const vy = (dragRef.current.lastY - dragRef.current.startY) / dt;
      stick.endDrag(vx, vy);
    }
    
    dragRef.current.index = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointerleave', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  return (
    <DoodleZone>
      <Canvas ref={canvasRef} />
    </DoodleZone>
  );
}

export default StartChatDoodles;
