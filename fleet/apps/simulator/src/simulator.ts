import { io } from 'socket.io-client';
import { randomUUID } from 'node:crypto';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const mode = process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1] || 'smoke';

console.log(`[Simulator] Starting GPS Replay Tool in mode: ${mode.toUpperCase()}`);

// Real, snapped Pune road centerline nodes along Jangali Maharaj (JM) Road & Ganeshkhind Road
const JM_ROAD_CORRIDOR = [
  { lat: 18.5145, lng: 73.8448 }, // 1. Deccan Gymkhana / Alka Talkies Chowk
  { lat: 18.5165, lng: 73.8452 }, // 2. Z-Bridge Junction on JM Road
  { lat: 18.5185, lng: 73.8458 }, // 3. Sambhaji Park
  { lat: 18.5205, lng: 73.8466 }, // 4. JM Road near Natraj
  { lat: 18.5228, lng: 73.8478 }, // 5. Balgandharva Ranga Mandir
  { lat: 18.5250, lng: 73.8492 }, // 6. Modern College Chowk
  { lat: 18.5272, lng: 73.8508 }, // 7. PMC Building Chowk
  { lat: 18.5295, lng: 73.8522 }, // 8. Sancheti Flyover Entry
  { lat: 18.5318, lng: 73.8532 }, // 9. Shivajinagar Railway Station Chowk
  { lat: 18.5335, lng: 73.8510 }, // 10. COEP Turn
  { lat: 18.5350, lng: 73.8480 }, // 11. Agriculture College Road
  { lat: 18.5375, lng: 73.8445 }, // 12. Ganeshkhind Road Entry
  { lat: 18.5400, lng: 73.8405 }, // 13. Centurion Junction
  { lat: 18.5428, lng: 73.8365 }, // 14. E-Square Multiplex Chowk
  { lat: 18.5450, lng: 73.8320 }, // 15. Savitribai Phule Pune University Main Circle
];

function calculateHeading(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const dLng = p2.lng - p1.lng;
  const dLat = p2.lat - p1.lat;
  const rad = Math.atan2(dLng, dLat);
  return Math.round(((rad * 180) / Math.PI + 360) % 360);
}

// Latency probe client
const probeSocket = io(API_URL, {
  auth: { orgId: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000' },
});

probeSocket.on('bus.batch', () => {
  // Keeps connection alive for latency metrics
});

// Track simulation step along the road corridor
let currentSegment = 4; // Start near Balgandharva (JM Road)
let segmentProgress = 0.0;
let direction = 1; // 1 = Forward (towards University), -1 = Reverse (towards Deccan)

async function streamRoadSnappedFix() {
  const now = new Date();

  // Progress along the road corridor by 15% per tick
  segmentProgress += 0.15;
  if (segmentProgress >= 1.0) {
    segmentProgress = 0.0;
    currentSegment += direction;

    if (currentSegment >= JM_ROAD_CORRIDOR.length - 1) {
      currentSegment = JM_ROAD_CORRIDOR.length - 2;
      direction = -1; // Reverse direction back down the road
    } else if (currentSegment <= 0) {
      currentSegment = 0;
      direction = 1; // Forward direction
    }
  }

  const p1 = JM_ROAD_CORRIDOR[currentSegment]!;
  const p2 = JM_ROAD_CORRIDOR[currentSegment + (direction === 1 ? 1 : -1)] || JM_ROAD_CORRIDOR[currentSegment + 1]!;

  // Strict linear interpolation strictly along road centerline
  const currentLat = p1.lat + (p2.lat - p1.lat) * segmentProgress;
  const currentLng = p1.lng + (p2.lng - p1.lng) * segmentProgress;
  const heading = calculateHeading(p1, p2);
  const speed = 36 + Math.floor(Math.random() * 8); // 36 - 44 km/h

  const payload = {
    sent_at: now.toISOString(),
    trip_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10',
    points: [
      {
        id: randomUUID(),
        recorded_at: now.toISOString(),
        lat: Number(currentLat.toFixed(6)),
        lng: Number(currentLng.toFixed(6)),
        accuracy_m: 4.5,
        speed_kmh: speed,
        heading_deg: heading,
      },
    ],
    health: {
      battery_pct: 88,
      charging: true,
      network: '4g',
      permission: 'always',
      queue_depth: 0,
      app_version: '1.0.0',
    },
  };

  try {
    await fetch(`${API_URL}/v1/ingest/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Retry on next cycle
  }
}

// Ingest location points strictly on JM Road centerline every 3.5 seconds
setInterval(streamRoadSnappedFix, 3500);
streamRoadSnappedFix();
