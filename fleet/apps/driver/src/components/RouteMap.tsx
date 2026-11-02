import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';

export interface RouteStopItem {
  sequence: number;
  name: string;
  lat: number;
  lng: number;
  time: string;
  distance: string;
}

export interface MapLocationPoint {
  name: string;
  lat: number;
  lng: number;
  time?: string;
  address?: string;
  type?: 'pickup' | 'drop' | 'waypoint';
}

export const PUNE_RT505_STOPS: RouteStopItem[] = [
  { sequence: 1, name: 'Narayan Peth (Current)', lat: 18.51583, lng: 73.85285, time: 'Live', distance: '0.0 km' },
  { sequence: 2, name: 'Shivajinagar Station Bay', lat: 18.5314, lng: 73.8446, time: '08:45 AM', distance: '3.1 km' },
  { sequence: 3, name: 'Aundh Bremen Chowk', lat: 18.5610, lng: 73.8070, time: '09:05 AM', distance: '8.4 km' },
  { sequence: 4, name: 'Wakad Bhumkar Chowk', lat: 18.5980, lng: 73.7610, time: '09:18 AM', distance: '15.8 km' },
  { sequence: 5, name: 'Hinjewadi Shivaji Chowk', lat: 18.5950, lng: 73.7430, time: '09:24 AM', distance: '19.2 km' },
  { sequence: 6, name: 'Megapolis Tech Park, Ph 3', lat: 18.5790, lng: 73.7010, time: '09:30 AM', distance: '25.6 km' },
];

// Dense 42-point road coordinates following ACTUAL Pune roads (No cutting through buildings!)
export const PRIMARY_ROAD_COORDS: [number, number][] = [
  [18.51583, 73.85285], // HN Apte Path, Narayan Peth
  [18.51540, 73.85280], // HN Apte Path / Kakasaheb Gadgil Rd junction
  [18.51520, 73.85150], // Kakasaheb Gadgil Rd
  [18.51480, 73.84950], // Laxmi Road / Alka Talkies Chowk approach
  [18.51520, 73.84750], // Alka Talkies Chowk
  [18.51650, 73.84680], // Sambhaji Bridge (Mutha River)
  [18.51800, 73.84650], // Khandujibaba Chowk / Deccan Gymkhana
  [18.52000, 73.84620], // FC Road start / Fergusson College Rd
  [18.52400, 73.84580], // Goodluck Chowk / FC College Gate
  [18.52800, 73.84500], // Dnyaneshwar Paduka Chowk / FC Rd
  [18.53140, 73.84460], // Shivajinagar Station Bay
  [18.53400, 73.84300], // Shimla Office Chowk / Sancheti Flyover ramp
  [18.53700, 73.83900], // Sancheti Hospital Flyover
  [18.54100, 73.83200], // College of Agriculture Pune / Ganeshkhind Road
  [18.54500, 73.82700], // Government Polytechnic Pune / Range Hills
  [18.54800, 73.82300], // E-Square / Ganeshkhind Rd
  [18.55200, 73.81800], // Savitribai Phule Pune University Circle (SPPU)
  [18.55500, 73.81400], // Aundh Road / University Flyover
  [18.55800, 73.81050], // Sindh Society entrance / Aundh Rd
  [18.56100, 73.80700], // Bremen Chowk, Aundh
  [18.56500, 73.80200], // Parihar Chowk link / Medipoint Hospital
  [18.56800, 73.79800], // Spicer College Road
  [18.57100, 73.79400], // Rajiv Gandhi Bridge over Mula River
  [18.57400, 73.79000], // Sangvi Phata
  [18.57800, 73.78600], // Jagtap Dairy Chowk
  [18.58100, 73.78200], // Vishal Nagar
  [18.58400, 73.77800], // Kalewadi Phata Flyover
  [18.58700, 73.77400], // Chhatrapati Chowk
  [18.59000, 73.77000], // Dange Chowk
  [18.59300, 73.76600], // Tathawade Road
  [18.59600, 73.76300], // Indira College / Wakad Road
  [18.59800, 73.76000], // Wakad Bhumkar Chowk / NH-48 Expressway Flyover
  [18.60000, 73.75500], // Hinjewadi Flyover Entry Ramp
  [18.59800, 73.74900], // Hinjewadi Bridge / Wakad-Hinjewadi Link
  [18.59500, 73.74300], // Hinjewadi Shivaji Chowk
  [18.59300, 73.73800], // Hinjewadi Phase 1 Main Road
  [18.59000, 73.73300], // Wipro Circle / Phase 1
  [18.58800, 73.72700], // Cognizant / Infosys Phase 1
  [18.58500, 73.72100], // Infosys Circle / Phase 2
  [18.58300, 73.71500], // TechZone Road / Tata Technologies
  [18.58100, 73.70800], // Quadron Business Park
  [18.57900, 73.70100], // Megapolis Tech Park Circle, Phase 3
];

interface RouteMapProps {
  stops?: RouteStopItem[];
  pickupPoint?: MapLocationPoint | null;
  dropPoint?: MapLocationPoint | null;
  driverLat?: number | null;
  driverLng?: number | null;
  driverHeading?: number;
  driverSpeed?: number;
  isTripActive?: boolean;
  distanceText?: string;
  etaText?: string;
  isFullScreen?: boolean;
  theme?: 'light' | 'dark';
  language?: 'mr' | 'hi' | 'en';
  onNavigate?: (point: MapLocationPoint) => void;
  onRecenter?: () => void;
  onReportIncident?: () => void;
  onToggleSound?: () => void;
  isMuted?: boolean;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  stops = PUNE_RT505_STOPS,
  pickupPoint,
  dropPoint,
  driverLat,
  driverLng,
  driverHeading = 0,
  driverSpeed = 0,
  isTripActive = false,
  isFullScreen = false,
  theme = 'light',
  language = 'mr',
  onRecenter,
}) => {
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>(isFullScreen ? 'satellite' : 'roadmap');
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const activeLat = driverLat ?? 18.51583;
  const activeLng = driverLng ?? 73.85285;

  const t = {
    mr: { recenter: 'री-सेंटर', myLoc: 'नारायण पेठ' },
    hi: { recenter: 'री-सेंटर', myLoc: 'नारायण पेठ' },
    en: { recenter: 'Re-centre', myLoc: 'Narayan Peth' },
  }[language] || { recenter: 'Re-centre', myLoc: 'Narayan Peth' };

  // Push position updates via JavaScript injection ONLY (Never reload HTML)
  useEffect(() => {
    if (webViewRef.current && !isMapLoading) {
      const js = `
        if (window.updateCarPosition) {
          window.updateCarPosition(${activeLat}, ${activeLng}, ${driverHeading}, ${driverSpeed});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  }, [activeLat, activeLng, driverHeading, driverSpeed, isMapLoading]);

  // Recenter map on car
  const handleCenterCar = () => {
    setHasUserMovedMap(false);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.recenterOnCar) {
          window.recenterOnCar(${activeLat}, ${activeLng});
        }
        true;
      `);
    }
    if (onRecenter) onRecenter();
  };

  // Zoom In button action
  const handleZoomIn = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.map) {
          window.map.zoomIn();
        }
        true;
      `);
    }
  };

  // Zoom Out button action
  const handleZoomOut = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.map) {
          window.map.zoomOut();
        }
        true;
      `);
    }
  };

  // Fit Full Route bounds (for mini-map overview)
  const handleFitRoute = () => {
    setHasUserMovedMap(false);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.fitRouteBounds) {
          window.fitRouteBounds();
        }
        true;
      `);
    }
  };

  // Toggle Roadmap / Satellite Layer
  const handleToggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(nextType);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.setTileLayer) {
          window.setTileLayer('${nextType}');
        }
        true;
      `);
    }
  };

  // Listen for user interaction events from Leaflet
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'USER_TOUCH_MAP') {
        setHasUserMovedMap(true);
      }
    } catch {}
  };

  // Memoized HTML constructed ONCE per screen mode
  const mapHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=10.0, minimum-scale=0.5, user-scalable=yes" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { box-sizing: border-box; }
          html, body, #map {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #0f172a;
            touch-action: pan-x pan-y pinch-zoom;
            -webkit-user-select: none;
            user-select: none;
          }
          
          /* Google Maps Authentic Navigation Puck */
          .nav-puck-halo {
            position: absolute;
            width: 58px;
            height: 58px;
            border-radius: 29px;
            background: rgba(26, 115, 232, 0.28);
            animation: puckPulse 1.8s infinite ease-out;
            pointer-events: none;
          }
          @keyframes puckPulse {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(1.3); opacity: 0; }
          }
          .nav-puck-body {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 19px;
            background: #1a73e8;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
          }
          .nav-puck-arrow {
            color: #ffffff;
            font-size: 19px;
            font-weight: 900;
            line-height: 19px;
            transition: transform 0.2s ease;
          }

          /* Destination Drop Flag */
          .dest-flag-badge {
            background: #dc2626;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: 800;
            font-size: 11px;
            border: 2px solid #ffffff;
            box-shadow: 0 3px 10px rgba(0,0,0,0.35);
            white-space: nowrap;
            font-family: -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          }
          .pickup-flag-badge {
            background: #15803d;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: 800;
            font-size: 11px;
            border: 2px solid #ffffff;
            box-shadow: 0 3px 10px rgba(0,0,0,0.35);
            white-space: nowrap;
            font-family: -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var userLat = 18.51583;
          var userLng = 73.85285;
          var destLat = 18.5790;
          var destLng = 73.7010;
          var isFullScreen = ${isFullScreen};
          var isUserInteracting = false;

          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            touchZoom: true,
            dragging: true,
            tap: true,
            boxZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: true
          }).setView([userLat, userLng], isFullScreen ? 17.5 : 13);

          // Google Maps Layers
          var googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20
          });

          var googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20
          });

          if (isFullScreen) {
            googleSatellite.addTo(map);
          } else {
            googleRoadmap.addTo(map);
          }

          window.setTileLayer = function(type) {
            if (type === 'satellite') {
              map.removeLayer(googleRoadmap);
              googleSatellite.addTo(map);
            } else {
              map.removeLayer(googleSatellite);
              googleRoadmap.addTo(map);
            }
          };

          // Dense Street-Snapped Route (Follows ACTUAL Pune road curves)
          var primaryRoadCoords = ${JSON.stringify(PRIMARY_ROAD_COORDS)};

          var primaryCasing = L.polyline(primaryRoadCoords, {
            color: '#1558d6',
            weight: 8,
            opacity: 0.95,
            lineJoin: 'round'
          }).addTo(map);

          var primaryPolyline = L.polyline(primaryRoadCoords, {
            color: '#1a73e8',
            weight: 5,
            opacity: 1,
            lineJoin: 'round'
          }).addTo(map);

          // Pickup Marker
          var pickupIcon = L.divIcon({
            className: '',
            html: '<div class="pickup-flag-badge">🟢 Narayan Peth</div>',
            iconSize: [120, 24],
            iconAnchor: [60, 12]
          });
          L.marker([userLat, userLng], { icon: pickupIcon }).addTo(map);

          // Destination Drop Marker
          var dropIcon = L.divIcon({
            className: '',
            html: '<div class="dest-flag-badge">🏁 Megapolis Phase 3</div>',
            iconSize: [140, 24],
            iconAnchor: [70, 12]
          });
          L.marker([destLat, destLng], { icon: dropIcon }).addTo(map);

          // Authentic Google Maps Navigation Puck (No text label rotating diagonally!)
          var puckIcon = L.divIcon({
            className: '',
            html: '<div class="nav-puck-halo"></div><div class="nav-puck-body"><div id="car-arrow" class="nav-puck-arrow">▲</div></div>',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
          });
          var carMarker = L.marker([userLat, userLng], { icon: puckIcon, zIndexOffset: 1000 }).addTo(map);

          // Detect user touch interaction
          map.on('dragstart zoomstart touchstart', function() {
            isUserInteracting = true;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_TOUCH_MAP' }));
            }
          });

          // Recenter back onto vehicle
          window.recenterOnCar = function(lat, lng) {
            isUserInteracting = false;
            map.setView([lat, lng], isFullScreen ? 17.5 : 14, { animate: true, duration: 0.5 });
          };

          // Fit full route corridor
          window.fitRouteBounds = function() {
            isUserInteracting = false;
            map.fitBounds(primaryPolyline.getBounds(), { padding: [40, 60], animate: true });
          };

          // Fast JS Position Updater
          window.updateCarPosition = function(lat, lng, heading, speed) {
            userLat = lat;
            userLng = lng;
            carMarker.setLatLng([lat, lng]);

            var arrowEl = document.getElementById('car-arrow');
            if (arrowEl && heading !== undefined) {
              arrowEl.style.transform = 'rotate(' + heading + 'deg)';
            }

            if (isFullScreen && !isUserInteracting) {
              map.panTo([lat, lng], { animate: true, duration: 0.3 });
            }
          };

          // Initial view setup
          if (isFullScreen) {
            map.setView([userLat, userLng], 17.5);
          } else {
            // Fit route overview in mini-map with comfortable margin around controls
            map.fitBounds(primaryPolyline.getBounds(), { padding: [40, 60] });
          }
        </script>
      </body>
      </html>
    `;
  }, [isFullScreen]);

  return (
    <View style={[styles.container, isFullScreen ? styles.containerFullScreen : styles.containerStandard]}>
      {/* REAL GOOGLE MAPS WEBVIEW */}
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.webView}
        onLoadEnd={() => {
          setIsMapLoading(false);
          webViewRef.current?.injectJavaScript(`
            if (window.updateCarPosition) {
              window.updateCarPosition(${activeLat}, ${activeLng}, ${driverHeading}, ${driverSpeed});
            }
            true;
          `);
        }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={true}
        bounces={false}
        overScrollMode="never"
      />

      {isMapLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00543c" />
          <Text style={styles.loadingText}>Loading Google Maps...</Text>
        </View>
      )}

      {/* Floating Controls: Compass & Layer Toggle */}
      <View style={styles.rightFloatingControls}>
        <TouchableOpacity
          style={styles.iconCircleBtn}
          onPress={handleCenterCar}
          activeOpacity={0.8}
        >
          <Text style={styles.iconCircleBtnText}>🧭</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconCircleBtn}
          onPress={handleToggleMapType}
          activeOpacity={0.8}
        >
          <Text style={styles.iconCircleBtnText}>{mapType === 'roadmap' ? '🛰️' : '🗺️'}</Text>
        </TouchableOpacity>

        {/* Mini-Map Specific: Zoom In / Out */}
        {!isFullScreen && (
          <>
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={handleZoomIn}
              activeOpacity={0.8}
            >
              <Text style={[styles.iconCircleBtnText, { fontWeight: '900', fontSize: 20 }]}>+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={handleZoomOut}
              activeOpacity={0.8}
            >
              <Text style={[styles.iconCircleBtnText, { fontWeight: '900', fontSize: 20 }]}>−</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Re-centre Button (shown on bottom left) */}
      <TouchableOpacity
        style={[styles.recenterPillBtn, hasUserMovedMap && styles.recenterPillBtnActive]}
        onPress={isFullScreen ? handleCenterCar : handleFitRoute}
        activeOpacity={0.85}
      >
        <Text style={styles.recenterPillArrow}>▲</Text>
        <Text style={styles.recenterPillText}>{isFullScreen ? t.recenter : 'Fit Route'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  containerStandard: {
    height: 310,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginVertical: 10,
  },
  containerFullScreen: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    marginVertical: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  rightFloatingControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
    zIndex: 40,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
  iconCircleBtnText: {
    fontSize: 17,
  },
  recenterPillBtn: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#383838',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    gap: 6,
    zIndex: 40,
  },
  recenterPillBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#0f291e',
  },
  recenterPillArrow: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  recenterPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
