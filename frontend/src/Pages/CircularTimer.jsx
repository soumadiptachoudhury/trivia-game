import React, { useEffect, useState, useRef } from 'react';

export default function CircularTimer({ duration = 10, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const timeLeftRef = useRef(duration);

  // Keep ref in sync if duration prop changes
  useEffect(() => {
    timeLeftRef.current = duration;
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (timeLeftRef.current > 1) {
        timeLeftRef.current -= 1;
        setTimeLeft(timeLeftRef.current);
      } else {
        timeLeftRef.current = 0;
        setTimeLeft(0);
        clearInterval(timer);
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const safeDuration = duration > 0 ? duration : 1;
  const strokeDashoffset = circumference - (timeLeft / safeDuration) * circumference;
  const isUrgent = timeLeft <= 3;

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="stroke-gray-200"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          className={`transition-all duration-1000 ease-linear ${
            isUrgent ? 'stroke-red-500' : 'stroke-blue-500'
          }`}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt"
          fill="transparent"
        />
      </svg>
      <div className={`absolute text-2xl font-bold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
        {timeLeft}
      </div>
    </div>
  );
}