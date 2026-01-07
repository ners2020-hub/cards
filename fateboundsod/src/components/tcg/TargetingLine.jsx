import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function TargetingLine({ startElement, mousePosition, color = '#f97316' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!startElement || !mousePosition) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = startElement.getBoundingClientRect();
    
    // Start from center of card
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    // End at mouse position (already in viewport coordinates)
    const endX = mousePosition.x;
    const endY = mousePosition.y;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowLength = 15;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle - Math.PI / 6),
      endY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle + Math.PI / 6),
      endY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

  }, [startElement, mousePosition, color]);

  // Create portal to render at document.body level
  return createPortal(
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />,
    document.body
  );
}