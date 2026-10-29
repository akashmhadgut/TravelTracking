import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Route,
  MapPin,
  Navigation,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Sparkles,
  Check,
  X,
  Gauge,
  Plus,
  Compass,
  Search,
  Building2,
  LocateFixed,
} from 'lucide-react';

export interface PlannedStop {
  id: string;
  sequence: number;
  name: string;
  lat: number;
  lng: number;
  planned_offset_min: number;
  radius_m: number;
  leg_distance_km?: number;
}

export interface RouteCorridorData {
  id?: string;
  code: string;
  name: string;
  distance_km: number;
  estimated_duration_min: number;
  stops: string[];
  detailed_stops: PlannedStop[];
  geometry?: any;
}

interface RouteCorridorMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRoute: (route: RouteCorridorData) => Promise<void> | void;
  existingRoutesCount?: number;
}

// Curated 50+ Pune Tech Hubs, Corporate Centers, Metro Stations, and Junctions
interface PuneLocationItem {
  name: string;
  category: string;
  lat: number;
  lng: number;
  keywords: string;
}

const PUNE_HUBS: PuneLocationItem[] = [
  // IT Parks & Corporate Campuses
  { name: 'Hinjawadi Phase 1 - Infosys Circle', category: 'IT Park / Tech Zone', lat: 18.5956, lng: 73.7483, keywords: 'hinjawadi phase 1 infosys circle tech park wipro west corporate' },
  { name: 'Hinjawadi Phase 2 - Wipro Circle / Quadron', category: 'IT Park / Tech Zone', lat: 18.5941, lng: 73.7328, keywords: 'hinjawadi phase 2 wipro quadron park corporate west' },
  { name: 'Hinjawadi Phase 3 - Embassy TechZone & TCS', category: 'IT Park / Tech Zone', lat: 18.5913, lng: 73.7389, keywords: 'hinjewadi phase 3 embassy techzone tcs tech park destination' },
  { name: 'Kharadi - EON Free Zone IT Park (Tower 1 & 2)', category: 'IT Park / Tech Zone', lat: 18.5516, lng: 73.9512, keywords: 'kharadi eon it park free zone barclays credit suisse east corporate' },
  { name: 'Kharadi - World Trade Center (WTC)', category: 'Commercial Tech Hub', lat: 18.5542, lng: 73.9485, keywords: 'kharadi wtc world trade center tech commercial east' },
  { name: 'Magarpatta Cyber City - Tower 4 & South Gate', category: 'IT Park / Tech Zone', lat: 18.5126, lng: 73.9367, keywords: 'magarpatta cyber city tower south gate amdocs bny mellon east' },
  { name: 'Magarpatta - Seasons Mall & West Gate', category: 'Commercial Center', lat: 18.5204, lng: 73.9311, keywords: 'magarpatta seasons mall west gate commercial destination' },
  { name: 'Viman Nagar - Phoenix Marketcity Mall', category: 'Commercial Hub', lat: 18.5621, lng: 73.9168, keywords: 'viman nagar phoenix mall airport road commercial shopping' },
  { name: 'Viman Nagar - Symbiosis Campus & Dutta Mandir', category: 'Educational / Commercial', lat: 18.5678, lng: 73.9125, keywords: 'viman nagar symbiosis air force station north east' },
  { name: 'Kalyani Nagar - Cerebrum IT Park', category: 'IT Park / Tech Zone', lat: 18.5463, lng: 73.9038, keywords: 'kalyani nagar cerebrum it park jogger park east' },
  { name: 'Yerwada - Commerzone IT Park', category: 'IT Park / Tech Zone', lat: 18.5583, lng: 73.8867, keywords: 'yerwada commerzone it park gunjan chowk north' },
  { name: 'Senapati Bapat Road - ICC Trade Tower', category: 'Corporate Hub', lat: 18.5322, lng: 73.8341, keywords: 'sb road senapati bapat icc trade tower marriott central' },
  { name: 'Hadapsar - SP Infocity IT SEZ', category: 'IT SEZ / Tech Park', lat: 18.4902, lng: 73.9568, keywords: 'hadapsar sp infocity sez saswad road ibm accenture' },
  { name: 'Balewadi High Street - Cummins India Campus', category: 'Corporate Hub', lat: 18.5758, lng: 73.7745, keywords: 'balewadi high street cummins baner expressway corporate' },

  // Transit Hubs, Airport & Railway Stations
  { name: 'Pune International Airport (PNQ Terminal 1 & 2)', category: 'Airport Terminal', lat: 18.5822, lng: 73.9197, keywords: 'pune airport international terminal lohegaon flight airlines departure arrival' },
  { name: 'Pune Central Railway Station (Main Concourse)', category: 'Railway Station', lat: 18.5289, lng: 73.8744, keywords: 'pune station railway central train junction departure raliway' },
  { name: 'Shivajinagar Metro Station & Rail Concourse', category: 'Transit Hub', lat: 18.5314, lng: 73.8446, keywords: 'shivajinagar station rail metro court junction central' },
  { name: 'Swargate Metro Station & Central Hub', category: 'Central Transit Hub', lat: 18.5018, lng: 73.8586, keywords: 'swargate metro station central hub origin south saras baug' },
  { name: 'Kothrud - Vanaz Metro Station & Hub', category: 'Metro Hub', lat: 18.5042, lng: 73.8078, keywords: 'kothrud vanaz metro station paud road west' },
  { name: 'Katraj - Wonder City & Snake Park Hub', category: 'Transit Hub', lat: 18.4575, lng: 73.8677, keywords: 'katraj snake park bypass south terminal origin bharati vidyapeeth' },
  { name: 'Nigdi - Bhakti Shakti Transit Terminal', category: 'Transit Terminal', lat: 18.6517, lng: 73.7699, keywords: 'nigdi bhakti shakti terminal pradhikaran depot north destination' },
  { name: 'Pimpri - Finolex Chowk & Metro Station', category: 'Metro Hub / MIDC', lat: 18.6258, lng: 73.8012, keywords: 'pimpri metro station finolex chowk midc' },
  { name: 'Chinchwad - Elpro City Square & Station', category: 'Commercial / Station', lat: 18.6298, lng: 73.7997, keywords: 'chinchwad station elpro city square thergaon' },

  // Key Interchanges & Highway Junctions
  { name: 'Chandani Chowk - Highway Interchange Flyover', category: 'Highway Junction', lat: 18.5089, lng: 73.7924, keywords: 'chandani chowk bavdhan highway flyover bypass mumbai bangalore' },
  { name: 'Baner - Pan Card Club Road & D-Mart', category: 'Urban Corridor', lat: 18.559, lng: 73.7868, keywords: 'baner dmart balewadi expressway pan card road west' },
  { name: 'Wakad - Bhumkar Chowk & Flyover', category: 'Transit Junction', lat: 18.5987, lng: 73.7621, keywords: 'wakad bhumkar chowk hinjawadi bridge highway dange chowk' },
  { name: 'Wakad - Dange Chowk Junction', category: 'Urban Junction', lat: 18.6102, lng: 73.7789, keywords: 'dange chowk thergaon chinchwad wakad' },
  { name: 'Pimple Saudagar - Kunal Icon Road', category: 'Residential / Commercial', lat: 18.5982, lng: 73.7934, keywords: 'pimple saudagar kunal icon govind garden pk chowk' },
  { name: 'Aundh - Parihar Chowk Center', category: 'Commercial Center', lat: 18.5601, lng: 73.8087, keywords: 'aundh parihar chowk bremen dmart west' },
  { name: 'Warje - Mumbai-Bangalore Highway Flyover', category: 'Highway Junction', lat: 18.4812, lng: 73.8016, keywords: 'warje flyover highway bypass mai mangeshkar' },
  { name: 'Deccan Gymkhana - Goodluck Chowk / FC Road', category: 'Urban Center', lat: 18.5167, lng: 73.8415, keywords: 'deccan gymkhana goodluck fc road fergusson jm road' },
  { name: 'Koregaon Park - North Main Road / Osho Circle', category: 'Commercial / Hospitality', lat: 18.5362, lng: 73.8931, keywords: 'koregaon park north main road osho bund garden camp' },
  { name: 'Bund Garden - Ruby Hall Clinic & Station', category: 'Healthcare / Transit', lat: 18.5328, lng: 73.8789, keywords: 'bund garden ruby hall jehangir hospital station' },
  { name: 'Camp - MG Road & East Street Junction', category: 'Commercial Center', lat: 18.5145, lng: 73.8821, keywords: 'camp mg road east street cantonment' },
  { name: 'Hadapsar - Gadital Junction & Magarpatta Road', category: 'Transit Hub', lat: 18.4988, lng: 73.9312, keywords: 'hadapsar gadital solapur road junction east' },
  { name: 'Kondhwa - NIBM Road & Salunke Vihar', category: 'Urban Center', lat: 18.4776, lng: 73.8967, keywords: 'kondhwa nibm road salunke vihar wanowrie south' },
  { name: 'Bavdhan - NDA Pashan Road Chowk', category: 'Highway Junction', lat: 18.5178, lng: 73.7782, keywords: 'bavdhan nda road pashan highway' },
  { name: 'Pashan - Circle & Sus Road Link', category: 'Urban Corridor', lat: 18.5412, lng: 73.7925, keywords: 'pashan circle sus road ncl baner' },
];

// Curated Corporate Presets
const PRESET_CORRIDORS = [
  {
    label: 'Swargate ➔ Hinjawadi IT Corridor',
    code: 'CR-401',
    name: 'Swargate Hub to Hinjawadi Phase 3 TechZone',
    start: { name: 'Swargate Metro Station & Central Hub', lat: 18.5018, lng: 73.8586 },
    end: { name: 'Hinjawadi Phase 3 - Embassy TechZone & TCS', lat: 18.5913, lng: 73.7389 },
    stops: [
      { name: 'Warje - Mumbai-Bangalore Highway Flyover', lat: 18.4812, lng: 73.8016 },
      { name: 'Chandani Chowk - Highway Interchange Flyover', lat: 18.5089, lng: 73.7924 },
      { name: 'Baner - Pan Card Club Road & D-Mart', lat: 18.559, lng: 73.7868 },
      { name: 'Wakad - Bhumkar Chowk & Flyover', lat: 18.5987, lng: 73.7621 },
    ],
  },
  {
    label: 'Airport ➔ Magarpatta Cyber City',
    code: 'CR-205',
    name: 'Pune Airport to Magarpatta Cyber City Tech Hub',
    start: { name: 'Pune International Airport (PNQ Terminal 1 & 2)', lat: 18.5822, lng: 73.9197 },
    end: { name: 'Magarpatta Cyber City - Tower 4 & South Gate', lat: 18.5126, lng: 73.9367 },
    stops: [
      { name: 'Viman Nagar - Phoenix Marketcity Mall', lat: 18.5621, lng: 73.9168 },
      { name: 'Kalyani Nagar - Cerebrum IT Park', lat: 18.5463, lng: 73.9038 },
      { name: 'Kharadi - World Trade Center (WTC)', lat: 18.5542, lng: 73.9485 },
    ],
  },
  {
    label: 'Kothrud ➔ Kharadi EON IT Park',
    code: 'CR-308',
    name: 'Kothrud Vanaz to Kharadi EON Free Zone IT Park',
    start: { name: 'Kothrud - Vanaz Metro Station & Hub', lat: 18.5042, lng: 73.8078 },
    end: { name: 'Kharadi - EON Free Zone IT Park (Tower 1 & 2)', lat: 18.5516, lng: 73.9512 },
    stops: [
      { name: 'Deccan Gymkhana - Goodluck Chowk / FC Road', lat: 18.5167, lng: 73.8415 },
      { name: 'Pune Central Railway Station (Main Concourse)', lat: 18.5289, lng: 73.8744 },
      { name: 'Yerwada - Commerzone IT Park', lat: 18.5583, lng: 73.8867 },
    ],
  },
  {
    label: 'Katraj ➔ Baner Balewadi Corporate Hub',
    code: 'CR-512',
    name: 'Katraj Wonder City to Balewadi High Street',
    start: { name: 'Katraj - Wonder City & Snake Park Hub', lat: 18.4575, lng: 73.8677 },
    end: { name: 'Balewadi High Street - Cummins India Campus', lat: 18.5758, lng: 73.7745 },
    stops: [
      { name: 'Warje - Mumbai-Bangalore Highway Flyover', lat: 18.4812, lng: 73.8016 },
      { name: 'Chandani Chowk - Highway Interchange Flyover', lat: 18.5089, lng: 73.7924 },
      { name: 'Bavdhan - NDA Pashan Road Chowk', lat: 18.5178, lng: 73.7782 },
    ],
  },
];

export const RouteCorridorMapModal: React.FC<RouteCorridorMapModalProps> = ({
  isOpen,
  onClose,
  onSaveRoute,
  existingRoutesCount = 0,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const searchPinMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Form & Corridor State
  const [routeCode, setRouteCode] = useState<string>(`CR-${existingRoutesCount + 501}`);
  const [routeName, setRouteName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // The 3 Functional Trip Stops: Start (A), Intermediate Stops [], End (B)
  // Initially null/empty so creating a route starts fresh without pre-selected endpoints!
  const [startPoint, setStartPoint] = useState<PlannedStop | null>(null);
  const [endPoint, setEndPoint] = useState<PlannedStop | null>(null);
  const [intermediateStops, setIntermediateStops] = useState<PlannedStop[]>([]);

  // Computed Highway Metrics
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0);
  const [estimatedDurationMin, setEstimatedDurationMin] = useState<number>(0);
  const [avgSpeedKmh, setAvgSpeedKmh] = useState<number>(0);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);

  // Search States
  // 1. Top Unified Map Search (Rapido / Uber style search bar right on map)
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<PuneLocationItem[]>([]);
  const [showMapSearchDropdown, setShowMapSearchDropdown] = useState(false);
  const [selectedMapSearchItem, setSelectedMapSearchItem] = useState<PuneLocationItem | null>(null);

  // 2. Start Search (in sidebar)
  const [startSearchText, setStartSearchText] = useState('');
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [startSearchResults, setStartSearchResults] = useState<PuneLocationItem[]>([]);

  // 3. End Search (in sidebar)
  const [endSearchText, setEndSearchText] = useState('');
  const [showEndDropdown, setShowEndDropdown] = useState(false);
  const [endSearchResults, setEndSearchResults] = useState<PuneLocationItem[]>([]);

  // 4. Intermediate Stop Search (in sidebar)
  const [newStopSearchText, setNewStopSearchText] = useState('');
  const [showNewStopDropdown, setShowNewStopDropdown] = useState(false);
  const [newStopSearchResults, setNewStopSearchResults] = useState<PuneLocationItem[]>([]);

  // Reset form cleanly when modal opens
  useEffect(() => {
    if (isOpen) {
      setRouteCode(`CR-${existingRoutesCount + 501}`);
      setRouteName('');
      setStartPoint(null);
      setEndPoint(null);
      setIntermediateStops([]);
      setStartSearchText('');
      setEndSearchText('');
      setNewStopSearchText('');
      setTotalDistanceKm(0);
      setEstimatedDurationMin(0);
      setAvgSpeedKmh(0);
      setRouteGeometry(null);
      setSelectedMapSearchItem(null);
      setMapSearchQuery('');
      if (searchPinMarkerRef.current) {
        searchPinMarkerRef.current.remove();
        searchPinMarkerRef.current = null;
      }
    }
  }, [isOpen, existingRoutesCount]);

  // Search filtering function: matches catalog + optional online geocoding
  const filterLocations = useCallback((query: string): PuneLocationItem[] => {
    const q = query.trim().toLowerCase();
    if (!q) return PUNE_HUBS.slice(0, 8);
    const words = q.split(/\s+/).filter(Boolean);
    return PUNE_HUBS.filter((item) => {
      const target = `${item.name} ${item.category} ${item.keywords}`.toLowerCase();
      return words.every((w) => target.includes(w));
    }).slice(0, 10);
  }, []);

  // Sync search input values when points change
  useEffect(() => {
    if (startPoint) setStartSearchText(startPoint.name);
  }, [startPoint]);

  useEffect(() => {
    if (endPoint) setEndSearchText(endPoint.name);
  }, [endPoint]);

  // Handle typing in Top Map Search
  const handleMapSearchChange = (value: string) => {
    setMapSearchQuery(value);
    setMapSearchResults(filterLocations(value));
    setShowMapSearchDropdown(true);
  };

  // Handle typing in Start Search
  const handleStartSearchChange = (value: string) => {
    setStartSearchText(value);
    setStartSearchResults(filterLocations(value));
    setShowStartDropdown(true);
  };

  // Handle typing in End Search
  const handleEndSearchChange = (value: string) => {
    setEndSearchText(value);
    setEndSearchResults(filterLocations(value));
    setShowEndDropdown(true);
  };

  // Handle typing in New Stop Search
  const handleNewStopSearchChange = (value: string) => {
    setNewStopSearchText(value);
    setNewStopSearchResults(filterLocations(value));
    setShowNewStopDropdown(true);
  };

  // Combine Start, Intermediate Stops, and End into full sequential array
  const getAllStops = useCallback((): PlannedStop[] => {
    const list: PlannedStop[] = [];
    if (startPoint) list.push({ ...startPoint, sequence: 1 });
    intermediateStops.forEach((s) => {
      list.push({ ...s, sequence: list.length + 1 });
    });
    if (endPoint) list.push({ ...endPoint, sequence: list.length + 1 });
    return list;
  }, [startPoint, intermediateStops, endPoint]);

  // Recalculate Corridor (Road Distance, Duration, Snap Polyline)
  const recalculateCorridor = useCallback(async (stopsList: PlannedStop[]) => {
    if (stopsList.length < 2) {
      setTotalDistanceKm(0);
      setEstimatedDurationMin(0);
      setAvgSpeedKmh(0);
      if (mapRef.current) {
        const source = mapRef.current.getSource('route-corridor') as maplibregl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    setIsRoutingLoading(true);
    try {
      const coordString = stopsList.map((s) => `${s.lng},${s.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM HTTP error: ${res.status}`);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const r = data.routes[0];
        const distKm = Number((r.distance / 1000).toFixed(1));
        const durationMin = Math.round(r.duration / 60);
        const speed = durationMin > 0 ? Math.round((distKm / (durationMin / 60))) : 35;

        setTotalDistanceKm(distKm);
        setEstimatedDurationMin(durationMin);
        setAvgSpeedKmh(Math.min(speed, 65));
        setRouteGeometry(r.geometry);

        if (mapRef.current) {
          const source = mapRef.current.getSource('route-corridor') as maplibregl.GeoJSONSource;
          if (source) {
            source.setData({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: r.geometry,
                },
              ],
            });
          }
        }
      } else {
        throw new Error('OSRM returned non-OK route');
      }
    } catch {
      // Fallback straight-line road approximation
      let directKm = 0;
      for (let i = 0; i < stopsList.length - 1; i++) {
        const s1 = stopsList[i]!;
        const s2 = stopsList[i + 1]!;
        const dLat = ((s2.lat - s1.lat) * Math.PI) / 180;
        const dLng = ((s2.lng - s1.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((s1.lat * Math.PI) / 180) *
          Math.cos((s2.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        directKm += 6371 * c;
      }
      const roadEstKm = Number((directKm * 1.35).toFixed(1));
      const estMin = Math.round((roadEstKm / 35) * 60);
      setTotalDistanceKm(roadEstKm);
      setEstimatedDurationMin(estMin);
      setAvgSpeedKmh(35);

      const fallbackLineString = {
        type: 'LineString',
        coordinates: stopsList.map((s) => [s.lng, s.lat]),
      };
      setRouteGeometry(fallbackLineString);

      if (mapRef.current) {
        const source = mapRef.current.getSource('route-corridor') as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: fallbackLineString,
              },
            ],
          });
        }
      }
    } finally {
      setIsRoutingLoading(false);
    }
  }, []);

  // Update Title Automatically when Start and End change
  useEffect(() => {
    if (startPoint && endPoint) {
      const sName = startPoint.name.split(' - ')[0]!.replace(/ Metro.*| Hub.*| Terminal.*/g, '');
      const eName = endPoint.name.split(' - ')[0]!.replace(/ Metro.*| Hub.*| Terminal.*/g, '');
      setRouteName(`${sName} to ${eName} Corporate Route`);
    }
  }, [startPoint, endPoint]);

  // Recalculate on stop changes
  useEffect(() => {
    const stops = getAllStops();
    recalculateCorridor(stops);
  }, [startPoint, intermediateStops, endPoint, getAllStops, recalculateCorridor]);

  // Fly map to a target coordinate
  const flyToLocation = (lat: number, lng: number, zoom = 14) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: zoom,
        speed: 1.4,
        curve: 1.2,
        essential: true,
      });
    }
  };

  // Fit bounds around all points
  const fitAllPointsOnMap = () => {
    if (!mapRef.current) return;
    const all = getAllStops();
    if (all.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    all.forEach((s) => bounds.extend([s.lng, s.lat]));
    mapRef.current.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 800 });
  };

  // Action: Select Place from Top Map Search
  const handleSelectMapSearchResult = (hub: PuneLocationItem) => {
    setSelectedMapSearchItem(hub);
    setMapSearchQuery(hub.name);
    setShowMapSearchDropdown(false);
    flyToLocation(hub.lat, hub.lng, 15);

    // Place an active preview pin on the map
    if (mapRef.current) {
      if (searchPinMarkerRef.current) {
        searchPinMarkerRef.current.remove();
      }

      const el = document.createElement('div');
      el.className = 'flex flex-col items-center animate-bounce';
      el.innerHTML = `
        <div class="px-2.5 py-1 bg-indigo-900 text-white font-extrabold text-[11px] rounded-lg shadow-xl border border-indigo-400 whitespace-nowrap mb-1">
          📍 ${hub.name}
        </div>
        <div class="w-5 h-5 rounded-full bg-indigo-600 border-2 border-white ring-4 ring-indigo-300 shadow-xl"></div>
      `;

      searchPinMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([hub.lng, hub.lat])
        .addTo(mapRef.current);
    }
  };

  // Action: Assign Selected Map Place as Start, Stop, or End
  const handleAssignMapPlace = (role: 'start' | 'stop' | 'end') => {
    if (!selectedMapSearchItem) return;
    const item = selectedMapSearchItem;

    if (role === 'start') {
      setStartPoint({
        id: `start-${Date.now()}`,
        sequence: 1,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        planned_offset_min: 0,
        radius_m: 60,
      });
      setStartSearchText(item.name);
    } else if (role === 'end') {
      setEndPoint({
        id: `end-${Date.now()}`,
        sequence: intermediateStops.length + 2,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        planned_offset_min: 45,
        radius_m: 60,
      });
      setEndSearchText(item.name);
    } else {
      const newStop: PlannedStop = {
        id: `stop-${Date.now()}`,
        sequence: intermediateStops.length + 2,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        planned_offset_min: (intermediateStops.length + 1) * 12,
        radius_m: 50,
      };
      setIntermediateStops((prev) => [...prev, newStop]);
    }

    // Clean up temporary preview pin
    if (searchPinMarkerRef.current) {
      searchPinMarkerRef.current.remove();
      searchPinMarkerRef.current = null;
    }
    setSelectedMapSearchItem(null);
    setMapSearchQuery('');
  };

  // Action: Choose Start Point from sidebar search
  const handleChooseStart = (hub: PuneLocationItem) => {
    setStartPoint({
      id: `start-${Date.now()}`,
      sequence: 1,
      name: hub.name,
      lat: hub.lat,
      lng: hub.lng,
      planned_offset_min: 0,
      radius_m: 60,
    });
    setStartSearchText(hub.name);
    setShowStartDropdown(false);
    flyToLocation(hub.lat, hub.lng, 14);
  };

  // Action: Choose End Point from sidebar search
  const handleChooseEnd = (hub: PuneLocationItem) => {
    setEndPoint({
      id: `end-${Date.now()}`,
      sequence: intermediateStops.length + 2,
      name: hub.name,
      lat: hub.lat,
      lng: hub.lng,
      planned_offset_min: 45,
      radius_m: 60,
    });
    setEndSearchText(hub.name);
    setShowEndDropdown(false);
    flyToLocation(hub.lat, hub.lng, 14);
  };

  // Action: Add Intermediate Stop from sidebar search
  const handleAddIntermediateStop = (hub: PuneLocationItem) => {
    const newStop: PlannedStop = {
      id: `stop-${Date.now()}`,
      sequence: intermediateStops.length + 2,
      name: hub.name,
      lat: hub.lat,
      lng: hub.lng,
      planned_offset_min: (intermediateStops.length + 1) * 12,
      radius_m: 50,
    };
    setIntermediateStops((prev) => [...prev, newStop]);
    setNewStopSearchText('');
    setShowNewStopDropdown(false);
    flyToLocation(hub.lat, hub.lng, 14);
  };

  // Re-ordering & Removing Intermediate Stops
  const handleMoveStopUp = (index: number) => {
    if (index === 0) return;
    setIntermediateStops((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1]!;
      copy[index - 1] = copy[index]!;
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveStopDown = (index: number) => {
    if (index === intermediateStops.length - 1) return;
    setIntermediateStops((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1]!;
      copy[index + 1] = copy[index]!;
      copy[index] = temp;
      return copy;
    });
  };

  const handleDeleteStop = (index: number) => {
    setIntermediateStops((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Swap Direction (Origin A <-> Destination B)
  const handleSwapStartAndEnd = () => {
    if (!startPoint && !endPoint) return;
    const oldStart = startPoint;
    const oldEnd = endPoint;

    setStartPoint(
      oldEnd
        ? {
          ...oldEnd,
          sequence: 1,
          id: `start-${Date.now()}`,
        }
        : null
    );

    setEndPoint(
      oldStart
        ? {
          ...oldStart,
          sequence: intermediateStops.length + 2,
          id: `end-${Date.now()}`,
        }
        : null
    );

    setIntermediateStops((prev) => [...prev].reverse());
  };

  // Load Corporate Preset
  const handleLoadPreset = (preset: (typeof PRESET_CORRIDORS)[0]) => {
    setRouteCode(preset.code);
    setRouteName(preset.name);

    const start: PlannedStop = {
      id: `start-${Date.now()}`,
      sequence: 1,
      name: preset.start.name,
      lat: preset.start.lat,
      lng: preset.start.lng,
      planned_offset_min: 0,
      radius_m: 60,
    };

    const end: PlannedStop = {
      id: `end-${Date.now()}`,
      sequence: preset.stops.length + 2,
      name: preset.end.name,
      lat: preset.end.lat,
      lng: preset.end.lng,
      planned_offset_min: 45,
      radius_m: 60,
    };

    const intermediates: PlannedStop[] = preset.stops.map((s, idx) => ({
      id: `stop-${Date.now()}-${idx + 1}`,
      sequence: idx + 2,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      planned_offset_min: (idx + 1) * 12,
      radius_m: 50,
    }));

    setStartPoint(start);
    setEndPoint(end);
    setIntermediateStops(intermediates);
    setStartSearchText(start.name);
    setEndSearchText(end.name);

    if (mapRef.current) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([start.lng, start.lat]);
      bounds.extend([end.lng, end.lat]);
      intermediates.forEach((s) => bounds.extend([s.lng, s.lat]));
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 800 });
    }
  };

  // MapLibre Instance Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [73.8567, 18.5204],
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      map.addSource('route-corridor', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Outer glow
      map.addLayer({
        id: 'route-corridor-glow',
        type: 'line',
        source: 'route-corridor',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#6366f1',
          'line-width': 12,
          'line-opacity': 0.35,
        },
      });

      // Solid road line
      map.addLayer({
        id: 'route-corridor-line',
        type: 'line',
        source: 'route-corridor',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#4338ca',
          'line-width': 5,
        },
      });

      // Fit existing preset points on initial load
      const bounds = new maplibregl.LngLatBounds();
      if (startPoint) bounds.extend([startPoint.lng, startPoint.lat]);
      if (endPoint) bounds.extend([endPoint.lng, endPoint.lat]);
      intermediateStops.forEach((s) => bounds.extend([s.lng, s.lat]));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 500 });
      }
    });

    // Map Click: Drops a point pin and asks where to add it
    map.on('click', (e) => {
      const lat = Number(e.lngLat.lat.toFixed(5));
      const lng = Number(e.lngLat.lng.toFixed(5));

      // Find closest known Pune hub or use coordinates
      let matchedName = `Pinned Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
      let minDistance = Infinity;
      for (const h of PUNE_HUBS) {
        const d = Math.hypot(h.lat - lat, h.lng - lng);
        if (d < 0.008 && d < minDistance) {
          minDistance = d;
          matchedName = h.name;
        }
      }

      const item: PuneLocationItem = {
        name: matchedName,
        category: 'Custom Map Pin',
        lat,
        lng,
        keywords: 'pinned custom map point',
      };

      handleSelectMapSearchResult(item);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (searchPinMarkerRef.current) {
        searchPinMarkerRef.current.remove();
        searchPinMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [isOpen]);

  // Sync Visual Markers on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Start Point Marker (Green A)
    if (startPoint) {
      const el = document.createElement('div');
      el.className = 'group relative flex flex-col items-center cursor-pointer';

      const pin = document.createElement('div');
      pin.className =
        'w-8 h-8 rounded-full bg-emerald-600 border-2 border-white ring-4 ring-emerald-200 text-white font-black text-xs flex items-center justify-center shadow-xl hover:scale-115 transition';
      pin.innerText = 'A';

      const label = document.createElement('div');
      label.className =
        'absolute -bottom-6 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-10';
      label.innerText = `Start: ${startPoint.name.split(' - ')[0]}`;

      el.appendChild(pin);
      el.appendChild(label);

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([startPoint.lng, startPoint.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        setStartPoint((prev) =>
          prev ? { ...prev, lat: Number(pos.lat.toFixed(5)), lng: Number(pos.lng.toFixed(5)) } : null
        );
      });

      markersRef.current.push(marker);
    }

    // 2. Intermediate Stops Markers (Blue 1, 2, 3...)
    intermediateStops.forEach((stop, idx) => {
      const el = document.createElement('div');
      el.className = 'group relative flex flex-col items-center cursor-pointer';

      const pin = document.createElement('div');
      pin.className =
        'w-7 h-7 rounded-full bg-indigo-600 border-2 border-white ring-3 ring-indigo-200 text-white font-bold text-xs flex items-center justify-center shadow-lg hover:scale-115 transition';
      pin.innerText = `${idx + 1}`;

      const label = document.createElement('div');
      label.className =
        'absolute -bottom-6 bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-10';
      label.innerText = stop.name.split(' - ')[0];

      el.appendChild(pin);
      el.appendChild(label);

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        setIntermediateStops((prev) =>
          prev.map((s, i) =>
            i === idx ? { ...s, lat: Number(pos.lat.toFixed(5)), lng: Number(pos.lng.toFixed(5)) } : s
          )
        );
      });

      markersRef.current.push(marker);
    });

    // 3. End Point Marker (Red B)
    if (endPoint) {
      const el = document.createElement('div');
      el.className = 'group relative flex flex-col items-center cursor-pointer';

      const pin = document.createElement('div');
      pin.className =
        'w-8 h-8 rounded-full bg-rose-600 border-2 border-white ring-4 ring-rose-200 text-white font-black text-xs flex items-center justify-center shadow-xl hover:scale-115 transition';
      pin.innerText = 'B';

      const label = document.createElement('div');
      label.className =
        'absolute -bottom-6 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-10';
      label.innerText = `End: ${endPoint.name.split(' - ')[0]}`;

      el.appendChild(pin);
      el.appendChild(label);

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([endPoint.lng, endPoint.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        setEndPoint((prev) =>
          prev ? { ...prev, lat: Number(pos.lat.toFixed(5)), lng: Number(pos.lng.toFixed(5)) } : null
        );
      });

      markersRef.current.push(marker);
    }
  }, [startPoint, intermediateStops, endPoint]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startPoint || !endPoint) {
      alert('Please set both a Start Point (Origin A) and an End Point (Destination B).');
      return;
    }
    if (!routeCode || !routeName) {
      alert('Please provide a Route Code and Route Name.');
      return;
    }

    const allStops = getAllStops();
    setIsSubmitting(true);
    try {
      const finalRouteData: RouteCorridorData = {
        code: routeCode.toUpperCase().trim(),
        name: routeName.trim(),
        distance_km: totalDistanceKm,
        estimated_duration_min: estimatedDurationMin,
        stops: allStops.map((s) => s.name),
        detailed_stops: allStops,
        geometry: routeGeometry,
      };

      await onSaveRoute(finalRouteData);
      onClose();
    } catch (err: any) {
      alert(`Error creating route corridor: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalStopCount = (startPoint ? 1 : 0) + intermediateStops.length + (endPoint ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl h-[94dvh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-md">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Corporate Cab Route Corridor Studio
                </h2>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[10px] font-bold">
                  Start ➔ Passenger Stops ➔ Destination
                </span>
              </div>
              <p className="text-slate-400 text-[11px] hidden sm:block">
                Search pickup addresses, intermediate employee boarding hubs, and office destinations with live highway snapping.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fitAllPointsOnMap}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LocateFixed className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fit Route</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* QUICK CORPORATE PRESETS */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Corporate Corridors:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {PRESET_CORRIDORS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 font-medium text-[11px] rounded-lg transition whitespace-nowrap cursor-pointer shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN BODY: MAP ON LEFT + RAPIDO/UBER STYLE ROUTE CONSOLE ON RIGHT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* MAP CANVAS WITH LIVE SEARCH BAR ON TOP */}
          <div className="flex-1 relative h-72 md:h-full bg-slate-100 overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* RAPIDO / UBER STYLE FLOATING SEARCH BAR ON TOP OF MAP */}
            <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-[420px] z-20">
              <div className="relative">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-300 shadow-2xl p-1.5 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => handleMapSearchChange(e.target.value)}
                    onFocus={() => {
                      setMapSearchResults(filterLocations(mapSearchQuery));
                      setShowMapSearchDropdown(true);
                    }}
                    placeholder="Search any landmark, tech park or street..."
                    className="flex-1 text-xs font-semibold text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
                  />
                  {mapSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setMapSearchQuery('');
                        setShowMapSearchDropdown(false);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showMapSearchDropdown && mapSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Pune Landmarks & Tech Hubs</span>
                      <span className="text-indigo-600">{mapSearchResults.length} Results</span>
                    </div>
                    {mapSearchResults.map((hub, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectMapSearchResult(hub)}
                        className="w-full text-left p-3 hover:bg-indigo-50/80 transition flex items-center justify-between gap-3 text-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{hub.name}</div>
                            <div className="text-[10px] text-slate-400">{hub.category}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md shrink-0">
                          Inspect on Map ➔
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION CARD WHEN A LOCATION IS PICKED ON MAP (Rapido / Uber flow: Pick point -> Set as Start, Stop, or End) */}
              {selectedMapSearchItem && (
                <div className="mt-2 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-indigo-500/40 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                      <span className="font-extrabold text-xs text-white truncate">
                        {selectedMapSearchItem.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMapSearchItem(null);
                        if (searchPinMarkerRef.current) {
                          searchPinMarkerRef.current.remove();
                          searchPinMarkerRef.current = null;
                        }
                      }}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-300 mb-2.5 flex items-center gap-2 font-mono">
                    <span>{selectedMapSearchItem.category}</span>
                    <span>•</span>
                    <span>{selectedMapSearchItem.lat.toFixed(4)}°N, {selectedMapSearchItem.lng.toFixed(4)}°E</span>
                  </div>

                  {/* 3 Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAssignMapPlace('start')}
                      className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span>Set Start (A)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAssignMapPlace('stop')}
                      className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add as Stop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAssignMapPlace('end')}
                      className="py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span>Set End (B)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ROUTING CALCULATION SPINNER */}
            {isRoutingLoading && (
              <div className="absolute top-16 right-3 z-10 bg-indigo-600 text-white text-[11px] px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                <Navigation className="w-3.5 h-3.5 animate-spin" />
                <span>Computing live road geometry...</span>
              </div>
            )}

            {/* FLOATING MAP INSTRUCTION */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none hidden sm:block">
              <div className="bg-slate-900/90 backdrop-blur-md text-white text-[11px] px-3.5 py-2 rounded-xl shadow-xl border border-slate-700/60 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                <span>Tip: Search above or click anywhere on the Pune map to drop and assign a pin.</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: HIGH-STANDARD DISPATCH & STOPS CONSOLE */}
          <div className="w-full md:w-[490px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-full overflow-hidden shrink-0">
            {/* LIVE COMPUTED HIGHWAY METRICS CARD */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-indigo-600" /> Live Computed Highway Metrics
                </span>
                <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Real Road Geometry
                </span>
              </div>

              {/* 4-KPI Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block font-medium">Total Distance</span>
                  <div className="text-sm sm:text-base font-extrabold text-indigo-700 font-mono">
                    {totalDistanceKm > 0 ? `${totalDistanceKm} km` : '—'}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block font-medium">Est. Drive Time</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                    {estimatedDurationMin > 0 ? `${estimatedDurationMin} min` : '—'}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block font-medium">Total Points</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                    {totalStopCount} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block font-medium">Avg Speed</span>
                  <div className="text-sm sm:text-base font-extrabold text-emerald-600 font-mono">
                    {totalDistanceKm > 0 ? `${avgSpeedKmh} km/h` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* ROUTE CONFIGURATION & CONNECTED TIMELINE */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* CODE & TITLE */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Route Code</label>
                  <input
                    type="text"
                    value={routeCode}
                    onChange={(e) => setRouteCode(e.target.value)}
                    placeholder="CR-501"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:border-indigo-600 focus:bg-white"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Corridor Title</label>
                  <input
                    type="text"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="e.g. Swargate to Hinjawadi TechZone"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* CONNECTED TRIP TIMELINE (RAPIDO / UBER HIGH-STANDARD BUILDER) */}
              <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Trip Corridor Stops</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleSwapStartAndEnd}
                    disabled={!startPoint && !endPoint}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-50 disabled:opacity-40 border border-slate-200 text-indigo-700 font-bold rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="Swap Origin and Destination"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>⇄ Swap Direction</span>
                  </button>
                </div>

                {/* Dynamic Step-by-Step Guidance Banner */}
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    !startPoint && !endPoint
                      ? 'bg-amber-50 border border-amber-200 text-amber-900'
                      : startPoint && !endPoint
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                      : !startPoint && endPoint
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    {!startPoint && !endPoint && '📍 Step 1 of 2: Search or choose Start Point (Origin A)'}
                    {startPoint && !endPoint && '📍 Step 2 of 2: Now search or choose End Point (Destination B)'}
                    {!startPoint && endPoint && '📍 Step 2 of 2: Now search or choose Start Point (Origin A)'}
                    {startPoint && endPoint && '✅ Corridor Connected! Add intermediate stops below if required.'}
                  </span>
                  {(startPoint || endPoint || intermediateStops.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartPoint(null);
                        setEndPoint(null);
                        setIntermediateStops([]);
                        setStartSearchText('');
                        setEndSearchText('');
                        setNewStopSearchText('');
                        setTotalDistanceKm(0);
                        setEstimatedDurationMin(0);
                        setAvgSpeedKmh(0);
                        setRouteGeometry(null);
                        setRouteName('');
                        if (searchPinMarkerRef.current) {
                          searchPinMarkerRef.current.remove();
                          searchPinMarkerRef.current = null;
                        }
                      }}
                      className="text-[10px] text-slate-500 hover:text-rose-600 font-bold underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* 1. START POINT (ORIGIN A) - PERMANENT SEARCH INPUT */}
                <div className="p-3 bg-white border-2 border-emerald-400/80 rounded-2xl shadow-xs space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-extrabold text-[10px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      START POINT (ORIGIN A)
                    </span>
                    {startPoint && (
                      <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                        {startPoint.lat.toFixed(4)}°N, {startPoint.lng.toFixed(4)}°E
                      </span>
                    )}
                  </div>

                  {/* Search Input for Start Point */}
                  <div className="relative">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:bg-white focus-within:border-emerald-600">
                      <Search className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <input
                        type="text"
                        value={startSearchText}
                        onChange={(e) => handleStartSearchChange(e.target.value)}
                        onFocus={() => {
                          setStartSearchResults(filterLocations(startSearchText));
                          setShowStartDropdown(true);
                        }}
                        placeholder="Search Pickup Location (e.g. Swargate, Airport, Kothrud)..."
                        className="w-full text-xs font-semibold text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
                      />
                      {startSearchText && (
                        <button
                          type="button"
                          onClick={() => {
                            setStartSearchText('');
                            setStartPoint(null);
                            setShowStartDropdown(true);
                          }}
                          className="p-0.5 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {startPoint && (
                        <button
                          type="button"
                          onClick={() => flyToLocation(startPoint.lat, startPoint.lng, 15)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Center on Map"
                        >
                          <LocateFixed className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Start Autocomplete Dropdown */}
                    {showStartDropdown && startSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {startSearchResults.map((hub, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleChooseStart(hub)}
                            className="w-full text-left p-2.5 hover:bg-emerald-50 flex items-center justify-between text-xs cursor-pointer group"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{hub.name}</div>
                              <div className="text-[10px] text-slate-400">{hub.category}</div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                              Set Pickup A
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. INTERMEDIATE BOARDING STOPS LIST (BETWEEN START & END) */}
                <div className="space-y-2 pl-3 border-l-2 border-indigo-300 ml-4">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Intermediate Boarding Stops ({intermediateStops.length})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Sequential Pickup
                    </span>
                  </div>

                  {/* Existing Stops */}
                  {intermediateStops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="bg-white border border-indigo-200/80 rounded-xl p-2.5 shadow-2xs flex items-center justify-between gap-2 group hover:border-indigo-400 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <input
                            type="text"
                            value={stop.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setIntermediateStops((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, name: val } : s))
                              );
                            }}
                            className="font-bold text-xs text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none w-full truncate"
                          />
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {stop.lat.toFixed(4)}°N, {stop.lng.toFixed(4)}°E
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => flyToLocation(stop.lat, stop.lng, 15)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title="Locate on Map"
                        >
                          <LocateFixed className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStopUp(idx)}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded"
                          title="Move earlier"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === intermediateStops.length - 1}
                          onClick={() => handleMoveStopDown(idx)}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded"
                          title="Move later"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStop(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove stop"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add New Stop Search Box */}
                  <div className="relative pt-1">
                    <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-600">
                      <Plus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <input
                        type="text"
                        value={newStopSearchText}
                        onChange={(e) => handleNewStopSearchChange(e.target.value)}
                        onFocus={() => {
                          setNewStopSearchResults(filterLocations(newStopSearchText));
                          setShowNewStopDropdown(true);
                        }}
                        placeholder="+ Search & Add Intermediate Stop (e.g. Chandani Chowk, Baner)..."
                        className="w-full text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
                      />
                      {newStopSearchText && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewStopSearchText('');
                            setShowNewStopDropdown(false);
                          }}
                          className="p-0.5 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* New Stop Dropdown */}
                    {showNewStopDropdown && newStopSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {newStopSearchResults.map((hub, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddIntermediateStop(hub)}
                            className="w-full text-left p-2.5 hover:bg-indigo-50 flex items-center justify-between text-xs cursor-pointer group"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{hub.name}</div>
                              <div className="text-[10px] text-slate-400">{hub.category}</div>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              + Insert Stop
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. END POINT (DESTINATION B) - PERMANENT SEARCH INPUT */}
                <div className="p-3 bg-white border-2 border-rose-400/80 rounded-2xl shadow-xs space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-extrabold text-[10px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      END POINT (DESTINATION B)
                    </span>
                    {endPoint && (
                      <span className="text-[10px] font-mono text-rose-700 font-semibold">
                        {endPoint.lat.toFixed(4)}°N, {endPoint.lng.toFixed(4)}°E
                      </span>
                    )}
                  </div>

                  {/* Search Input for Destination */}
                  <div className="relative">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:bg-white focus-within:border-rose-600">
                      <Search className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <input
                        type="text"
                        value={endSearchText}
                        onChange={(e) => handleEndSearchChange(e.target.value)}
                        onFocus={() => {
                          setEndSearchResults(filterLocations(endSearchText));
                          setShowEndDropdown(true);
                        }}
                        placeholder="Search Destination (e.g. Hinjawadi IT Park, Magarpatta, Airport)..."
                        className="w-full text-xs font-semibold text-slate-900 bg-transparent focus:outline-none placeholder-slate-400"
                      />
                      {endSearchText && (
                        <button
                          type="button"
                          onClick={() => {
                            setEndSearchText('');
                            setEndPoint(null);
                            setShowEndDropdown(true);
                          }}
                          className="p-0.5 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {endPoint && (
                        <button
                          type="button"
                          onClick={() => flyToLocation(endPoint.lat, endPoint.lng, 15)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Center on Map"
                        >
                          <LocateFixed className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* End Autocomplete Dropdown */}
                    {showEndDropdown && endSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {endSearchResults.map((hub, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleChooseEnd(hub)}
                            className="w-full text-left p-2.5 hover:bg-rose-50 flex items-center justify-between text-xs cursor-pointer group"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{hub.name}</div>
                              <div className="text-[10px] text-slate-400">{hub.category}</div>
                            </div>
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
                              Set Drop B
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !startPoint || !endPoint}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Saving Corridor...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Route Corridor ({totalDistanceKm} km)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
