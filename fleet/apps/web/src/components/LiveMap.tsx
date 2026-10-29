import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLiveMapStore } from '../stores/liveMapStore';

export const LiveMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  const busesById = useLiveMapStore((s) => s.busesById);
  const selectedBusId = useLiveMapStore((s) => s.selectedBusId);
  const setSelectedBusId = useLiveMapStore((s) => s.setSelectedBusId);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [73.8567, 18.5204], // Pune Metro Area
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapInstance.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Sync Car Markers onto the map
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const currentCarIds = new Set<string>();

    Array.from(busesById.values()).forEach((car) => {
      currentCarIds.add(car.bus_id);

      const isSelected = car.bus_id === selectedBusId;
      const isMoving = car.status === 'moving';
      const statusColor =
        car.status === 'moving'
          ? '#10b981' // emerald
          : car.status === 'stopped'
          ? '#0ea5e9' // sky blue
          : car.status === 'stale'
          ? '#f59e0b' // amber
          : '#64748b'; // slate / offline

      const regPlate = (car as any).reg_no || ('MH-12-DT-' + car.bus_id.slice(-4).toUpperCase());
      const speedText = `${Math.round(car.speed_kmh || 0)} km/h`;
      const heading = car.heading_deg || 0;

      let marker = markersRef.current.get(car.bus_id);

      if (!marker) {
        // Create interactive DOM Marker for the car
        const el = document.createElement('div');
        el.className = 'car-live-marker cursor-pointer group transition-transform duration-200';
        el.style.width = '32px';
        el.style.height = '32px';

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedBusId(car.bus_id);
        });

        marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([car.lng, car.lat])
          .addTo(map);

        markersRef.current.set(car.bus_id, marker);
      } else {
        // Smoothly glide marker to new GPS coordinates
        marker.setLngLat([car.lng, car.lat]);
      }

      // Update Marker inner HTML with sleek directional Car Silhouette
      const el = marker.getElement();
      el.style.zIndex = isSelected ? '100' : isMoving ? '50' : '30';

      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <!-- Moving Pulse Halo -->
          ${
            isMoving
              ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background-color: ${statusColor}; opacity: 0.3; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }

          <!-- Car Directional Puck -->
          <div style="
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            border-radius: 9999px;
            background-color: ${isSelected ? '#4f46e5' : '#0f172a'};
            border: 2px solid ${isSelected ? '#ffffff' : statusColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.45);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            transform: rotate(${heading}deg);
          ">
            <!-- Modern Top-Down / Heading Car Silhouette -->
            <svg width="${isSelected ? '16' : '13'}" height="${isSelected ? '16' : '13'}" viewBox="0 0 24 24" fill="${isSelected ? '#ffffff' : statusColor}">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/>
              <circle cx="7.5" cy="14.5" r="1.5"/>
              <circle cx="16.5" cy="14.5" r="1.5"/>
            </svg>
          </div>

          <!-- Uncluttered Floating Label Badge (Shows on Selected, Moving, or Hover) -->
          <div class="${isSelected ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'} transition-all duration-150" style="
            position: absolute;
            top: 32px;
            background-color: rgba(15, 23, 42, 0.95);
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            font-family: ui-monospace, monospace;
            padding: 2px 7px;
            border-radius: 6px;
            white-space: nowrap;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            pointer-events: none;
            display: flex;
            align-items: center;
            gap: 5px;
          ">
            <span>${regPlate}</span>
            ${isMoving ? `<span style="color: #34d399; font-size: 9px;">• ${speedText}</span>` : ''}
          </div>
        </div>
      `;
    });

    // Remove markers for cars that are no longer in the snapshot
    markersRef.current.forEach((marker, carId) => {
      if (!currentCarIds.has(carId)) {
        marker.remove();
        markersRef.current.delete(carId);
      }
    });
  }, [busesById, selectedBusId, setSelectedBusId]);

  // Center on selected car when clicked in sidebar
  useEffect(() => {
    if (!selectedBusId || !mapInstance.current) return;
    const car = busesById.get(selectedBusId);
    if (car) {
      mapInstance.current.flyTo({
        center: [car.lng, car.lat],
        zoom: 15,
        speed: 1.2,
      });
    }
  }, [selectedBusId, busesById]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Legend */}
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xl z-20 flex items-center gap-3.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Moving Cars</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span>Idle / Stopped</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Stale Signal (&gt;60s)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span>Offline (&gt;5m)</span>
        </div>
      </div>
    </div>
  );
};
