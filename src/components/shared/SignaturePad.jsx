import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eraser, Check, RotateCcw } from "lucide-react";

export default function SignaturePad({ 
  onSave, 
  onClear, 
  label = "Signature",
  width = 400,
  height = 150,
  disabled = false,
  existingSignature = null
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load existing signature if provided
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasSignature(true);
      };
      img.src = existingSignature;
    }
  }, [width, height, existingSignature]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    setLastPos(coords);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setLastPos(coords);
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
    onClear?.();
  };

  const saveSignature = () => {
    if (!hasSignature) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave?.(dataUrl);
  };

  const getSignatureDataUrl = () => {
    if (!hasSignature) return null;
    const canvas = canvasRef.current;
    return canvas.toDataURL('image/png');
  };

  // Expose method to parent
  React.useImperativeHandle(
    React.useRef(),
    () => ({ getSignatureDataUrl, hasSignature }),
    [hasSignature]
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <Card className={`overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full border-b cursor-crosshair touch-none"
            style={{ maxWidth: '100%', height: 'auto', aspectRatio: `${width}/${height}` }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="flex justify-between items-center p-2 bg-gray-50">
            <p className="text-xs text-gray-500">
              {hasSignature ? '✓ Signed' : 'Sign above using mouse or touch'}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                disabled={disabled || !hasSignature}
                className="h-7 text-xs"
              >
                <Eraser className="w-3 h-3 mr-1" />
                Clear
              </Button>
              {onSave && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveSignature}
                  disabled={disabled || !hasSignature}
                  className="h-7 text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Confirm
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}