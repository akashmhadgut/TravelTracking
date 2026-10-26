import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLiveMapStore } from '../stores/liveMapStore';

const CAR_REG_MAPPING: Record<string, string> = {
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a01': 'MH-12-DT-0001 (Nexon EV)',
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a02': 'MH-12-DT-0002 (MG ZS EV)',
};

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
      center: [73.8567, 18.5204], // Pune Center
      zoom: 13,
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
      // Clean up markers
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
      const statusColor =
        car.status === 'moving'
          ? '#22c55e' // emerald
          : car.status === 'stopped'
          ? '#eab308' // amber
          : car.status === 'stale'
          ? '#f97316' // orange
          : '#ef4444'; // red

      const regPlate = CAR_REG_MAPPING[car.bus_id] || car.bus_id.slice(0, 8);
      const speedText = `${Math.round(car.speed_kmh || 0)} km/h`;

      let marker = markersRef.current.get(car.bus_id);

      if (!marker) {
        // Create new interactive DOM Marker for the car
        const el = document.createElement('div');
        el.className = 'car-live-marker cursor-pointer transition-transform duration-300';
        el.style.width = '44px';
        el.style.height = '44px';

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

      // Update Marker inner HTML with Car SVG and live stats
      const el = marker.getElement();
      el.style.zIndex = isSelected ? '50' : car.status === 'moving' ? '40' : '30';

      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <!-- Moving Pulse Glow -->
          ${
            car.status === 'moving'
              ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background-color: ${statusColor}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          
          <!-- Directional Bearing Arrow for moving cars -->
          ${
            car.status === 'moving' && car.heading_deg !== undefined
              ? `<div style="
                  position: absolute;
                  top: -5px;
                  left: 50%;
                  width: 10px;
                  height: 10px;
                  transform-origin: 5px 25px;
                  transform: translateX(-50%) rotate(${car.heading_deg}deg);
                  transition: transform 0.4s ease-out;
                  pointer-events: none;
                  z-index: 20;
                ">
                  <svg viewBox="0 0 12 12" style="width: 10px; height: 10px; fill: ${statusColor}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));">
                    <polygon points="6,0 12,12 6,9 0,12" />
                  </svg>
                </div>`
              : ''
          }
          
          <!-- Car Circular Icon Shell (Always Straight & Upright) -->
          <div style="
            position: relative;
            width: 40px;
            height: 40px;
            border-radius: 9999px;
            background: #ffffff;
            border: 2.5px solid ${isSelected ? '#4f46e5' : statusColor};
            box-shadow: 0 4px 14px ${isSelected ? 'rgba(79, 70, 229, 0.4)' : 'rgba(15, 23, 42, 0.15)'};
            display: flex;
            align-items: center;
            justify-content: center;
            transform: scale(${isSelected ? '1.15' : '1'});
            transition: transform 0.2s;
          ">
            <!-- Straight Upright Car SVG (Never tilted or upside down) -->
            <svg
              style="width: 22px; height: 22px; fill: ${statusColor};"
              viewBox="0 0 24 24"
            >
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>

          <!-- Vehicle Registration Badge & Live Speed Pill -->
          <div style="
            margin-top: 4px;
            white-space: nowrap;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid ${isSelected ? '#4f46e5' : '#cbd5e1'};
            padding: 2px 7px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 3px 8px rgba(15, 23, 42, 0.1);
            pointer-events: none;
          ">
            <span style="width: 6px; height: 6px; border-radius: 9999px; background: ${statusColor};"></span>
            <span style="font-size: 10px; font-weight: 800; font-family: monospace; color: #0f172a;">${regPlate}</span>
            <span style="font-size: 9px; font-weight: 700; font-family: monospace; color: ${statusColor};">${speedText}</span>
          </div>
        </div>
      `;
    });

    // Remove any markers that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!currentCarIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [busesById, selectedBusId, setSelectedBusId]);

  // Center on selected car
  useEffect(() => {
    if (!selectedBusId || !mapInstance.current) return;
    const car = busesById.get(selectedBusId);
    if (car) {
      mapInstance.current.easeTo({
        center: [car.lng, car.lat],
        zoom: 15,
        duration: 800,
      });
    }
  }, [selectedBusId, busesById]);

  return <div ref={mapContainer} className="w-full h-full relative" />;
};
