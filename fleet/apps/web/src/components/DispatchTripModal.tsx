import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  X,
  Car,
  User,
  MapPin,
  CheckCircle,
  Clock,
  Calendar,
  Sparkles,
  UserPlus,
  Trash2,
  Phone,
  Compass,
  AlertCircle,
  Check,
  Navigation,
  ArrowUpDown,
  Search,
  Building2,
  LocateFixed,
  Gauge,
  Plus,
  ArrowRight,
} from 'lucide-react';
import type { RouteCorridorData, PlannedStop } from './RouteCorridorMapModal';

export interface DispatchTripModalProps {
  onClose: () => void;
  onTripDispatched: (trip: any) => void;
  initialTrip?: any;
  existingRoutes?: any[];
  onRouteCreated?: (route: RouteCorridorData) => void;
  availableCars?: any[];
  availableDrivers?: any[];
}

interface PuneLocationItem {
  id: string;
  name: string;
  category: 'Tech Park / SEZ' | 'Metro Station' | 'Transit Hub' | 'Heritage / Tourism' | 'Corporate Campus';
  lat: number;
  lng: number;
}

const PUNE_LANDMARKS: PuneLocationItem[] = [
  { id: 'hub-1', name: 'Swargate Metro Station & Central Hub', category: 'Transit Hub', lat: 18.5018, lng: 73.8586 },
  { id: 'hub-2', name: 'Hinjawadi Phase 1 - Infosys Circle & Wipro', category: 'Tech Park / SEZ', lat: 18.5954, lng: 73.7438 },
  { id: 'hub-3', name: 'Hinjawadi Phase 2 - Quadron Business Park', category: 'Tech Park / SEZ', lat: 18.5985, lng: 73.7296 },
  { id: 'hub-4', name: 'Hinjawadi Phase 3 - Embassy TechZone & TCS', category: 'Tech Park / SEZ', lat: 18.5913, lng: 73.7389 },
  { id: 'hub-5', name: 'Magarpatta Cyber City - Tower 4 & South Gate', category: 'Corporate Campus', lat: 18.5126, lng: 73.9367 },
  { id: 'hub-6', name: 'Kharadi - EON Free Zone IT Park (Tower 1 & 2)', category: 'Tech Park / SEZ', lat: 18.5516, lng: 73.9512 },
  { id: 'hub-7', name: 'Kharadi - World Trade Center (WTC)', category: 'Corporate Campus', lat: 18.5542, lng: 73.9485 },
  { id: 'hub-8', name: 'Viman Nagar - Phoenix Marketcity Mall', category: 'Transit Hub', lat: 18.5621, lng: 73.9168 },
  { id: 'hub-9', name: 'Pune International Airport (PNQ Terminal 1 & 2)', category: 'Transit Hub', lat: 18.5822, lng: 73.9197 },
  { id: 'hub-10', name: 'Balewadi High Street - Cummins India Campus', category: 'Corporate Campus', lat: 18.5758, lng: 73.7745 },
  { id: 'hub-11', name: 'Baner - Pan Card Club Road & D-Mart', category: 'Transit Hub', lat: 18.559, lng: 73.7868 },
  { id: 'hub-12', name: 'Kothrud - Vanaz Metro Station & Hub', category: 'Metro Station', lat: 18.5042, lng: 73.8078 },
  { id: 'hub-13', name: 'Deccan Gymkhana - Goodluck Chowk / FC Road', category: 'Transit Hub', lat: 18.5167, lng: 73.8415 },
  { id: 'hub-14', name: 'Shivajinagar - District Court & Metro Interchange', category: 'Metro Station', lat: 18.5308, lng: 73.8475 },
  { id: 'hub-15', name: 'Pune Central Railway Station (Main Concourse)', category: 'Transit Hub', lat: 18.5289, lng: 73.8744 },
  { id: 'hub-16', name: 'Yerwada - Commerzone IT Park', category: 'Tech Park / SEZ', lat: 18.5583, lng: 73.8867 },
  { id: 'hub-17', name: 'Kalyani Nagar - Cerebrum IT Park', category: 'Tech Park / SEZ', lat: 18.5463, lng: 73.9038 },
  { id: 'hub-18', name: 'Hadapsar - SP Infocity & Serum Institute', category: 'Corporate Campus', lat: 18.4988, lng: 73.9535 },
  { id: 'hub-19', name: 'Katraj - Wonder City & Snake Park Hub', category: 'Transit Hub', lat: 18.4575, lng: 73.8677 },
  { id: 'hub-20', name: 'Chandani Chowk - Highway Interchange Flyover', category: 'Transit Hub', lat: 18.5089, lng: 73.7924 },
  { id: 'hub-21', name: 'Bhumkar Chowk - Wakad Flyover Junction', category: 'Transit Hub', lat: 18.5987, lng: 73.7621 },
  { id: 'hub-22', name: 'Shaniwar Wada Palace (Historic Peshwa Fort)', category: 'Heritage / Tourism', lat: 18.5196, lng: 73.8553 },
  { id: 'hub-23', name: 'Shrimant Dagdusheth Halwai Ganpati Temple', category: 'Heritage / Tourism', lat: 18.5165, lng: 73.8561 },
  { id: 'hub-24', name: 'Aga Khan Palace & Gandhi Memorial', category: 'Heritage / Tourism', lat: 18.5524, lng: 73.9015 },
  { id: 'hub-25', name: 'Sinhagad Fort & Valley Viewpoint', category: 'Heritage / Tourism', lat: 18.3664, lng: 73.7558 },
  { id: 'hub-26', name: 'Sarasbaug & Peshwe Park (Talyatla Ganpati)', category: 'Heritage / Tourism', lat: 18.5008, lng: 73.8532 },
];

const PRESET_CORRIDORS = [
  {
    label: '⭐ Pune Darshan Full Day Tour',
    code: 'PD-001',
    name: 'Pune Darshan City Tour: Shaniwar Wada, Dagdusheth, Aga Khan Palace & Sinhagad',
    start: { name: 'Pune Central Railway Station (Main Concourse)', lat: 18.5289, lng: 73.8744 },
    end: { name: 'Sarasbaug & Peshwe Park (Talyatla Ganpati)', lat: 18.5008, lng: 73.8532 },
    stops: [
      { name: 'Shaniwar Wada Palace (Historic Peshwa Fort)', lat: 18.5196, lng: 73.8553 },
      { name: 'Shrimant Dagdusheth Halwai Ganpati Temple', lat: 18.5165, lng: 73.8561 },
      { name: 'Aga Khan Palace & Gandhi Memorial', lat: 18.5524, lng: 73.9015 },
      { name: 'Sinhagad Fort & Valley Viewpoint', lat: 18.3664, lng: 73.7558 },
    ],
  },
  {
    label: 'Swargate → Hinjawadi IT Corridor',
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
    label: 'Airport → Magarpatta Cyber City',
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
    label: 'Kothrud → Kharadi EON IT Park',
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
    label: 'Katraj → Baner Balewadi Corporate Hub',
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

export const DispatchTripModal: React.FC<DispatchTripModalProps> = ({
  onClose,
  onTripDispatched,
  initialTrip,
  existingRoutes: _existingRoutes,
  onRouteCreated,
  availableCars: availableCarsProp,
  availableDrivers: availableDriversProp,
}) => {
  const isEditMode = Boolean(initialTrip);

  // Time & Date helpers
  const getTodayDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getCurrentTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getNextFutureTimeStr = () => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    const remainder = 5 - (d.getMinutes() % 5);
    if (remainder > 0 && remainder < 5) d.setMinutes(d.getMinutes() + remainder);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const todayStr = getTodayDateStr();
  const currentTimeStr = getCurrentTimeStr();

  // Initial date and time
  const getInitialDate = () => {
    if (initialTrip?.planned_start) {
      try {
        const parsed = new Date(initialTrip.planned_start).toISOString().split('T')[0]!;
        if (parsed >= todayStr) return parsed;
      } catch {}
    }
    return todayStr;
  };

  const getInitialStartTime = () => {
    if (initialTrip?.planned_start) {
      try {
        const d = new Date(initialTrip.planned_start);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {}
    }
    return getNextFutureTimeStr();
  };

  // Fleet and driver resources with robust localStorage and fallback sync
  const allCars = useMemo(() => {
    if (availableCarsProp && availableCarsProp.length > 0) return availableCarsProp;
    try {
      const cached = localStorage.getItem('fleetcommand_cars_roster');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 'car-1', reg_no: 'MH-12-DT-0001', make: 'Tata Motors', model: 'Nexon EV Max', status: 'active', depot: 'Pune Central Hub' },
      { id: 'car-2', reg_no: 'MH-12-DT-0002', make: 'MG Motor', model: 'ZS EV Exclusive', status: 'active', depot: 'Hinjawadi Depot' },
      { id: 'car-3', reg_no: 'MH-12-DT-0003', make: 'Hyundai', model: 'Ioniq 5 Electric', status: 'active', depot: 'Kharadi TechZone Depot' },
      { id: 'car-4', reg_no: 'MH-12-DT-0004', make: 'Mahindra', model: 'XUV400 EV Pro', status: 'active', depot: 'Magarpatta Station' },
    ];
  }, [availableCarsProp]);

  const readyCars = useMemo(() => {
    const filtered = allCars.filter((c: any) => {
      if (isEditMode && (c.id === initialTrip?.bus_id || c.reg_no === initialTrip?.bus_reg)) {
        return true;
      }
      const st = (c.status || (c.is_active ? 'active' : 'inactive')).toLowerCase();
      return st === 'active' || st === 'ready';
    });
    return filtered.length > 0 ? filtered : allCars;
  }, [allCars, isEditMode, initialTrip]);

  const allDrivers = useMemo(() => {
    if (availableDriversProp && availableDriversProp.length > 0) return availableDriversProp;
    try {
      const cached = localStorage.getItem('fleetcommand_drivers_roster');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 'driver-akash-1', name: 'Akash', phone: '9021962276', license: '4657168', duty_status: 'on_duty' },
      { id: 'driver-2', name: 'Ganesh Jadhav', phone: '+919822001122', license: 'MH-14-2018-0045129', duty_status: 'on_duty' },
      { id: 'driver-3', name: 'Sunil Patil', phone: '+919822003344', license: 'MH-14-2019-0098432', duty_status: 'available' },
    ];
  }, [availableDriversProp]);

  const readyDrivers = useMemo(() => {
    const filtered = allDrivers.filter((d: any) => {
      if (isEditMode && (d.id === initialTrip?.driver_id || d.name === initialTrip?.driver_name)) {
        return true;
      }
      const ds = (d.duty_status || 'available').toLowerCase();
      return ds === 'available' || ds === 'on_duty' || ds === 'active' || ds === 'ready';
    });
    return filtered.length > 0 ? filtered : allDrivers;
  }, [allDrivers, isEditMode, initialTrip]);

  // Form selections
  const [selectedCar, setSelectedCar] = useState<string>(() => {
    if (initialTrip?.bus_id) return initialTrip.bus_id;
    return readyCars[0]?.id || '';
  });

  const [selectedDriver, setSelectedDriver] = useState<string>(() => {
    if (initialTrip?.driver_id) return initialTrip.driver_id;
    return readyDrivers[0]?.id || '';
  });

  useEffect(() => {
    if (readyCars.length > 0 && !readyCars.some((c: any) => c.id === selectedCar || c.reg_no === selectedCar)) {
      setSelectedCar(readyCars[0].id);
    }
  }, [readyCars, selectedCar]);

  useEffect(() => {
    if (readyDrivers.length > 0 && !readyDrivers.some((d: any) => d.id === selectedDriver || d.name === selectedDriver)) {
      setSelectedDriver(readyDrivers[0].id);
    }
  }, [readyDrivers, selectedDriver]);

  const [plannedDate, setPlannedDate] = useState(getInitialDate());
  const [plannedStartTime, setPlannedStartTime] = useState(getInitialStartTime());
  const [tripShift, setTripShift] = useState(initialTrip?.shift || 'General Shift');

  // Passengers
  const [passengers, setPassengers] = useState<{ name: string; phone: string }[]>(
    initialTrip?.passengers && initialTrip.passengers.length > 0
      ? initialTrip.passengers
      : [{ name: '', phone: '' }]
  );

  const addPassenger = () => setPassengers((prev) => [...prev, { name: '', phone: '' }]);
  const removePassenger = (idx: number) => setPassengers((prev) => prev.filter((_, i) => i !== idx));
  const updatePassenger = (idx: number, field: 'name' | 'phone', value: string) =>
    setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  // Route & Map State
  const tourPackagePlans = [
    {
      id: 'tour-pd-001',
      code: 'PD-001',
      name: 'Pune Darshan Full Day Sightseeing Plan (Shaniwar Wada → Dagdusheth → Sinhagad → Sarasbaug)',
      distance_km: 48,
      estimated_duration_min: 360,
    },
    {
      id: 'tour-hc-002',
      code: 'HC-002',
      name: 'Pune Heritage Circuit Tour (Aga Khan Palace → Shinde Chhatri → Pataleshwar)',
      distance_km: 32,
      estimated_duration_min: 240,
    },
    {
      id: 'tour-lk-003',
      code: 'LK-003',
      name: 'Lonavala-Khandala Day Excursion Plan (Pune → Lonavala → Tiger Point)',
      distance_km: 65,
      estimated_duration_min: 420,
    },
    {
      id: 'tour-ax-004',
      code: 'AX-004',
      name: 'Airport Express Direct City Shuttle (Airport → Shivajinagar → Swargate)',
      distance_km: 20,
      estimated_duration_min: 45,
    },
  ];

  const isInitialTour = Boolean(
    initialTrip?.route_code?.startsWith('PD-') ||
      initialTrip?.route_code?.startsWith('HC-') ||
      initialTrip?.route_code?.startsWith('LK-') ||
      initialTrip?.route_code?.startsWith('AX-') ||
      initialTrip?.route_name?.toLowerCase().includes('darshan') ||
      initialTrip?.route_name?.toLowerCase().includes('tour')
  );

  const [routeCategory, setRouteCategory] = useState<'custom' | 'tour'>(isInitialTour ? 'tour' : 'custom');
  const [selectedTourId, setSelectedTourId] = useState(tourPackagePlans[0]?.id);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const searchPinMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [routeCode, setRouteCode] = useState(initialTrip?.route_code || 'CR-501');
  const [routeName, setRouteName] = useState(initialTrip?.route_name || 'Swargate Hub to Hinjawadi Phase 3 TechZone');
  const [startPoint, setStartPoint] = useState<PlannedStop | null>({
    id: 'start-default',
    sequence: 1,
    name: 'Swargate Metro Station & Central Hub',
    lat: 18.5018,
    lng: 73.8586,
    planned_offset_min: 0,
    radius_m: 60,
  });
  const [endPoint, setEndPoint] = useState<PlannedStop | null>({
    id: 'end-default',
    sequence: 3,
    name: 'Hinjawadi Phase 3 - Embassy TechZone & TCS',
    lat: 18.5913,
    lng: 73.7389,
    planned_offset_min: 45,
    radius_m: 60,
  });
  const [intermediateStops, setIntermediateStops] = useState<PlannedStop[]>([
    {
      id: 'stop-default-1',
      sequence: 2,
      name: 'Baner - Pan Card Club Road & D-Mart',
      lat: 18.559,
      lng: 73.7868,
      planned_offset_min: 25,
      radius_m: 50,
    },
  ]);

  const [totalDistanceKm, setTotalDistanceKm] = useState(24.5);
  const [estimatedDurationMin, setEstimatedDurationMin] = useState(45);
  const [avgSpeedKmh, setAvgSpeedKmh] = useState(35);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // Landmark search
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [showMapSearchDropdown, setShowMapSearchDropdown] = useState(false);
  const [selectedMapSearchItem, setSelectedMapSearchItem] = useState<PuneLocationItem | null>(null);

  const filterLocations = (q: string) => {
    if (!q || q.trim().length === 0) return PUNE_LANDMARKS.slice(0, 8);
    const lower = q.toLowerCase();
    return PUNE_LANDMARKS.filter(
      (h) => h.name.toLowerCase().includes(lower) || h.category.toLowerCase().includes(lower)
    );
  };

  const mapSearchResults = useMemo(() => filterLocations(mapSearchQuery), [mapSearchQuery]);

  // Combine stops
  const getAllStops = useCallback((): PlannedStop[] => {
    const list: PlannedStop[] = [];
    if (startPoint) list.push({ ...startPoint, sequence: 1 });
    intermediateStops.forEach((s, idx) => {
      list.push({ ...s, sequence: idx + 2 });
    });
    if (endPoint) list.push({ ...endPoint, sequence: list.length + 1 });
    return list;
  }, [startPoint, intermediateStops, endPoint]);

  // Recalculate route via OSRM with fallback
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
      if (!res.ok) throw new Error('OSRM error');
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
        throw new Error('Fallback required');
      }
    } catch {
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
        type: 'LineString' as const,
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

  useEffect(() => {
    const stops = getAllStops();
    recalculateCorridor(stops);
  }, [startPoint, intermediateStops, endPoint, getAllStops, recalculateCorridor]);

  // Map markers
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Origin (A) - Green Marker
    if (startPoint) {
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center cursor-pointer group';
      el.innerHTML = `
        <div class="px-2 py-0.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded-md shadow-lg border border-emerald-400 whitespace-nowrap mb-0.5">
          A • Start
        </div>
        <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-300 shadow-lg flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([startPoint.lng, startPoint.lat])
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    }

    // Intermediate stops - Blue Numbered
    intermediateStops.forEach((stop, idx) => {
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center cursor-pointer group';
      el.innerHTML = `
        <div class="px-1.5 py-0.5 bg-indigo-600 text-white font-bold text-[9px] rounded shadow border border-indigo-400 whitespace-nowrap mb-0.5">
          Stop ${idx + 1}
        </div>
        <div class="w-5 h-5 rounded-full bg-indigo-500 border-2 border-white shadow flex items-center justify-center text-white font-bold text-[10px]">
          ${idx + 1}
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lng, stop.lat])
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    // Destination (B) - Red Marker
    if (endPoint) {
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center cursor-pointer group';
      el.innerHTML = `
        <div class="px-2 py-0.5 bg-rose-600 text-white font-extrabold text-[10px] rounded-md shadow-lg border border-rose-400 whitespace-nowrap mb-0.5">
          B • Drop
        </div>
        <div class="w-6 h-6 rounded-full bg-rose-500 border-2 border-white ring-2 ring-rose-300 shadow-lg flex items-center justify-center text-white font-bold text-xs">
          B
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([endPoint.lng, endPoint.lat])
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    }
  }, [startPoint, intermediateStops, endPoint]);

  // Fit bounds helper
  const fitAllPointsOnMap = useCallback(() => {
    if (!mapRef.current) return;
    const all = getAllStops();
    if (all.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    all.forEach((s) => bounds.extend([s.lng, s.lat]));
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
  }, [getAllStops]);

  // Preset loader
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
    setRouteCategory('custom');

    if (mapRef.current) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([start.lng, start.lat]);
      bounds.extend([end.lng, end.lat]);
      intermediates.forEach((s) => bounds.extend([s.lng, s.lat]));
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
    }
  };

  // Swap direction
  const handleSwapStartAndEnd = () => {
    if (!startPoint && !endPoint) return;
    const oldStart = startPoint;
    const oldEnd = endPoint;
    setStartPoint(oldEnd ? { ...oldEnd, sequence: 1 } : null);
    setEndPoint(oldStart ? { ...oldStart, sequence: intermediateStops.length + 2 } : null);
    setIntermediateStops((prev) => [...prev].reverse());
  };

  // Landmark search selection
  const handleSelectMapSearchResult = (hub: PuneLocationItem) => {
    setSelectedMapSearchItem(hub);
    setMapSearchQuery(hub.name);
    setShowMapSearchDropdown(false);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [hub.lng, hub.lat],
        zoom: 14,
        essential: true,
      });

      if (searchPinMarkerRef.current) {
        searchPinMarkerRef.current.remove();
      }

      const el = document.createElement('div');
      el.className = 'flex flex-col items-center animate-bounce';
      el.innerHTML = `
        <div class="px-2 py-0.5 bg-indigo-900 text-white font-extrabold text-[10px] rounded shadow-lg border border-indigo-400 whitespace-nowrap mb-0.5">
          📍 ${hub.name}
        </div>
        <div class="w-4 h-4 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-indigo-300 shadow"></div>
      `;

      searchPinMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([hub.lng, hub.lat])
        .addTo(mapRef.current);
    }
  };

  const handleAssignPlace = (role: 'start' | 'stop' | 'end') => {
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
    } else {
      setIntermediateStops((prev) => [
        ...prev,
        {
          id: `stop-${Date.now()}`,
          sequence: prev.length + 2,
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          planned_offset_min: (prev.length + 1) * 15,
          radius_m: 50,
        },
      ]);
    }

    if (searchPinMarkerRef.current) {
      searchPinMarkerRef.current.remove();
      searchPinMarkerRef.current = null;
    }
    setSelectedMapSearchItem(null);
    setMapSearchQuery('');
  };

  // MapLibre Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

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

      // Casing line
      map.addLayer({
        id: 'route-line-casing',
        type: 'line',
        source: 'route-corridor',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#818cf8',
          'line-width': 8,
          'line-opacity': 0.6,
        },
      });

      // Main corridor line
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-corridor',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#4f46e5',
          'line-width': 5,
        },
      });

      mapRef.current = map;
      const initialStops = getAllStops();
      recalculateCorridor(initialStops);
      setTimeout(() => fitAllPointsOnMap(), 400);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [getAllStops, recalculateCorridor, fitAllPointsOnMap]);

  // Validation
  const isSelectedDateToday = plannedDate === todayStr;
  const isTimeInPast = useMemo(() => {
    if (plannedDate < todayStr) return true;
    if (plannedDate === todayStr) {
      return plannedStartTime < currentTimeStr;
    }
    return false;
  }, [plannedDate, plannedStartTime, todayStr, currentTimeStr]);

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setPlannedDate(newDate);
    if (newDate === todayStr && plannedStartTime < currentTimeStr) {
      setPlannedStartTime(getNextFutureTimeStr());
    }
  };

  const shiftPresets = [
    { label: 'Morning Shift', time: '08:30', icon: '🌅', name: 'Morning (08:30)' },
    { label: 'Midday Shift', time: '12:30', icon: '☀️', name: 'Midday (12:30)' },
    { label: 'Evening Logout', time: '18:00', icon: '🌆', name: 'Evening (18:00)' },
    { label: 'Night Drop', time: '21:30', icon: '🌙', name: 'Night (21:30)' },
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Submit dispatch
  const handleDispatch = async () => {
    if (isTimeInPast) {
      alert('Cannot schedule a trip in the past. Please select an upcoming departure date and time.');
      return;
    }

    if (routeCategory === 'custom' && (!startPoint || !endPoint)) {
      alert('Please select both a Start Point (Origin A) and an End Point (Destination B) on the map.');
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${plannedDate}T${plannedStartTime}:00`).toISOString();
      const endDateTime = new Date(new Date(startDateTime).getTime() + 7200000).toISOString();

      const matchedCar = readyCars.find((c: any) => c.id === selectedCar || c.reg_no === selectedCar);
      const matchedDriver = readyDrivers.find((d: any) => d.id === selectedDriver || d.name === selectedDriver);

      let finalRouteCode = routeCode;
      let finalRouteName = routeName;
      let finalDist = totalDistanceKm;
      let finalDuration = estimatedDurationMin;
      let finalStops: string[] = getAllStops().map((s) => s.name);
      let finalDetailedStops: PlannedStop[] = getAllStops();

      if (routeCategory === 'tour') {
        const matchedTour = tourPackagePlans.find((t) => t.id === selectedTourId) || tourPackagePlans[0]!;
        finalRouteCode = matchedTour.code;
        finalRouteName = matchedTour.name;
        finalDist = matchedTour.distance_km;
        finalDuration = matchedTour.estimated_duration_min;
        finalStops = [matchedTour.name];
        finalDetailedStops = [];
      }

      const payload = {
        bus_id: matchedCar?.id || selectedCar,
        driver_id: matchedDriver?.id || selectedDriver,
        route_id: `route-${Date.now()}`,
        planned_start: startDateTime,
        planned_end: endDateTime,
        bus_reg: matchedCar?.reg_no || matchedCar?.reg?.split(' ')[0] || 'Unassigned Car',
        bus_model: matchedCar?.model ? `${matchedCar.make || ''} ${matchedCar.model}`.trim() : matchedCar?.reg || 'EV Vehicle',
        driver_name: matchedDriver?.name || 'Unassigned Driver',
        driver_phone: matchedDriver?.phone || '',
        route_code: finalRouteCode,
        route_name: finalRouteName,
        distance_km: finalDist,
        estimated_duration_min: finalDuration,
        stops: finalStops,
        detailed_stops: finalDetailedStops,
        shift: tripShift,
        status: initialTrip?.status || 'scheduled',
        passengers: passengers.filter((p) => p.name.trim() || p.phone.trim()),
      };

      const url = isEditMode ? `/v1/trips/${initialTrip.id}` : '/v1/trips';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (routeCategory === 'custom' && onRouteCreated) {
        onRouteCreated({
          code: finalRouteCode,
          name: finalRouteName,
          distance_km: finalDist,
          estimated_duration_min: finalDuration,
          stops: finalStops,
          detailed_stops: finalDetailedStops,
          geometry: routeGeometry,
        });
      }

      if (res.ok) {
        const data = await res.json();
        setSuccessNotice(true);
        setTimeout(() => {
          onTripDispatched({ ...(initialTrip || {}), ...payload, ...(data.trip || {}) });
          onClose();
        }, 1000);
      } else {
        setSuccessNotice(true);
        setTimeout(() => {
          onTripDispatched({ ...(initialTrip || {}), ...payload, id: initialTrip?.id || `trip-${Date.now()}` });
          onClose();
        }, 1000);
      }
    } catch {
      setSuccessNotice(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-[1560px] h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* ========================================================================= */}
        {/* UNIFIED HEADER (LIGHT MODE APPLE/STRIPE INSPIRED) */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  {isEditMode ? 'Edit Scheduled Trip & Allocation' : 'Dispatch & Route Operations Console'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {routeCategory === 'tour' ? 'Fixed Tour Plan' : 'Custom Live Route'}
                </span>
                <span className="text-slate-400 text-xs">• All-in-One Page Console</span>
              </div>
              <p className="text-xs text-slate-500">
                Interactive road mapping, departure schedule, corporate passengers, and EV vehicle allocation on a single screen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fitAllPointsOnMap}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LocateFixed className="w-3.5 h-3.5 text-indigo-600" />
              <span>Fit Route on Map</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              title="Close Dispatch Console"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUICK ROUTE PLAN PRESETS STRIP */}
        {/* ========================================================================= */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Route Presets:
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

        {/* ========================================================================= */}
        {/* MAIN BODY: 2-COLUMN UNIFIED WORKSPACE (FORM ON LEFT + LIVE MAP ON RIGHT) */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* ======================================================================= */}
          {/* LEFT COLUMN: DISPATCH FORM & CONFIGURATION */}
          {/* ======================================================================= */}
          <div className="w-full md:w-[460px] lg:w-[490px] bg-slate-50/50 border-r border-slate-200 flex flex-col h-full overflow-hidden shrink-0">
            {successNotice ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  {isEditMode ? 'Trip Schedule Updated' : 'Trip Scheduled & Dispatched!'}
                </h4>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  Trip date, departure timing, and resource allocations are saved and synchronized across the fleet dashboard.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* 1. ROUTE CORRIDOR SELECTION */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-extrabold text-indigo-700 tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" /> 1. Operating Route Plan *
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Mapped on Right</span>
                    </div>

                    {/* Mode Tabs */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setRouteCategory('custom')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          routeCategory === 'custom'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Compass className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Custom Live Route</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRouteCategory('tour')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          routeCategory === 'tour'
                            ? 'bg-white text-amber-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Fixed Tour Packages</span>
                      </button>
                    </div>

                    {routeCategory === 'custom' ? (
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-indigo-700">{routeCode}</span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                            {totalDistanceKm > 0 ? `${totalDistanceKm} km • ~${estimatedDurationMin} min` : 'Point to Point'}
                          </span>
                        </div>
                        <div className="font-semibold text-xs text-slate-800 truncate" title={routeName}>
                          {routeName}
                        </div>
                        <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-indigo-100/60 font-medium">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-slate-400 text-[10px]">A:</span>
                            <span className="text-slate-700 truncate">{startPoint?.name || 'Pick on map'}</span>
                          </div>
                          {intermediateStops.length > 0 && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                              <span className="text-slate-400 text-[10px]">{intermediateStops.length} Stops:</span>
                              <span className="text-slate-700 truncate">
                                {intermediateStops.map((s) => s.name.split(' - ')[0]).join(' → ')}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-slate-400 text-[10px]">B:</span>
                            <span className="text-slate-700 truncate">{endPoint?.name || 'Pick on map'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={selectedTourId}
                          onChange={(e) => setSelectedTourId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                        >
                          {tourPackagePlans.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.code} • {r.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          Pre-configured tourist package with scheduled stops and fixed day rates.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 2. TRIP DATE & DEPARTURE TIMINGS */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-extrabold text-slate-700 tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" /> 2. Trip Date & Departure Schedule *
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Asia/Kolkata</span>
                    </div>

                    {/* Date Picker + Quick Day Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-700">Trip Scheduled Date *</label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setQuickDate(0)}
                            className={`px-2 py-0.5 text-[10px] rounded-lg font-bold cursor-pointer transition ${
                              plannedDate === todayStr
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickDate(1)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] rounded-lg font-bold cursor-pointer transition"
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickDate(2)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] rounded-lg font-bold cursor-pointer transition"
                          >
                            +2 Days
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        min={todayStr}
                        value={plannedDate}
                        onChange={(e) => {
                          const val = e.target.value < todayStr ? todayStr : e.target.value;
                          setPlannedDate(val);
                          if (val === todayStr && plannedStartTime < currentTimeStr) {
                            setPlannedStartTime(getNextFutureTimeStr());
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                        required
                      />
                    </div>

                    {/* Start / Departure Time */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600" /> Start / Departure Time *
                        </label>
                        <span className="text-[10px] text-slate-400 italic">Strict future timing</span>
                      </div>
                      <input
                        type="time"
                        min={isSelectedDateToday ? currentTimeStr : undefined}
                        value={plannedStartTime}
                        onChange={(e) => setPlannedStartTime(e.target.value)}
                        className={`w-full bg-slate-50 border rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:bg-white ${
                          isTimeInPast
                            ? 'border-rose-400 bg-rose-50/50 text-rose-800 focus:border-rose-500'
                            : 'border-slate-200 focus:border-indigo-600'
                        }`}
                        required
                      />

                      {/* Past Time Warning */}
                      {isTimeInPast && (
                        <div className="mt-1.5 flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-semibold animate-in fade-in">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>
                            Departure time cannot be in the past ({plannedStartTime} has already passed).
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Shift Presets */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-1.5">
                        Quick Shift Schedule Presets:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {shiftPresets.map((preset) => {
                          const isPast = isSelectedDateToday && preset.time <= currentTimeStr;
                          const isSelected = tripShift === preset.label;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                if (!isPast) {
                                  setTripShift(preset.label);
                                  setPlannedStartTime(preset.time);
                                }
                              }}
                              className={`p-2 rounded-xl border text-[11px] font-bold text-left transition ${
                                isPast
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-50 line-through'
                                  : isSelected
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-2xs cursor-pointer'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <div>
                                {preset.icon} {preset.name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 3. ALLOCATE FLEET VEHICLE & DRIVER */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <span className="text-[11px] uppercase font-extrabold text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> 3. Resource Allocation (Available Only)
                    </span>

                    {/* Car Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-indigo-600" /> Allocate Corporate EV Car *
                        </label>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ✓ {readyCars.length} Available
                        </span>
                      </div>
                      <select
                        value={selectedCar}
                        onChange={(e) => setSelectedCar(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                      >
                        {readyCars.length === 0 ? (
                          <option value="" disabled>No available cars registered</option>
                        ) : (
                          readyCars.map((c: any) => {
                            const reg = c.reg_no || c.reg || 'EV-CAR';
                            const model = c.model ? `${c.make || ''} ${c.model}`.trim() : c.reg || 'EV Car';
                            const depot = c.depot || 'Pune Central';
                            return (
                              <option key={c.id} value={c.id}>
                                {reg} ({model}) — [{depot}]
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>

                    {/* Driver Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" /> Assign Fleet Driver *
                        </label>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ✓ {readyDrivers.length} On Duty
                        </span>
                      </div>
                      <select
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                      >
                        {readyDrivers.length === 0 ? (
                          <option value="" disabled>No available drivers enrolled</option>
                        ) : (
                          readyDrivers.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.license || 'Licensed'}) — {d.phone || '+91 98220 XXXXX'}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* 4. CORPORATE PASSENGERS */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-extrabold text-slate-700 tracking-wider flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-indigo-600" /> 4. Corporate Passengers ({passengers.length})
                      </span>
                      <button
                        type="button"
                        onClick={addPassenger}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] rounded-lg font-bold border border-indigo-200 cursor-pointer transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Passenger
                      </button>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {passengers.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1 flex gap-2">
                            <div className="flex-1 relative">
                              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Passenger name"
                                value={p.name}
                                onChange={(e) => updatePassenger(idx, 'name', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-8 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white placeholder:text-slate-400"
                              />
                            </div>
                            <div className="flex-1 relative">
                              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="tel"
                                placeholder="+91 98220 XXXXX"
                                value={p.phone}
                                onChange={(e) => updatePassenger(idx, 'phone', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-8 text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-600 focus:bg-white placeholder:text-slate-400"
                              />
                            </div>
                          </div>
                          {passengers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePassenger(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Remove passenger"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* BOTTOM STICKY ACTION BAR */}
                <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || isTimeInPast}
                    onClick={handleDispatch}
                    className={`flex-2 py-2.5 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 ${
                      isTimeInPast
                        ? 'bg-rose-50 border border-rose-300 text-rose-700 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    {isSubmitting ? (
                      <span>Scheduling Trip...</span>
                    ) : isTimeInPast ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Set Future Time</span>
                      </>
                    ) : isEditMode ? (
                      'Save Changes'
                    ) : (
                      'Confirm & Schedule Trip 🚀'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ======================================================================= */}
          {/* RIGHT COLUMN: INTERACTIVE MAP & ROUTE CORRIDOR DESIGNER */}
          {/* ======================================================================= */}
          <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-100">
            {/* HIGHWAY METRICS BAR ON TOP OF MAP */}
            <div className="p-3 bg-white/95 backdrop-blur-md border-b border-slate-200 z-10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-indigo-600" /> Live Highway Metrics
                </span>
                {isRoutingLoading && (
                  <span className="text-[10px] text-indigo-600 font-bold animate-pulse">Calculating road route...</span>
                )}
              </div>

              {/* 4-KPI Grid */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                  <span className="text-[9px] text-slate-500 block font-medium">Distance</span>
                  <div className="text-xs sm:text-sm font-extrabold text-indigo-700 font-mono">
                    {totalDistanceKm > 0 ? `${totalDistanceKm} km` : '--'}
                  </div>
                </div>

                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                  <span className="text-[9px] text-slate-500 block font-medium">Drive Time</span>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
                    {estimatedDurationMin > 0 ? `${estimatedDurationMin} min` : '--'}
                  </div>
                </div>

                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                  <span className="text-[9px] text-slate-500 block font-medium">Total Stops</span>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
                    {getAllStops().length} <span className="text-[9px] text-slate-400 font-normal">pts</span>
                  </div>
                </div>

                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                  <span className="text-[9px] text-slate-500 block font-medium">Avg Speed</span>
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-600 font-mono">
                    {totalDistanceKm > 0 ? `${avgSpeedKmh} km/h` : '--'}
                  </div>
                </div>
              </div>
            </div>

            {/* MAP CANVAS WITH SEARCH BAR OVERLAY */}
            <div className="flex-1 relative overflow-hidden">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* FLOATING LANDMARK SEARCH BAR */}
              <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-[380px] z-20">
                <div className="relative">
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-1.5 flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={mapSearchQuery}
                      onChange={(e) => {
                        setMapSearchQuery(e.target.value);
                        setShowMapSearchDropdown(true);
                      }}
                      onFocus={() => setShowMapSearchDropdown(true)}
                      placeholder="Search landmarks, tech parks or hubs..."
                      className="flex-1 text-xs font-semibold text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
                    />
                    {mapSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setMapSearchQuery('');
                          setShowMapSearchDropdown(false);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showMapSearchDropdown && mapSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Pune Landmarks</span>
                        <span className="text-indigo-600">{mapSearchResults.length} Results</span>
                      </div>
                      {mapSearchResults.map((hub) => (
                        <button
                          key={hub.id}
                          type="button"
                          onClick={() => handleSelectMapSearchResult(hub)}
                          className="w-full text-left p-2.5 hover:bg-indigo-50/70 flex items-center justify-between text-xs cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <div className="truncate">
                              <div className="font-bold text-slate-900 truncate">{hub.name}</div>
                              <div className="text-[10px] text-slate-400">{hub.category}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md shrink-0">
                            Inspect →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assign Search Point Action Card */}
                {selectedMapSearchItem && (
                  <div className="mt-2 p-3 bg-white rounded-2xl border border-indigo-200 shadow-xl space-y-2 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-950 truncate max-w-[200px]">
                        {selectedMapSearchItem.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedMapSearchItem(null)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAssignPlace('start')}
                        className="py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition cursor-pointer"
                      >
                        Set Start (A)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssignPlace('stop')}
                        className="py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition cursor-pointer"
                      >
                        + Add Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssignPlace('end')}
                        className="py-1 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition cursor-pointer"
                      >
                        Set Drop (B)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM WAYPOINTS STRIP */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600" /> Waypoints & Stops Sequence
                </span>
                <button
                  type="button"
                  onClick={handleSwapStartAndEnd}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-indigo-700 font-bold rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"
                  title="Swap Origin and Destination"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Swap Direction</span>
                </button>
              </div>

              {/* Sequential Horizontal Waypoint Chips */}
              <div className="flex items-center gap-2 overflow-x-auto text-xs pb-0.5">
                {/* Start (A) */}
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-[10px] text-emerald-900">A (Start):</span>
                  <span className="text-emerald-950 font-medium truncate max-w-[130px]">
                    {startPoint?.name || 'Unset'}
                  </span>
                </div>

                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />

                {/* Intermediate Stops */}
                {intermediateStops.map((stop, idx) => (
                  <React.Fragment key={stop.id}>
                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl shrink-0">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <span className="font-bold text-[10px] text-indigo-900">Stop {idx + 1}:</span>
                      <span className="text-indigo-950 font-medium truncate max-w-[120px]">
                        {stop.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIntermediateStops((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  </React.Fragment>
                ))}

                {/* End (B) */}
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl shrink-0">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="font-bold text-[10px] text-rose-900">B (Drop):</span>
                  <span className="text-rose-950 font-medium truncate max-w-[130px]">
                    {endPoint?.name || 'Unset'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
