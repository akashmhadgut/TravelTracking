import React, { useState, useEffect } from 'react';
import { Play, Pause, FastForward, RotateCcw, X, MapPin } from 'lucide-react';

interface ReplayPoint {
  lat: number;
  lng: number;
  speed_kmh: number;
  recorded_at: string;
}

interface StopEvent {
  name: string;
  arrived_at: string;
  departed_at: string;
}

interface TripReplayModalProps {
  tripId: string;
  onClose: () => void;
}

export const TripReplayModal: React.FC<TripReplayModalProps> = ({ tripId, onClose }) => {
  const [points, setPoints] = useState<ReplayPoint[]>([]);
  const [stopEvents, setStopEvents] = useState<StopEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 4 | 16>(1);

  useEffect(() => {
    fetch(`/v1/trips/${tripId}/replay`)
      .then((res) => res.json())
      .then((data) => {
        if (data.points) setPoints(data.points);
        if (data.stop_events) setStopEvents(data.stop_events);
      })
      .catch((err) => console.error('Failed to load replay data:', err));
  }, [tripId]);

  useEffect(() => {
    if (!isPlaying || points.length === 0) return;

    const intervalMs = Math.max(200, 1000 / speedMultiplier);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speedMultiplier, points.length]);

  const currentPoint = points[currentIndex] || {
    lat: 18.5204,
    lng: 73.8567,
    speed_kmh: 0,
    recorded_at: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-800 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="font-bold text-sm text-slate-900">Trip History Replay Scrubber</h2>
            <p className="text-[11px] text-slate-500 font-mono">Trip #{tripId.slice(0, 18)}...</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Playback HUD Card */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Telemetry Timestamp</span>
              <span className="font-mono font-bold text-slate-900">
                {new Date(currentPoint.recorded_at).toLocaleTimeString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Replay Speed</span>
              <span className="font-mono font-bold text-indigo-600">{currentPoint.speed_kmh} km/h</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Coordinates</span>
              <span className="font-mono text-[10px] text-slate-700">
                {currentPoint.lat.toFixed(4)}, {currentPoint.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Draggable Progress Timeline Scrubber */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Point {currentIndex + 1} of {points.length}</span>
              <span>{Math.round(((currentIndex + 1) / (points.length || 1)) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, points.length - 1)}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Controls: Play, Pause, Speed Multiplier */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
              </button>

              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsPlaying(false);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {([1, 4, 16] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMultiplier(spd)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    speedMultiplier === spd
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FastForward className="w-2.5 h-2.5 inline mr-0.5" />
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Stop Events Timeline Marker */}
          {stopEvents.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">
                Planned Stop Corridor Events
              </span>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {stopEvents.map((evt, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <MapPin className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                    <span className="font-semibold text-slate-800">{evt.name}</span>
                    <span className="text-[10px] text-slate-500 ml-auto font-mono">
                      Arr: {new Date(evt.arrived_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
