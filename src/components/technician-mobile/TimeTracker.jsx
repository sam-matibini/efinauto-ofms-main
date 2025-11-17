import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square } from "lucide-react";

export default function TimeTracker({ technician, isOnline }) {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  const handleStart = () => {
    setStartTime(Date.now());
    setIsTracking(true);
  };

  const handlePause = () => {
    setIsTracking(false);
  };

  const handleStop = () => {
    setIsTracking(false);
    setStartTime(null);
    setElapsedSeconds(0);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {startTime && (
          <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
            {formatTime(elapsedSeconds)}
          </Badge>
        )}
        {!startTime && (
          <span className="text-sm text-gray-600">Quick Time Tracker</span>
        )}
      </div>

      <div className="flex gap-2">
        {!isTracking && !startTime && (
          <Button 
            size="sm" 
            onClick={handleStart}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </Button>
        )}

        {isTracking && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={handlePause}
          >
            <Pause className="w-4 h-4 mr-1" />
            Pause
          </Button>
        )}

        {startTime && (
          <Button 
            size="sm" 
            variant="destructive"
            onClick={handleStop}
          >
            <Square className="w-4 h-4 mr-1" />
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}