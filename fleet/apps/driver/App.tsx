import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Speech from 'expo-speech';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { driverUploader } from './src/services/sqliteQueue';
import {
  startNativeTracking,
  stopNativeTracking,
} from './src/services/nativeLocationTask';
import {
  RouteMap,
  PUNE_RT505_STOPS,
  MapLocationPoint,
} from './src/components/RouteMap';
import { silentUpdateManager, UpdateStatusState } from './src/services/updateService';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 6 : 12;

export interface CorporateRider {
  id: string;
  name: string;
  company: string;
  phone: string;
  pickupPoint: string;
  seat: string;
  status: 'pending' | 'boarded';
}

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function calculateEtaMinutes(distanceKm: number, currentSpeedKmh: number): number {
  const speed = currentSpeedKmh >= 15 ? Math.min(75, currentSpeedKmh) : 28;
  const minutes = Math.round((distanceKm / speed) * 60);
  return Math.max(1, minutes);
}

export const NAVIGATION_STEPS = [
  {
    icon: '↑',
    towards: { mr: 'एनसी केळकर रस्ता / अलका टॉकीज चौक', hi: 'एनसी केलकर रोड / अलका टॉकीज चौक', en: 'NC Kelkar Road / Alka Talkies Chowk' },
    nextChip: { mr: 'Then ↰ एफसी रोड', hi: 'Then ↰ एफसी रोड', en: 'Then ↰ FC Road' },
    dist: '250 m',
    speedLimit: 40,
    voice: {
      mr: 'पुढील 250 मीटरवर अलका टॉकीज चौकातून एफसी रोडकडे वळा',
      hi: 'अगले 250 मीटर पर अलका टॉकीज चौक से एफसी रोड की ओर मुड़ें',
      en: 'In 250 meters, continue towards Fergusson College Road at Alka Talkies',
    },
  },
  {
    icon: '↰',
    towards: { mr: 'फर्ग्युसन कॉलेज रोड (FC Road)', hi: 'फर्ग्यूसन कॉलेज रोड (FC Road)', en: 'Fergusson College Road (FC Rd)' },
    nextChip: { mr: 'Then ↑ संचेती उड्डाणपूल', hi: 'Then ↑ संचेती फ्लाईओवर', en: 'Then ↑ Sancheti Flyover' },
    dist: '1.2 km',
    speedLimit: 50,
    voice: {
      mr: 'फर्ग्युसन कॉलेज रोडवर डावीकडे वळा आणि सरळ जा',
      hi: 'फर्ग्यूसन कॉलेज रोड पर बाएं मुड़ें और सीधे चलें',
      en: 'Turn left onto Fergusson College Road and continue straight',
    },
  },
  {
    icon: '↑',
    towards: { mr: 'संचिती हॉस्पिटल उड्डाणपूल / पुणे विद्यापीठ', hi: 'संचेती अस्पताल फ्लाईओवर / पुणे यूनिवर्सिटी', en: 'Sancheti Flyover / Pune University' },
    nextChip: { mr: 'Then ↰ ब्रेमेन चौक, औंध', hi: 'Then ↰ ब्रेमेन चौक, औंध', en: 'Then ↰ Bremen Chowk' },
    dist: '2.5 km',
    speedLimit: 60,
    voice: {
      mr: 'उड्डाणपुलावरून पुणे विद्यापीठ चौकाच्या दिशेने सरळ जा',
      hi: 'फ्लाईओवर से पुणे यूनिवर्सिटी चौक की ओर सीधे चलें',
      en: 'Continue on the flyover towards Pune University Circle',
    },
  },
  {
    icon: '↰',
    towards: { mr: 'गणेशखिंड रोड / ब्रेमेन चौक, औंध', hi: 'गणेशखिंड रोड / ब्रेमेन चौक, औंध', en: 'Ganeshkhind Road / Bremen Chowk' },
    nextChip: { mr: 'Then ↑ वाकड उड्डाणपूल', hi: 'Then ↑ वाकड़ फ्लाईओवर', en: 'Then ↑ Wakad Flyover' },
    dist: '3.8 km',
    speedLimit: 50,
    voice: {
      mr: 'ब्रेमेन चौकाकडे जाण्यासाठी डावी बाजू धरा',
      hi: 'ब्रेमेन चौक की ओर जाने के लिए बाएं लेन में रहें',
      en: 'Keep left towards Bremen Chowk, Aundh',
    },
  },
  {
    icon: '↑',
    towards: { mr: 'वाकड भुमकर चौक उड्डाणपूल (हायवे)', hi: 'वाकड़ भुमकर चौक फ्लाईओवर (हाईवे)', en: 'Wakad Bhumkar Chowk Flyover' },
    nextChip: { mr: 'Then ↱ हिंजवडी फेज १', hi: 'Then ↱ हिंजवड़ी फेज १', en: 'Then ↱ Hinjewadi Phase 1' },
    dist: '6.2 km',
    speedLimit: 70,
    voice: {
      mr: 'वाकड उड्डाणपुलावरून हिंजवडीच्या दिशेने सरळ जा',
      hi: 'वाकड़ फ्लाईओवर से हिंजवड़ी की ओर सीधे चलें',
      en: 'Drive straight over Wakad Flyover towards Hinjewadi',
    },
  },
  {
    icon: '↱',
    towards: { mr: 'हिंजवडी शिवाजी चौक / टेकझोन मेन रोड', hi: 'हिंजवड़ी शिवाजी चौक / टेकज़ोन मेन रोड', en: 'Hinjewadi Shivaji Chowk / TechZone' },
    nextChip: { mr: 'Then 🏁 मेगापॉलिस फेज ३', hi: 'Then 🏁 मेगापॉलिस फेज ३', en: 'Then 🏁 Megapolis Phase 3' },
    dist: '4.1 km',
    speedLimit: 40,
    voice: {
      mr: 'शिवाजी चौकातून उजवीकडे वळा, मेगापॉलिस ४ किलोमीटर अंतरावर आहे',
      hi: 'शिवाजी चौक से दाएं मुड़ें, मेगापॉलिस ४ किलोमीटर की दूरी पर है',
      en: 'Turn right at Shivaji Chowk towards Megapolis Phase 3',
    },
  },
  {
    icon: '🏁',
    towards: { mr: 'मेगापॉलिस टेक पार्क, फेज ३ (गंतव्य स्थान)', hi: 'मेगापॉलिस टेक पार्क, फेज ३ (गंतव्य)', en: 'Megapolis Tech Park, Phase 3 (Destination)' },
    nextChip: { mr: 'सहल पूर्ण झाली ✓', hi: 'यात्रा समाप्त ✓', en: 'Trip Complete ✓' },
    dist: '50 m',
    speedLimit: 20,
    voice: {
      mr: 'तुम्ही मेगापॉलिस टेक पार्क, फेज ३ येथे पोहोचला आहात!',
      hi: 'आप मेगापॉलिस टेक पार्क, फेज ३ पर पहुंच चुके हैं!',
      en: 'You have arrived at Megapolis Tech Park, Phase 3!',
    },
  },
];

// Corporate Passenger Stops with exact GPS coordinates for Automated Geofence Announcements
export interface StopCoordinate {
  id: string;
  name: string;
  scheduledTime: string;
  delayMinutes: number;
  delayReason?: string;
  riderName: string;
  riderPhone: string;
  lat: number;
  lng: number;
  type: 'pickup' | 'drop';
}

export const ROUTE_STOPS: StopCoordinate[] = [
  { id: 's1', name: 'Narayan Peth Chowk', scheduledTime: '08:30 AM', delayMinutes: 0, delayReason: 'On-Time', riderName: 'Pooja Kulkarni', riderPhone: '+919822114433', lat: 18.51583, lng: 73.85285, type: 'pickup' },
  { id: 's2', name: 'Shivajinagar Station Bay', scheduledTime: '08:45 AM', delayMinutes: 3, delayReason: 'Alka Talkies traffic', riderName: 'Amit Deshmukh', riderPhone: '+919822332211', lat: 18.53140, lng: 73.84460, type: 'pickup' },
  { id: 's3', name: 'Aundh Bremen Chowk', scheduledTime: '09:05 AM', delayMinutes: 2, delayReason: 'University circle signal', riderName: 'Sneha Patil', riderPhone: '+919822556677', lat: 18.56100, lng: 73.80700, type: 'pickup' },
  { id: 's4', name: 'Megapolis Tech Park, Phase 3', scheduledTime: '09:30 AM', delayMinutes: 4, delayReason: 'Highway slowdown', riderName: 'All Passengers', riderPhone: '', lat: 18.57900, lng: 73.70100, type: 'drop' },
];

// Trip History Record
export interface CompletedTripRecord {
  id: string;
  date: string;
  shift: string;
  routeName: string;
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
  passengersCount: number;
  totalPassengers: number;
  passengersList: string[];
  vehicle: string;
  status: 'completed' | 'cancelled';
  rating: string;
  overspeedIncidents: number;
  locationDelayMinutes: number;
}

export const PAST_TRIPS: CompletedTripRecord[] = [
  {
    id: 'TRIP-1092',
    date: 'आज, ०१ नोव्हेंबर २०२६',
    shift: 'सकाळची शिफ्ट (06:30 AM)',
    routeName: 'पुणे स्टेशन ➔ हिंजवडी फेज ३',
    from: 'Pune Railway Station Bay 2',
    to: 'Megapolis Tech Park, Phase 3',
    distanceKm: 26.8,
    durationMin: 39,
    passengersCount: 3,
    totalPassengers: 3,
    passengersList: ['Pooja Kulkarni', 'Amit Deshmukh', 'Sneha Patil'],
    vehicle: 'Tata Nexon EV Max • MH 12 QN 4821',
    status: 'completed',
    rating: '5.0 ★',
    overspeedIncidents: 0,
    locationDelayMinutes: 0,
  },
  {
    id: 'TRIP-1088',
    date: 'काल, ३१ ऑक्टोबर २०२६',
    shift: 'संध्याकाळची शिफ्ट (05:45 PM)',
    routeName: 'हिंजवडी फेज १ ➔ स्वारगेट मेट्रो',
    from: 'Wipro Circle, Phase 1',
    to: 'Swargate Metro Station Gate 2',
    distanceKm: 22.4,
    durationMin: 44,
    passengersCount: 4,
    totalPassengers: 4,
    passengersList: ['Rahul Shinde', 'Neha Joshi', 'Sagar More', 'Kavita Roy'],
    vehicle: 'Tata Nexon EV Max • MH 12 QN 4821',
    status: 'completed',
    rating: '4.9 ★',
    overspeedIncidents: 1,
    locationDelayMinutes: 3,
  },
  {
    id: 'TRIP-1081',
    date: '३० ऑक्टोबर २०२६',
    shift: 'सकाळची शिफ्ट (07:00 AM)',
    routeName: 'कोथरूड ➔ मगरपट्टा सायबरसिटी',
    from: 'Karve Statue, Kothrud',
    to: 'Magarpatta Tower 4, Hadapsar',
    distanceKm: 18.5,
    durationMin: 36,
    passengersCount: 3,
    totalPassengers: 3,
    passengersList: ['Vikram Patil', 'Rohan Mehta', 'Anita Sawant'],
    vehicle: 'Tata Nexon EV Max • MH 12 QN 4821',
    status: 'completed',
    rating: '5.0 ★',
    overspeedIncidents: 0,
    locationDelayMinutes: 0,
  },
  {
    id: 'TRIP-1074',
    date: '२९ ऑक्टोबर २०२६',
    shift: 'दुपारची शिफ्ट (02:15 PM)',
    routeName: 'औंध ब्रेमेन चौक ➔ खराडी EON IT Park',
    from: 'Bremen Chowk, Aundh',
    to: 'EON Free Zone Cluster C, Kharadi',
    distanceKm: 24.1,
    durationMin: 41,
    passengersCount: 2,
    totalPassengers: 2,
    passengersList: ['Mahesh Kadam', 'Priya Dixit'],
    vehicle: 'Tata Nexon EV Max • MH 12 QN 4821',
    status: 'completed',
    rating: '4.8 ★',
    overspeedIncidents: 0,
    locationDelayMinutes: 2,
  },
];

// Fleet Notification & Dispatch Alert
export interface NotificationItem {
  id: string;
  type: 'speed' | 'stop' | 'dispatch' | 'battery' | 'system';
  title: { mr: string; hi: string; en: string };
  message: { mr: string; hi: string; en: string };
  time: string;
  read: boolean;
  priority: 'high' | 'normal' | 'info';
  icon: string;
  color: string;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    type: 'speed',
    title: { mr: '⚠️ अतिवेग इशारा नोंदवला गेला', hi: '⚠️ अधिक गति चेतावनी दर्ज', en: '⚠️ Over-Speed Alert Logged' },
    message: {
      mr: 'गणेशखिंड रोडवर वाहनाचा वेग ६८ किमी/तास नोंदवला (मर्यादा ६० किमी/तास). कृपया सुरक्षित व नियंत्रित वेगाने वाहन चालवा.',
      hi: 'गणेशखिंड रोड पर वाहन गति ६८ किमी/घंटा दर्ज (सीमा ६० किमी/घंटा)। कृपया नियंत्रित गति से चलाएं।',
      en: 'Vehicle speed 68 km/h recorded on Ganeshkhind Rd (Limit 60 km/h). Please maintain safe driving speed.',
    },
    time: '१० मिनिटांपूर्वी',
    read: false,
    priority: 'high',
    icon: '⚡',
    color: '#ef4444',
  },
  {
    id: 'n2',
    type: 'stop',
    title: { mr: '📍 थांबा आगमन: नारायण पेठ चौक', hi: '📍 स्टॉप आगमन: नारायण पेठ चौक', en: '📍 Stop Arrival: Narayan Peth' },
    message: {
      mr: 'तुम्ही नारायण पेठ थांब्यापासून ५०० मीटर अंतरावर आहात. प्रवासी पूजा कुलकर्णी यांच्याशी संपर्क साधा.',
      hi: 'आप नारायण पेठ स्टॉप से ५०० मीटर दूरी पर हैं। यात्री पूजा कुलकर्णी से संपर्क करें।',
      en: 'Approaching Narayan Peth stop (500m). Coordinate pickup with passenger Pooja Kulkarni.',
    },
    time: '२५ मिनिटांपूर्वी',
    read: false,
    priority: 'normal',
    icon: '📍',
    color: '#3b82f6',
  },
  {
    id: 'n3',
    type: 'dispatch',
    title: { mr: '📢 कंट्रोल रूम: ट्रॅफिक अलर्ट', hi: '📢 कंट्रोल रूम: ट्रैफिक अलर्ट', en: '📢 Fleet Dispatch: Traffic Alert' },
    message: {
      mr: 'वाकड उड्डाणपुलाजवळ रस्त्याचे काम सुरू असल्याने जड वाहतूक आहे. हिंजवडीसाठी भुमकर चौक मार्गाचा वापर करावा.',
      hi: 'वाकड़ फ्लाईओवर के पास काम चलने से भारी ट्रैफिक है। हिंजवड़ी के लिए भुमकर चौक मार्ग लें।',
      en: 'Heavy traffic near Wakad Flyover due to roadworks. Drivers advised to route via Bhumkar Chowk.',
    },
    time: '१ तासापूर्वी',
    read: false,
    priority: 'normal',
    icon: '🚧',
    color: '#f59e0b',
  },
  {
    id: 'n4',
    type: 'battery',
    title: { mr: '🔋 EV बॅटरी स्थिती व चार्जिंग सूचना', hi: '🔋 EV बैटरी स्थिति व चार्जिंग सूचना', en: '🔋 EV Battery Status Update' },
    message: {
      mr: 'Tata Nexon EV ची बॅटरी ७८% आहे (रेंज अंदाजे २२० किमी). पुढील शिफ्टपूर्वी Megapolis Hub वर DC फास्ट चार्जर उपलब्ध आहे.',
      hi: 'Tata Nexon EV की बैटरी ७८% है (रेंज लगभग २२० किमी)। अगली शिफ्ट से पहले Megapolis Hub पर DC चार्जर उपलब्ध है।',
      en: 'Tata Nexon EV battery is at 78% (Estimated range 220 km). DC Fast charging available at Megapolis Hub.',
    },
    time: '२ तासांपूर्वी',
    read: true,
    priority: 'info',
    icon: '🔋',
    color: '#10b981',
  },
  {
    id: 'n5',
    type: 'system',
    title: { mr: '🔄 सायलेंट OTA अ‍ॅप अपडेट', hi: '🔄 साइलेंट OTA ऐप अपडेट', en: '🔄 Silent OTA App Update' },
    message: {
      mr: 'Fleet Driver अ‍ॅप व्हर्जन २.४ यशस्वीरीत्या पार्श्वभूमीत अद्ययावत झाले आहे. नवीन नेव्हिगेशन व व्हॉइस सुधारणा समाविष्ट.',
      hi: 'Fleet Driver ऐप वर्शन २.४ सफलतापूर्वक बैकग्राउंड में अपडेट हो चुका है। नई नेविगेशन व वॉयस सुधार शामिल।',
      en: 'Fleet Driver App v2.4 applied successfully in background with enhanced navigation and multilingual voice.',
    },
    time: 'काल, संध्याकाळी ६:००',
    read: true,
    priority: 'info',
    icon: '✨',
    color: '#8b5cf6',
  },
];

export default function App() {
  // Navigation Flow
  const [currentScreen, setCurrentScreen] = useState<'trips_list' | 'trip_details' | 'full_navigation' | 'history' | 'notifications' | 'profile' | 'login' | 'incident' | 'summary' | 'permission_required'>('trips_list');
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);

  // Language: Marathi ('mr') default, Hindi ('hi'), English ('en')
  const [driverLang, setDriverLang] = useState<'mr' | 'hi' | 'en'>('mr');

  // Modern Clean Theme: 'light' (Day Mode - Uber/Google style) or 'dark' (Night Mode)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Voice Assistant Modal
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('');

  // Quick Incident Report Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  // Silent Background Updates State
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusState>(() => silentUpdateManager.getStatus());

  // Server URL
  const [serverUrl, setServerUrl] = useState(() => {
    return driverUploader.getKV('server_url') || 'https://traveltracking.onrender.com';
  });

  // Driver Credentials
  const [driverPhone, setDriverPhone] = useState('9822001122');
  const [driverPin, setDriverPin] = useState('123456');
  const [authToken, setAuthToken] = useState('demo-driver-token');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Driver & Car Profile
  const [driverName, setDriverName] = useState('Ganesh Jadhav');
  const [driverId, setDriverId] = useState('DRV-8841');
  const [vehicleRegNo, setVehicleRegNo] = useState('MH 12 QN 4821');
  const [vehicleModel, setVehicleModel] = useState('Tata Nexon EV Max');
  const [routeName, setRouteName] = useState('Narayan Peth to Hinjewadi IT Park');
  const [tripId, setTripId] = useState('0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10');
  const [isTripActive, setIsTripActive] = useState(false);

  // Pickup & Drop Points (starts at Narayan Peth, Pune)
  const [pickupPoint, setPickupPoint] = useState<MapLocationPoint>({
    name: 'Narayan Peth (Current Location)',
    address: 'Laxmi Rd / Tilak Rd, Narayan Peth, Pune',
    lat: 18.51593,
    lng: 73.85301,
    time: '08:30 AM',
    type: 'pickup',
  });

  const [dropPoint, setDropPoint] = useState<MapLocationPoint>({
    name: 'Megapolis Tech Park, Phase 3',
    address: 'Hinjewadi TechZone, Pune',
    lat: 18.5790,
    lng: 73.7010,
    time: '09:30 AM',
    type: 'drop',
  });

  // Passengers
  const [riders, setRiders] = useState<CorporateRider[]>([
    {
      id: 'r1',
      name: 'Pooja Kulkarni',
      company: 'Infosys Phase 2',
      phone: '+919822114433',
      pickupPoint: 'Narayan Peth Chowk',
      seat: 'Front Passenger',
      status: 'pending',
    },
    {
      id: 'r2',
      name: 'Amit Deshmukh',
      company: 'TCS Sahyadri Park',
      phone: '+919822332211',
      pickupPoint: 'Shivajinagar Station Bay',
      seat: 'Rear Left',
      status: 'pending',
    },
    {
      id: 'r3',
      name: 'Sneha Patil',
      company: 'Wipro Tech Phase 3',
      phone: '+919822556677',
      pickupPoint: 'Aundh Bremen Chowk',
      seat: 'Rear Right',
      status: 'pending',
    },
  ]);

  // Real Hardware GPS Location State (Narayan Peth, Pune)
  const [currentLat, setCurrentLat] = useState<number | null>(18.51593);
  const [currentLng, setCurrentLng] = useState<number | null>(73.85301);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [batteryPct, setBatteryPct] = useState<number>(100);

  // In-Transit Passenger Panel Drawer in Navigation
  const [showInNavRiders, setShowInNavRiders] = useState<boolean>(false);

  // Incident State
  const [incidentKind, setIncidentKind] = useState<string>('puncture');
  const [incidentTransmitted, setIncidentTransmitted] = useState<boolean>(false);

  // Trip Summary State
  const [tripStartTime, setTripStartTime] = useState<Date | null>(null);
  const [tripSummaryStats, setTripSummaryStats] = useState({
    distanceKm: 28.4,
    durationMin: 35,
    boardedCount: 3,
    totalRiders: 3,
  });

  // Google Maps Turn-by-Turn Navigation States (Image 8)
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAlternateRoute, setIsAlternateRoute] = useState<boolean>(false);

  // Over-Speeding & Stop Safety Monitors
  const [isOverSpeeding, setIsOverSpeeding] = useState<boolean>(false);
  const [overspeedIncidentsCount, setOverspeedIncidentsCount] = useState<number>(0);
  const [locationDelayMin, setLocationDelayMin] = useState<number>(0);
  const [approachingStop, setApproachingStop] = useState<StopCoordinate | null>(null);
  const lastOverspeedAlertTimeRef = useRef<number>(0);
  const announcedStopsRef = useRef<Set<string>>(new Set());

  // Trip History & Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'today' | 'week'>('all');
  const [notifFilter, setNotifFilter] = useState<'all' | 'speed' | 'dispatch' | 'battery'>('all');
  const [selectedPastTrip, setSelectedPastTrip] = useState<CompletedTripRecord | null>(null);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // 1-Tap Official Google Maps Native Turn-by-Turn Intent (The Uber/Ola Standard)
  const launchGoogleMapsNavigation = (destLat: number = 18.5790, destLng: number = 73.7010) => {
    const navIntent = `google.navigation:q=${destLat},${destLng}&mode=d`;
    const webFallback = `https://www.google.com/maps/dir/?api=1&origin=${currentLat ?? 18.51583},${currentLng ?? 73.85285}&destination=${destLat},${destLng}&travelmode=driving`;
    Linking.canOpenURL(navIntent)
      .then((canOpen) => {
        if (canOpen) {
          Linking.openURL(navIntent);
        } else {
          Linking.openURL(webFallback);
        }
      })
      .catch(() => Linking.openURL(webFallback));
  };

  const checkOverSpeeding = (speedKmh: number) => {
    const SPEED_LIMIT = 60; // 60 km/h in city
    if (speedKmh > SPEED_LIMIT) {
      setIsOverSpeeding(true);
      const now = Date.now();
      if (now - lastOverspeedAlertTimeRef.current > 15000) {
        lastOverspeedAlertTimeRef.current = now;
        setOverspeedIncidentsCount((c) => c + 1);
        const prompt =
          driverLang === 'mr'
            ? `सावधान! वाहनाचा वेग ${speedKmh} किलोमीटर प्रति तास आहे. कृपया वेग साठच्या खाली कमी करा!`
            : driverLang === 'hi'
              ? `सावधान! गाड़ी की गति ${speedKmh} किलोमीटर प्रति घंटा है। कृपया गति साठ से कम करें!`
              : `Warning! Speed is ${speedKmh} km/h. Please slow down below 60!`;
        speakVoice(prompt);
      }
    } else {
      setIsOverSpeeding(false);
    }
  };

  const checkApproachingStops = (lat: number, lng: number) => {
    for (const stop of ROUTE_STOPS) {
      const isPending =
        stop.type === 'pickup' &&
        riders.some((r) => r.name.toLowerCase().includes(stop.riderName.toLowerCase()) && r.status === 'pending');
      if (isPending || stop.type === 'drop') {
        const distKm = calculateHaversineKm(lat, lng, stop.lat, stop.lng);
        if (distKm <= 0.6 && !announcedStopsRef.current.has(stop.id)) {
          announcedStopsRef.current.add(stop.id);
          setApproachingStop(stop);
          const prompt =
            driverLang === 'mr'
              ? `पुढील थांबा सहाशे मीटरवर: ${stop.name}. ${stop.riderName ? 'प्रवासी ' + stop.riderName + ' यांना पिकअप करा.' : ''}`
              : driverLang === 'hi'
                ? `अगला स्टॉप छह सौ मीटर पर: ${stop.name}। ${stop.riderName ? 'यात्री ' + stop.riderName + ' को पिकअप करें।' : ''}`
                : `Next stop in 600 meters: ${stop.name}. Pick up ${stop.riderName}.`;
          speakVoice(prompt);
          break;
        }
      }
    }
  };

  const nextNavigationStep = () => {
    const nextIdx = (currentStepIdx + 1) % NAVIGATION_STEPS.length;
    setCurrentStepIdx(nextIdx);
    const step = NAVIGATION_STEPS[nextIdx];
    if (!isMuted) {
      speakVoice(step.voice[driverLang]);
    }
  };

  const handleRouteSwapped = (isAlt: boolean) => {
    setIsAlternateRoute(isAlt);
    const prompt = isAlt
      ? (driverLang === 'mr' ? 'पर्यायी मार्ग निवडला: लक्ष्मी रोड, सेनापती बापट रोड मार्गे (+३ मिनिटे)' : driverLang === 'hi' ? 'वैकल्पिक मार्ग चुना गया: लक्ष्मी रोड, सेनापति बापट रोड (+३ मिनट)' : 'Alternate route selected via Laxmi Road (+3 min)')
      : (driverLang === 'mr' ? 'मुख्य मार्ग निवडला: अलका टॉकीज, एफसी रोड मार्गे' : driverLang === 'hi' ? 'मुख्य मार्ग चुना गया: अलका टॉकीज, एफसी रोड' : 'Primary route selected via Alka Talkies');
    speakVoice(prompt);
  };

  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // Multilingual Text & Voice Guidance Dictionary
  const I18N = {
    mr: {
      allTrips: 'सर्व ट्रिप्स',
      tripDetails: 'ट्रिप तपशील',
      pickupPoint: 'पिकअप पॉईंट',
      dropPoint: 'ड्रॉप ठिकाण',
      passengers: 'प्रवासी',
      boarded: 'बोर्ड झाले',
      pending: 'प्रतिक्षेत',
      checkIn: 'चेक इन',
      checkedIn: '✓ बोर्ड झाले',
      call: 'कॉल',
      startTripBtn: 'ट्रिप सुरू करा आणि थेट नेव्हिगेशन ▶',
      lockedTripBtn: 'किमान १ प्रवाशाचे चेक-इन आवश्यक',
      lockedTripSub: 'ट्रिप सुरू करण्यासाठी वरील यादीतून प्रवाशाचे "Check In" करा',
      readyTripSub: 'थेट इन-अॅप गुगल नकाशा व ऑडिओ मार्गदर्शन सुरू होईल',
      needCheckInAlertTitle: 'प्रवासी चेक-इन आवश्यक',
      needCheckInAlertMsg: 'किमान एका प्रवाशाने गाडीत प्रवेश केल्यावर "Check In" बटण दाबा. प्रवाशाशिवाय ट्रिप सुरू करता येणार नाही.',
      needCheckInVoice: 'कृपया गाडी सुरू करण्यापूर्वी प्रवाशाचे चेक-इन करा.',
      turnBannerInstruction: 'पुढील 250 मीटरवर उजवीकडे वळा: हिंजवडी मेन रोड',
      turnBannerSub: 'त्यानंतर 1.4 किमी सरळ जा - मेगापॉलिस फेज ३ कडे',
      inAppNavActive: 'थेट इन-अॅप नेव्हिगेशन सुरू आहे',
      whereAmI: 'मी कुठे आहे?',
      startNav: 'नेव्हिगेशन सुरू करा',
      callPassenger: 'प्रवाशाला कॉल करा',
      readPassengers: 'प्रवासी यादी ऐका',
      reportTraffic: 'ट्रॅफिक जाम कळवा',
      trafficAlertSent: 'ट्रॅफिक जामची माहिती ऑफिसला पाठवली आहे.',
      reportIssue: '🚨 समस्या कळवा',
      endTrip: 'END TRIP ⏹',
      voiceAssistant: 'व्हॉइस असिस्टंट (ऑडिओ मार्गदर्शक)',
      speakOrTap: 'आदेश निवडा किंवा बोला:',
      closeVoice: 'बंद करा',
      tripsTitle: 'आजच्या ट्रिप्स',
      activeShift: 'सक्रिय ड्युटी',
      assignedCar: 'नेमून दिलेली कार',
      driverNameLabel: 'चालक',
      tabHome: 'होम',
      tabHistory: 'इतिहास',
      tabNotifications: 'सूचना',
      tabProfile: 'प्रोफाइल',
      historyTitle: 'ट्रिप इतिहास',
      notificationsTitle: 'सूचना व अलर्ट्स',
      profileTitle: 'चालक प्रोफाइल',
      filterAll: 'सर्व',
      filterToday: 'आज',
      filterWeek: 'या आठवड्यात',
      markAllRead: 'सर्व वाचले ✓',
      noAlerts: 'कोणतीही नवीन सूचना नाही',
      statsTotalTrips: 'एकूण ट्रिप्स',
      statsTotalKm: 'एकूण किमी',
      statsRating: 'रेटिंग',
      statsEfficiency: 'EV सरासरी',
    },
    hi: {
      allTrips: 'सभी ट्रिप्स',
      tripDetails: 'ट्रिप विवरण',
      pickupPoint: 'पिकअप पॉइंट',
      dropPoint: 'ड्रॉप स्थान',
      passengers: 'यात्री',
      boarded: 'सवार हुए',
      pending: 'प्रतीक्षा',
      checkIn: 'चेक इन',
      checkedIn: '✓ सवार हुए',
      call: 'कॉल',
      startTripBtn: 'ट्रिप शुरू करें और लाइव नेविगेशन ▶',
      lockedTripBtn: 'कम से कम १ यात्री का चेक-इन आवश्यक',
      lockedTripSub: 'ट्रिप शुरू करने हेतु ऊपर दी गई सूची से "Check In" करें',
      readyTripSub: 'लाइव इन-ऐप गूगल मैप और ऑडियो गाइड शुरू होगा',
      needCheckInAlertTitle: 'यात्री चेक-इन आवश्यक',
      needCheckInAlertMsg: 'कम से कम एक यात्री के गाड़ी में बैठने के बाद "Check In" बटन दबाएं। यात्री के बिना ट्रिप शुरू नहीं कर सकते।',
      needCheckInVoice: 'कृपया गाड़ी शुरू करने से पहले यात्री का चेक-इन करें।',
      turnBannerInstruction: 'अगले 250 मीटर पर दाएं मुड़ें: हिंजवड़ी मेन रोड',
      turnBannerSub: 'उसके बाद 1.4 किमी सीधे जाएं - मेगापॉलिस फेज ३ की ओर',
      inAppNavActive: 'लाइव इन-ऐप नेविगेशन सक्रिय है',
      whereAmI: 'मैं कहां हूं?',
      startNav: 'नेविगेशन शुरू करें',
      callPassenger: 'यात्री को कॉल करें',
      readPassengers: 'यात्री सूची सुनें',
      reportTraffic: 'ट्रैफिक जाम रिपोर्ट करें',
      trafficAlertSent: 'ट्रैफिक जाम की सूचना ऑफिस को भेज दी गई है।',
      reportIssue: '🚨 समस्या रिपोर्ट करें',
      endTrip: 'END TRIP ⏹',
      voiceAssistant: 'वॉयस असिस्टेंट (ऑडियो गाइड)',
      speakOrTap: 'आदेश चुनें या बोलें:',
      closeVoice: 'बंद करें',
      tripsTitle: 'आज की ट्रिप्स',
      activeShift: 'सक्रिय ड्यूटी',
      assignedCar: 'असाइन की गई कार',
      driverNameLabel: 'चालक',
      tabHome: 'होम',
      tabHistory: 'इतिहास',
      tabNotifications: 'सूचनाएं',
      tabProfile: 'प्रोफ़ाइल',
      historyTitle: 'ट्रिप इतिहास',
      notificationsTitle: 'सूचनाएं एवं अलर्ट्स',
      profileTitle: 'चालक प्रोफ़ाइल',
      filterAll: 'सभी',
      filterToday: 'आज',
      filterWeek: 'इस सप्ताह',
      markAllRead: 'सभी पढ़े गए ✓',
      noAlerts: 'कोई नई सूचना नहीं है',
      statsTotalTrips: 'कुल ट्रिप्स',
      statsTotalKm: 'कुल किमी',
      statsRating: 'रेटिंग',
      statsEfficiency: 'EV औसत',
    },
    en: {
      allTrips: 'All Trips',
      tripDetails: 'Trip Details',
      pickupPoint: 'Pickup Point',
      dropPoint: 'Destination Drop',
      passengers: 'Corporate Passengers',
      boarded: 'Boarded',
      pending: 'Pending',
      checkIn: 'Check In',
      checkedIn: '✓ Boarded',
      call: 'Call',
      startTripBtn: 'START TRIP & IN-APP NAVIGATION ▶',
      lockedTripBtn: 'At least 1 passenger must check in',
      lockedTripSub: 'Tap "Check In" on a passenger above to unlock trip start',
      readyTripSub: 'Starts live in-app Google Maps & audio voice navigation',
      needCheckInAlertTitle: 'Passenger Check-In Required',
      needCheckInAlertMsg: 'At least one passenger must be checked in before starting the trip. Tap "Check In" next to a passenger.',
      needCheckInVoice: 'Please check in at least one passenger before starting the trip.',
      turnBannerInstruction: 'In 250m turn right onto Hinjewadi Main Road',
      turnBannerSub: 'Then continue straight 1.4 km towards Megapolis Phase 3',
      inAppNavActive: 'Live In-App Navigation Active',
      whereAmI: 'Where am I?',
      startNav: 'Start Navigation',
      callPassenger: 'Call Passenger',
      readPassengers: 'Read Passengers',
      reportTraffic: 'Report Heavy Traffic',
      trafficAlertSent: 'Heavy traffic alert transmitted to fleet dispatch.',
      reportIssue: '🚨 Report Issue',
      endTrip: 'END TRIP ⏹',
      voiceAssistant: 'Voice Assistant & Audio Guidance',
      speakOrTap: 'Tap a command or speak:',
      closeVoice: 'Close Voice Assistant',
      tripsTitle: "Today's Trips",
      activeShift: 'Active Duty',
      assignedCar: 'Assigned Vehicle',
      driverNameLabel: 'Driver',
      tabHome: 'Home',
      tabHistory: 'History',
      tabNotifications: 'Alerts',
      tabProfile: 'Profile',
      historyTitle: 'Trip History',
      notificationsTitle: 'Notifications & Alerts',
      profileTitle: 'Driver Profile',
      filterAll: 'All',
      filterToday: 'Today',
      filterWeek: 'This Week',
      markAllRead: 'Mark All Read ✓',
      noAlerts: 'No new notifications',
      statsTotalTrips: 'Total Trips',
      statsTotalKm: 'Total Distance',
      statsRating: 'Rating',
      statsEfficiency: 'EV Efficiency',
    },
  };

  const t = I18N[driverLang];

  // Text-to-Speech Voice Guidance Helper
  const speakVoice = (text: string, overrideLang?: 'mr' | 'hi' | 'en') => {
    if (isMuted) return;
    try {
      Speech.stop();
      const l = overrideLang || driverLang;
      const bcp47 = l === 'mr' ? 'mr-IN' : l === 'hi' ? 'hi-IN' : 'en-IN';
      Speech.speak(text, { language: bcp47, rate: 0.92 });
    } catch { }
  };

  const toggleSoundMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      try { Speech.stop(); } catch {}
      Alert.alert(
        driverLang === 'mr' ? 'आवाज बंद केला' : driverLang === 'hi' ? 'आवाज बंद किया' : 'Sound Muted',
        driverLang === 'mr' ? 'व्हॉइस नेव्हिगेशन म्यूट केले आहे.' : driverLang === 'hi' ? 'वॉयस नेविगेशन म्यूट कर दिया गया है।' : 'Voice guidance is turned off.'
      );
    } else {
      speakVoice(
        driverLang === 'mr' ? 'व्हॉइस नेव्हिगेशन सुरू केले' : driverLang === 'hi' ? 'वॉयस नेविगेशन चालू किया' : 'Voice guidance active'
      );
    }
  };

  // Auto-request GPS Permissions & Start Live Hardware GPS Watch
  const requestEssentialPermissions = async () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus === 'granted') {
          setHasLocationPermission(true);
          try {
            await Location.requestBackgroundPermissionsAsync();
          } catch { }

          // 1. Immediately read cached GPS fix without latency
          try {
            const last = await Location.getLastKnownPositionAsync();
            if (last && last.coords) {
              setCurrentLat(last.coords.latitude);
              setCurrentLng(last.coords.longitude);
            }
          } catch { }

          // 2. Request fresh real-time coordinates
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (loc && loc.coords) {
              setCurrentLat(loc.coords.latitude);
              setCurrentLng(loc.coords.longitude);
              if (loc.coords.speed && loc.coords.speed > 0) {
                setCurrentSpeed(Math.round(loc.coords.speed * 3.6));
              }
            }
          } catch { }

          // 3. Continuously watch position
          locationWatchRef.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 2000,
              distanceInterval: 1,
            },
            (pos) => {
              if (pos && pos.coords) {
                setCurrentLat(pos.coords.latitude);
                setCurrentLng(pos.coords.longitude);
                if (pos.coords.heading && pos.coords.heading >= 0) {
                  setCurrentHeading(Math.round(pos.coords.heading));
                }
                const speedKmh = Math.max(0, Math.round((pos.coords.speed ?? 0) * 3.6));
                setCurrentSpeed(speedKmh);

                // Automated Speed & Geofence Stop Checks
                checkOverSpeeding(speedKmh);
                checkApproachingStops(pos.coords.latitude, pos.coords.longitude);
              }
            }
          );
        } else {
          setHasLocationPermission(false);
          setCurrentScreen('permission_required');
        }
      } catch (err) {
        setHasLocationPermission(false);
      }
    } else {
      setHasLocationPermission(true);
    }
  };

  useEffect(() => {
    requestEssentialPermissions();

    // Subscribe to silent OTA updates
    const unsubscribeUpdates = silentUpdateManager.subscribe(setUpdateStatus);
    silentUpdateManager.checkAndDownloadSilentUpdate({ isTripActive });

    // Periodic check every 15 minutes
    const updateCheckInterval = setInterval(() => {
      silentUpdateManager.checkAndDownloadSilentUpdate({ isTripActive });
    }, 15 * 60 * 1000);

    const timer = setInterval(async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (level >= 0) setBatteryPct(Math.round(level * 100));
      } catch { }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(updateCheckInterval);
      unsubscribeUpdates();
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
    };
  }, [isTripActive]);

  // Distance & ETA Calculations
  const effectiveLat = currentLat ?? pickupPoint.lat;
  const effectiveLng = currentLng ?? pickupPoint.lng;

  const targetPoint = isTripActive ? dropPoint : pickupPoint;
  const distanceRemainingKm = calculateHaversineKm(
    effectiveLat,
    effectiveLng,
    targetPoint.lat,
    targetPoint.lng
  );
  const etaMinutes = calculateEtaMinutes(distanceRemainingKm, currentSpeed);

  // Real distance from driver car to pickup point
  const distanceToPickupKm = calculateHaversineKm(
    effectiveLat,
    effectiveLng,
    pickupPoint.lat,
    pickupPoint.lng
  );
  const etaToPickupMin = calculateEtaMinutes(distanceToPickupKm, currentSpeed);

  // Passenger counts
  const boardedCount = riders.filter((r) => r.status === 'boarded').length;
  const canStartTrip = boardedCount > 0;

  // Phone Call Action
  const callRider = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Phone Call', `Dialing ${phone}`);
    });
  };

  // In-App Navigation Transition (NO EXTERNAL APP)
  const openInAppNavigation = () => {
    setCurrentScreen('full_navigation');
    const prompt =
      driverLang === 'mr'
        ? `इन-अॅप नेव्हिगेशन सुरू केले आहे. अंतर ${distanceRemainingKm} किलोमीटर.`
        : driverLang === 'hi'
          ? `इन-ऐप नेविगेशन शुरू किया गया है। दूरी ${distanceRemainingKm} किलोमीटर.`
          : `In-app navigation active. Distance remaining is ${distanceRemainingKm} kilometers.`;
    speakVoice(prompt);
  };

  // Multilingual Voice Command Executor
  const handleVoiceCommand = (cmd: string) => {
    if (cmd === 'where') {
      const msg =
        driverLang === 'mr'
          ? `तुम्ही पुणे कॉरिडॉरवर आहात. ${targetPoint.name.split(',')[0]} साठी ${distanceRemainingKm} किलोमीटर शिल्लक आहेत. गाडीचा वेग ${currentSpeed} किमी प्रति तास आहे.`
          : driverLang === 'hi'
            ? `आप पुणे कॉरिडोर पर हैं। ${targetPoint.name.split(',')[0]} की दूरी ${distanceRemainingKm} किलोमीटर है। गति ${currentSpeed} किमी प्रति घंटा है।`
            : `You are on the Pune corridor. ${distanceRemainingKm} kilometers remaining to ${targetPoint.name.split(',')[0]}. Speed is ${currentSpeed} km/h.`;
      setVoiceStatusText(msg);
      speakVoice(msg);
    } else if (cmd === 'navigate') {
      setShowVoiceModal(false);
      openInAppNavigation();
    } else if (cmd === 'call') {
      const nextRider = riders.find((r) => r.status === 'pending') || riders[0];
      if (nextRider) {
        setShowVoiceModal(false);
        const callPrompt =
          driverLang === 'mr'
            ? `${nextRider.name} यांना फोन लावला जात आहे.`
            : driverLang === 'hi'
              ? `${nextRider.name} को कॉल किया जा रहा है।`
              : `Calling passenger ${nextRider.name}.`;
        speakVoice(callPrompt);
        callRider(nextRider.phone);
      }
    } else if (cmd === 'riders') {
      const msg =
        driverLang === 'mr'
          ? `${boardedCount} पैकी ${riders.length} प्रवासी गाडीत बसले आहेत.`
          : driverLang === 'hi'
            ? `${boardedCount} में से ${riders.length} यात्री सवार हो चुके हैं।`
            : `${boardedCount} of ${riders.length} passengers boarded.`;
      setVoiceStatusText(msg);
      speakVoice(msg);
    } else if (cmd === 'traffic') {
      setIncidentKind('traffic');
      transmitIncident();
      setShowVoiceModal(false);
      speakVoice(t.trafficAlertSent);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${serverUrl}/v1/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: driverPhone, pin: driverPin }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.token || 'demo-token');
        if (data.driver) {
          setDriverName(data.driver.name || driverName);
          setDriverId(data.driver.id || driverId);
          setVehicleRegNo(data.driver.vehicleRegNo || vehicleRegNo);
          setVehicleModel(data.driver.vehicleModel || vehicleModel);
        }
      }
    } catch { }
    setIsLoggingIn(false);
    requestEssentialPermissions();
    setCurrentScreen('trips_list');
    const welcome =
      driverLang === 'mr'
        ? `स्वागत आहे, ${driverName}. ड्युटी सुरू झाली आहे.`
        : driverLang === 'hi'
          ? `स्वागत है, ${driverName}. ड्यूटी शुरू हो गई है।`
          : `Welcome back, ${driverName}. Shift online.`;
    speakVoice(welcome);
  };

  const toggleRiderStatus = (id: string) => {
    setRiders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextStatus = r.status === 'boarded' ? 'pending' : 'boarded';
          if (nextStatus === 'boarded') {
            const boardedPrompt =
              driverLang === 'mr'
                ? `${r.name} गाडीत बसले आहेत.`
                : driverLang === 'hi'
                  ? `${r.name} सवार हो गए हैं।`
                  : `${r.name} marked as boarded.`;
            speakVoice(boardedPrompt);
          }
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  // START TRIP ACTION WITH MANDATORY CHECK-IN ENFORCEMENT
  const handleStartTrip = async () => {
    if (!canStartTrip) {
      speakVoice(t.needCheckInVoice);
      Alert.alert(t.needCheckInAlertTitle, t.needCheckInAlertMsg, [{ text: 'OK' }]);
      return;
    }

    setIsTripActive(true);
    setTripStartTime(new Date());
    setCurrentScreen('full_navigation');

    const startMsg =
      driverLang === 'mr'
        ? `ट्रिप सुरू झाली आहे. ${dropPoint.name.split(',')[0]} कडे थेट नेव्हिगेशन सुरू आहे. सुरक्षित गाडी चालवा.`
        : driverLang === 'hi'
          ? `ट्रिप शुरू हो गई है। ${dropPoint.name.split(',')[0]} की ओर इन-ऐप नेविगेशन जारी है। सुरक्षित गाड़ी चलाएं।`
          : `Trip started. In-app navigation active towards ${dropPoint.name.split(',')[0]}. Drive safely.`;

    speakVoice(startMsg);

    try {
      await activateKeepAwakeAsync();
    } catch { }

    try {
      await fetch(`${serverUrl}/v1/driver/trips/${tripId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          startedAt: new Date().toISOString(),
          vehicleRegNo,
          startLat: currentLat,
          startLng: currentLng,
        }),
      });
    } catch { }

    try {
      await startNativeTracking(tripId, serverUrl, authToken);
    } catch { }
  };

  const endTrip = async () => {
    Alert.alert(
      driverLang === 'mr' ? 'ट्रिप पूर्ण करायची?' : driverLang === 'hi' ? 'ट्रिप समाप्त करें?' : 'End Trip Confirmation',
      driverLang === 'mr'
        ? `सर्व प्रवासी सुरक्षितपणे ${dropPoint.name.split(',')[0]} येथे पोहोचले आहेत का?`
        : driverLang === 'hi'
          ? `क्या सभी यात्री सुरक्षित ${dropPoint.name.split(',')[0]} पहुंच गए हैं?`
          : 'Have all passengers safely arrived at the destination?',
      [
        { text: driverLang === 'mr' ? 'रद्द करा' : driverLang === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: driverLang === 'mr' ? 'हो, ट्रिप पूर्ण करा' : driverLang === 'hi' ? 'हाँ, ट्रिप समाप्त करें' : 'Confirm & End',
          style: 'destructive',
          onPress: async () => {
            const endTime = new Date();
            const durationMin = tripStartTime
              ? Math.max(1, Math.round((endTime.getTime() - tripStartTime.getTime()) / 60000))
              : 35;

            setTripSummaryStats({
              distanceKm: 28.4,
              durationMin,
              boardedCount: riders.filter((r) => r.status === 'boarded').length,
              totalRiders: riders.length,
            });

            setIsTripActive(false);

            const completePrompt =
              driverLang === 'mr'
                ? 'ट्रिप यशस्वीरित्या पूर्ण झाली. सर्व प्रवासी सुरक्षित सोडले.'
                : driverLang === 'hi'
                  ? 'ट्रिप सफलतापूर्वक समाप्त हुई। सभी यात्री सुरक्षित पहुंच गए।'
                  : 'Trip completed. All passengers safely dropped.';
            speakVoice(completePrompt);

            try {
              await fetch(`${serverUrl}/v1/driver/trips/${tripId}/end`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                  endedAt: endTime.toISOString(),
                  endLat: currentLat,
                  endLng: currentLng,
                }),
              });
            } catch { }

            try {
              await stopNativeTracking();
            } catch { }

            try {
              await deactivateKeepAwake();
            } catch { }

            setCurrentScreen('summary');
          },
        },
      ]
    );
  };

  const transmitIncident = async (overrideKind?: any) => {
    try {
      const kind = typeof overrideKind === 'string' ? overrideKind : incidentKind;
      await fetch(`${serverUrl}/v1/driver/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tripId,
          type: kind,
          lat: currentLat,
          lng: currentLng,
          reportedAt: new Date().toISOString(),
        }),
      });
      setIncidentTransmitted(true);
      setTimeout(() => setIncidentTransmitted(false), 4000);
    } catch { }
  };

  const isLight = themeMode === 'light';

  // Language Bar Component (1-Tap Switcher)
  const renderLanguageSwitcher = () => (
    <View style={styles.langPillContainer}>
      <TouchableOpacity
        style={[styles.langPill, driverLang === 'mr' && styles.langPillActive]}
        onPress={() => {
          setDriverLang('mr');
          speakVoice('मराठी भाषा निवडली आहे.', 'mr');
        }}
      >
        <Text style={[styles.langPillText, driverLang === 'mr' && styles.langPillTextActive]}>मराठी</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.langPill, driverLang === 'hi' && styles.langPillActive]}
        onPress={() => {
          setDriverLang('hi');
          speakVoice('हिंदी भाषा चुनी गई है।', 'hi');
        }}
      >
        <Text style={[styles.langPillText, driverLang === 'hi' && styles.langPillTextActive]}>हिंदी</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.langPill, driverLang === 'en' && styles.langPillActive]}
        onPress={() => {
          setDriverLang('en');
          speakVoice('English selected.', 'en');
        }}
      >
        <Text style={[styles.langPillText, driverLang === 'en' && styles.langPillTextActive]}>EN</Text>
      </TouchableOpacity>
    </View>
  );

  // Global Voice Command Assistant Modal
  const renderVoiceModal = () => (
    <Modal visible={showVoiceModal} transparent={true} animationType="slide" onRequestClose={() => setShowVoiceModal(false)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.voiceModalBox, !isLight && styles.voiceModalBoxDark]}>
          <View style={styles.voiceModalHeader}>
            <View style={styles.voiceMicCircleLarge}>
              <Text style={{ fontSize: 28 }}>🎤</Text>
            </View>
            <Text style={[styles.voiceModalTitle, !isLight && styles.textWhite]}>{t.voiceAssistant}</Text>
            {renderLanguageSwitcher()}
            {voiceStatusText ? (
              <Text style={styles.voiceModalSub}>{voiceStatusText}</Text>
            ) : (
              <Text style={styles.voiceModalSub}>{t.speakOrTap}</Text>
            )}
          </View>

          <View style={styles.voiceCommandsGrid}>
            <TouchableOpacity style={styles.voiceCmdBtn} onPress={() => handleVoiceCommand('where')}>
              <Text style={styles.voiceCmdEmoji}>📍</Text>
              <Text style={styles.voiceCmdLabel}>"{t.whereAmI}"</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.voiceCmdBtn} onPress={() => handleVoiceCommand('navigate')}>
              <Text style={styles.voiceCmdEmoji}>🧭</Text>
              <Text style={styles.voiceCmdLabel}>"{t.startNav}"</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.voiceCmdBtn} onPress={() => handleVoiceCommand('call')}>
              <Text style={styles.voiceCmdEmoji}>📞</Text>
              <Text style={styles.voiceCmdLabel}>"{t.callPassenger}"</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.voiceCmdBtn} onPress={() => handleVoiceCommand('riders')}>
              <Text style={styles.voiceCmdEmoji}>👥</Text>
              <Text style={styles.voiceCmdLabel}>"{t.readPassengers}"</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.voiceCmdBtn} onPress={() => handleVoiceCommand('traffic')}>
              <Text style={styles.voiceCmdEmoji}>🚧</Text>
              <Text style={styles.voiceCmdLabel}>"{t.reportTraffic}"</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.voiceCmdBtn}
              onPress={() => {
                setShowVoiceModal(false);
                silentUpdateManager.checkAndDownloadSilentUpdate({ isTripActive, manual: true });
              }}
            >
              <Text style={styles.voiceCmdEmoji}>🔄</Text>
              <Text style={styles.voiceCmdLabel}>
                {driverLang === 'mr' ? '"अपडेट तपासा"' : driverLang === 'hi' ? '"अपडेट जांचें"' : '"Check Updates"'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.voiceModalCloseBtn} onPress={() => setShowVoiceModal(false)}>
            <Text style={styles.voiceModalCloseText}>{t.closeVoice}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Global Instant Incident Reporting Action Modal
  const renderIncidentModal = () => (
    <Modal visible={showIncidentModal} transparent={true} animationType="slide" onRequestClose={() => setShowIncidentModal(false)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.voiceModalBox, !isLight && styles.voiceModalBoxDark]}>
          <View style={styles.voiceModalHeader}>
            <View style={[styles.voiceMicCircleLarge, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
              <Text style={{ fontSize: 28 }}>🚨</Text>
            </View>
            <Text style={[styles.voiceModalTitle, !isLight && styles.textWhite]}>
              {driverLang === 'mr' ? 'समस्या / अडचण कळवा' : driverLang === 'hi' ? 'समस्या रिपोर्ट करें' : 'Report Issue to Dispatch'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {driverLang === 'mr' ? 'कंट्रोल रूमला तात्काळ अलर्ट पाठवण्यासाठी खालील प्रकार निवडा:' : driverLang === 'hi' ? 'कंट्रोल रूम को तुरंत अलर्ट भेजने के लिए प्रकार चुनें:' : 'Select issue to broadcast to fleet dispatch:'}
            </Text>
          </View>

          <View style={styles.voiceCommandsGrid}>
            {[
              { id: 'traffic', label: driverLang === 'mr' ? 'ट्रॅफिक जाम' : driverLang === 'hi' ? 'ट्रैफिक जाम' : 'Heavy Traffic', icon: '🚧', voice: driverLang === 'mr' ? 'ट्रॅफिक जाम अलर्ट कंट्रोल रूमला पाठवला आहे.' : driverLang === 'hi' ? 'ट्रैफिक जाम की सूचना कंट्रोल रूम को भेज दी गई है।' : 'Traffic alert sent to dispatch.' },
              { id: 'puncture', label: driverLang === 'mr' ? 'टायर पंक्चर' : driverLang === 'hi' ? 'टायर पंक्चर' : 'Flat Tyre', icon: '🛞', voice: driverLang === 'mr' ? 'टायर पंक्चर अलर्ट पाठवला आहे.' : driverLang === 'hi' ? 'टायर पंक्चर की सूचना कंट्रोल रूम को भेज दी गई है।' : 'Flat tyre alert sent to dispatch.' },
              { id: 'mechanical', label: driverLang === 'mr' ? 'गाडी बिघाड / EV' : driverLang === 'hi' ? 'गाड़ी खराबी / EV' : 'Breakdown', icon: '⚡', voice: driverLang === 'mr' ? 'गाडी बिघाड अलर्ट कंट्रोल रूमला पाठवला आहे.' : driverLang === 'hi' ? 'गाड़ी खराबी की सूचना कंट्रोल रूम को भेज दी गई है।' : 'Breakdown alert sent to dispatch.' },
              { id: 'emergency', label: driverLang === 'mr' ? 'आपत्कालीन SOS' : driverLang === 'hi' ? 'आपातकालीन SOS' : 'Emergency SOS', icon: '🚨', voice: driverLang === 'mr' ? 'आपत्कालीन SOS अलर्ट पाठवला आहे!' : driverLang === 'hi' ? 'आपातकालीन SOS अलर्ट भेज दिया गया है!' : 'Emergency SOS alert transmitted!' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.voiceCmdBtn, { borderColor: '#fca5a5', backgroundColor: isLight ? '#fef2f2' : '#1f1315' }]}
                onPress={() => {
                  setIncidentKind(item.id);
                  transmitIncident(item.id);
                  setShowIncidentModal(false);
                  speakVoice(item.voice);
                  Alert.alert(
                    driverLang === 'mr' ? 'अलर्ट पाठवला ✓' : driverLang === 'hi' ? 'अलर्ट भेजा गया ✓' : 'Alert Transmitted ✓',
                    driverLang === 'mr' ? `${item.label} ची माहिती कंट्रोल रूमला यशस्वीरित्या पाठवली आहे.` : driverLang === 'hi' ? `${item.label} की सूचना कंट्रोल रूम को भेज दी गई है।` : `${item.label} reported to fleet dispatch.`
                  );
                }}
              >
                <Text style={styles.voiceCmdEmoji}>{item.icon}</Text>
                <Text style={[styles.voiceCmdLabel, { color: '#dc2626' }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.voiceModalCloseBtn} onPress={() => setShowIncidentModal(false)}>
            <Text style={styles.voiceModalCloseText}>{t.closeVoice}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Persistent Commercial Bottom Tab Bar (Home, History, Alerts, Profile)
  const renderBottomTabBar = () => {
    const tabs: Array<{ id: 'trips_list' | 'history' | 'notifications' | 'profile'; label: string; icon: string; badge?: number }> = [
      { id: 'trips_list', label: t.tabHome || 'Home', icon: '🏠' },
      { id: 'history', label: t.tabHistory || 'History', icon: '📜' },
      { id: 'notifications', label: t.tabNotifications || 'Alerts', icon: '🔔', badge: unreadNotifCount > 0 ? unreadNotifCount : undefined },
      { id: 'profile', label: t.tabProfile || 'Profile', icon: '👤' },
    ];

    return (
      <View style={[styles.bottomTabBar, !isLight && styles.bottomTabBarDark]}>
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.bottomTabItem}
              onPress={() => setCurrentScreen(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.bottomTabIconBox}>
                <Text style={[styles.bottomTabIcon, isActive && styles.bottomTabIconActive]}>{tab.icon}</Text>
                {!!tab.badge && (
                  <View style={styles.bottomTabBadge}>
                    <Text style={styles.bottomTabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.bottomTabLabel, isActive ? styles.bottomTabLabelActive : (!isLight ? styles.textMutedDark : styles.textMutedLight)]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.bottomTabActiveIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // =========================================================================
  // SCREEN 1: TODAY'S TRIPS LIST
  // =========================================================================
  if (currentScreen === 'trips_list') {
    return (
      <SafeAreaView style={[styles.container, !isLight && styles.containerDark, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={isLight ? '#ffffff' : '#0f172a'} />

        {/* Top Header - Zero Overflow Multi-row Header */}
        <View style={[styles.headerBar, !isLight && styles.headerBarDark]}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.headerCompanyBadge}>FLEETCOMMAND COMMERCIAL CARS</Text>
              <Text style={[styles.headerDriverName, !isLight && styles.textWhite]}>{driverName}</Text>
              <Text style={styles.headerCarPlate}>🚗 {vehicleRegNo} • {vehicleModel}</Text>
            </View>

            <View style={styles.headerTopActions}>
              <TouchableOpacity
                onPress={() => setThemeMode(isLight ? 'dark' : 'light')}
                style={[styles.themeToggleBtn, !isLight && styles.themeToggleBtnDark]}
              >
                <Text style={styles.themeToggleText}>{isLight ? '🌙' : '☀️'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowVoiceModal(true)} style={styles.voiceHeaderBtn}>
                <Text style={styles.voiceHeaderBtnText}>🎤 Voice</Text>
              </TouchableOpacity>

              {/* Profile Circle Avatar with Online Dot */}
              <TouchableOpacity
                style={styles.headerProfileCircle}
                onPress={() => setCurrentScreen('profile')}
                activeOpacity={0.8}
              >
                <Text style={styles.headerProfileInitials}>GJ</Text>
                <View style={styles.headerProfileOnlineDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sub Header Row: Language Switcher & Duty Badge */}
          <View style={styles.headerSubRow}>
            {renderLanguageSwitcher()}
            <View style={styles.liveDutyBadge}>
              <View style={styles.greenPulse} />
              <Text style={styles.liveDutyText}>{t.activeShift}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Silent OTA Update Banner (Ready to Apply) */}
          {updateStatus.isUpdateReadyToApply && (
            <TouchableOpacity
              style={styles.otaUpdateBanner}
              onPress={() => silentUpdateManager.applyUpdate()}
              activeOpacity={0.85}
            >
              <View style={styles.otaUpdatePulse} />
              <View style={{ flex: 1 }}>
                <Text style={styles.otaUpdateTitle}>
                  🔄 {driverLang === 'mr' ? 'नवीन अद्यतन तयार आहे' : driverLang === 'hi' ? 'नया अपडेट तैयार है' : 'New Update Ready'}
                </Text>
                <Text style={styles.otaUpdateSub}>
                  {driverLang === 'mr' ? 'लागू करण्यासाठी येथे टॅप करा' : driverLang === 'hi' ? 'लागू करने के लिए यहां टैप करें' : 'Tap to restart and apply new features'}
                </Text>
              </View>
              <Text style={styles.otaUpdateActionBtn}>RESTART ➔</Text>
            </TouchableOpacity>
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, !isLight && styles.textWhite]}>{t.tripsTitle}</Text>
            <Text style={styles.sectionSubHeading}>
              {driverLang === 'mr' ? 'आजचे वेळापत्रक व सुरक्षितता ट्रॅकिंग' : driverLang === 'hi' ? 'आज का शेड्यूल और सुरक्षा ट्रैकिंग' : "Today's Schedule & Compliance"}
            </Text>
          </View>

          {/* TRIP CARD 1: ACTIVE MORNING TRIP WITH OVER-SPEED & DELAY AT LOCATION */}
          <TouchableOpacity
            style={[styles.tripListCard, !isLight && styles.tripListCardDark]}
            activeOpacity={0.88}
            onPress={() => setCurrentScreen('trip_details')}
          >
            {/* Header: Shift Badge + Time + On-Time / Delay Chip */}
            <View style={styles.tripCardTopRow}>
              <View style={styles.shiftBadge}>
                <Text style={styles.shiftBadgeText}>MORNING SHIFT</Text>
              </View>
              <Text style={styles.tripTimeText}>08:30 AM – 09:30 AM</Text>
              <View style={[styles.tripPunctualityPill, locationDelayMin > 0 ? styles.tripPunctualityPillDelayed : styles.tripPunctualityPillOnTime]}>
                <Text style={[styles.tripPunctualityText, locationDelayMin > 0 ? styles.tripPunctualityTextDelayed : styles.tripPunctualityTextOnTime]}>
                  {locationDelayMin > 0 ? `⏱️ +${locationDelayMin}m Delay` : '🟢 On-Time (+0m)'}
                </Text>
              </View>
            </View>

            {/* Main Route Title */}
            <Text style={[styles.tripMainRoute, !isLight && styles.textWhite]}>
              Narayan Peth ➔ Hinjewadi IT Park (Phase 3)
            </Text>
            <Text style={styles.tripSubRouteLabel}>
              Corporate Route RT-505 • Pune Tech Corridor
            </Text>

            {/* 4-BENTO METRIC GRID: DISTANCE, RIDERS, OVER-SPEED, LOCATION DELAY */}
            <View style={styles.tripBentoGrid}>
              {/* Metric 1: Distance */}
              <View style={[styles.tripBentoCell, !isLight && styles.tripBentoCellDark]}>
                <Text style={styles.tripBentoLabel}>Distance</Text>
                <Text style={[styles.tripBentoVal, !isLight && styles.textWhite]}>25.6 km</Text>
              </View>

              {/* Metric 2: Passengers */}
              <View style={[styles.tripBentoCell, !isLight && styles.tripBentoCellDark]}>
                <Text style={styles.tripBentoLabel}>{t.passengers}</Text>
                <Text style={[styles.tripBentoVal, !isLight && styles.textWhite]}>
                  {boardedCount}/{riders.length} {t.boarded}
                </Text>
              </View>

              {/* Metric 3: Speed Compliance / Over-speed */}
              <View style={[styles.tripBentoCell, !isLight && styles.tripBentoCellDark]}>
                <Text style={styles.tripBentoLabel}>Speed Limit</Text>
                <Text style={[styles.tripBentoVal, overspeedIncidentsCount > 0 ? { color: '#ef4444' } : { color: '#059669' }]}>
                  {overspeedIncidentsCount > 0 ? `⚠️ ${overspeedIncidentsCount} Over-spd` : '🛡️ 0 Over-spd'}
                </Text>
              </View>

              {/* Metric 4: Delay at Location */}
              <View style={[styles.tripBentoCell, !isLight && styles.tripBentoCellDark]}>
                <Text style={styles.tripBentoLabel}>Location Delay</Text>
                <Text style={[styles.tripBentoVal, locationDelayMin > 0 ? { color: '#f59e0b' } : { color: '#059669' }]}>
                  {locationDelayMin > 0 ? `⏱️ +${locationDelayMin} min` : '🟢 On Schedule'}
                </Text>
              </View>
            </View>

            {/* STOPS & LOCATION DELAY TIMELINE PREVIEW */}
            <View style={[styles.tripTimelineBox, !isLight && styles.tripTimelineBoxDark]}>
              <Text style={[styles.tripTimelineHeader, !isLight && styles.textWhite]}>📍 Scheduled Stops & Live Delay</Text>
              <View style={styles.tripTimelineRow}>
                <View style={styles.timelineDotGreen} />
                <View style={{ flex: 1, paddingHorizontal: 6 }}>
                  <Text style={[styles.timelineStopTitle, !isLight && styles.textWhite]}>Narayan Peth Chowk (08:30 AM)</Text>
                  <Text style={styles.timelineStopSub}>Pooja Kulkarni • 🟢 0 min delay (On-Time)</Text>
                </View>
              </View>
              <View style={styles.tripTimelineConnector} />
              <View style={styles.tripTimelineRow}>
                <View style={styles.timelineDotYellow} />
                <View style={{ flex: 1, paddingHorizontal: 6 }}>
                  <Text style={[styles.timelineStopTitle, !isLight && styles.textWhite]}>Shivajinagar Station Bay (08:45 AM)</Text>
                  <Text style={styles.timelineStopSub}>Amit Deshmukh • ⏱️ +3 min traffic delay at Alka Talkies</Text>
                </View>
              </View>
              <View style={styles.tripTimelineConnector} />
              <View style={styles.tripTimelineRow}>
                <View style={styles.timelineDotRed} />
                <View style={{ flex: 1, paddingHorizontal: 6 }}>
                  <Text style={[styles.timelineStopTitle, !isLight && styles.textWhite]}>Megapolis Phase 3 (09:30 AM)</Text>
                  <Text style={styles.timelineStopSub}>Destination Drop • 🏁 ETA 09:34 AM (+4m highway)</Text>
                </View>
              </View>
            </View>

            <View style={styles.tripCardActionBtn}>
              <Text style={styles.tripCardActionBtnText}>
                {isTripActive ? 'RESUME IN-APP NAVIGATION ➔' : 'VIEW TRIP DETAILS & CHECK-IN ➔'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* TRIP CARD 2: UPCOMING EVENING TRIP */}
          <View style={[styles.tripListCard, styles.tripCardUpcoming, !isLight && styles.tripListCardDark]}>
            <View style={styles.tripCardTopRow}>
              <View style={[styles.shiftBadge, { backgroundColor: '#64748b' }]}>
                <Text style={styles.shiftBadgeText}>EVENING RETURN</Text>
              </View>
              <Text style={styles.tripTimeTextSecondary}>05:30 PM – 06:30 PM</Text>
            </View>
            <Text style={[styles.tripMainRoute, !isLight && styles.textWhite]}>Hinjewadi TechZone to Narayan Peth</Text>
            <Text style={styles.upcomingNote}>Scheduled for evening return • Assigned to this vehicle</Text>
          </View>

          {/* App Version & Silent Update Status Bar */}
          <View style={[styles.otaFooterCard, !isLight && styles.tripListCardDark]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.otaFooterVersion, !isLight && styles.textWhite]}>
                FleetCommand Driver v1.0.0
              </Text>
              <Text style={styles.otaFooterStatus}>
                {updateStatus.isDownloading
                  ? '⏳ ' + (driverLang === 'mr' ? 'अपडेट डाऊनलोड होत आहे...' : driverLang === 'hi' ? 'अपडेट डाउनलोड हो रहा है...' : 'Downloading update in background...')
                  : updateStatus.isChecking
                  ? '🔍 ' + (driverLang === 'mr' ? 'अपडेट तपासत आहे...' : driverLang === 'hi' ? 'अपडेट जांच रहे हैं...' : 'Checking for updates...')
                  : '🟢 ' + (driverLang === 'mr' ? 'अ‍ॅप अद्ययावत आहे (Up to date)' : driverLang === 'hi' ? 'ऐप अपडेटेड है (Up to date)' : 'Silent OTA Updates Active')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.otaCheckBtn}
              onPress={() => silentUpdateManager.checkAndDownloadSilentUpdate({ isTripActive, manual: true })}
            >
              <Text style={styles.otaCheckBtnText}>
                {driverLang === 'mr' ? '🔄 अपडेट तपासा' : driverLang === 'hi' ? '🔄 अपडेट जांचें' : '🔄 Check'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {renderBottomTabBar()}
        {renderVoiceModal()}
        {renderIncidentModal()}
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SCREEN 2: TRIP DETAILS (LIVE GOOGLE MAP PREVIEW & PASSENGER CHECK-IN)
  // =========================================================================
  if (currentScreen === 'trip_details') {
    return (
      <SafeAreaView style={[styles.container, !isLight && styles.containerDark, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={isLight ? '#ffffff' : '#0f172a'} />

        {/* Sub Header */}
        <View style={[styles.subHeaderBar, !isLight && styles.headerBarDark]}>
          <TouchableOpacity onPress={() => setCurrentScreen('trips_list')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← {t.allTrips}</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, !isLight && styles.textWhite]}>{t.tripDetails}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {renderLanguageSwitcher()}
            <TouchableOpacity onPress={() => setShowVoiceModal(true)} style={styles.voiceHeaderBtn}>
              <Text style={styles.voiceHeaderBtnText}>🎤 Voice</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContentWithPadding}>
          {/* REAL GOOGLE MAP PREVIEW WITH CURRENT LOCATION & ROUTE TO PICKUP */}
          <RouteMap
            stops={PUNE_RT505_STOPS}
            pickupPoint={pickupPoint}
            dropPoint={dropPoint}
            driverLat={currentLat}
            driverLng={currentLng}
            driverHeading={currentHeading}
            driverSpeed={currentSpeed}
            isTripActive={false}
            distanceText={`${distanceToPickupKm} km ${t.pickupPoint}`}
            etaText={`~${etaToPickupMin} min`}
            isFullScreen={false}
            theme={themeMode}
            language={driverLang}
            onNavigate={openInAppNavigation}
          />

          {/* 1-TAP DIRECT OFFICIAL GOOGLE MAPS LAUNCH BUTTON */}
          <TouchableOpacity
            style={styles.googleNavDirectBtn}
            onPress={() => launchGoogleMapsNavigation(dropPoint.lat, dropPoint.lng)}
            activeOpacity={0.88}
          >
            <View style={styles.googleNavDirectIconCircle}>
              <Text style={{ fontSize: 18 }}>🚀</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={styles.googleNavDirectTitle}>
                {driverLang === 'mr' ? 'थेट Google Maps अॅपमध्ये नेव्हिगेट करा' : driverLang === 'hi' ? 'सीधे Google Maps ऐप में नेविगेट करें' : 'Open in Google Maps App'}
              </Text>
              <Text style={styles.googleNavDirectSub}>
                {driverLang === 'mr' ? 'लाईव्ह ट्रॅफिक, व्हॉइस आणि लेन गाईडन्स सह' : driverLang === 'hi' ? 'लाइव ट्रैफिक, वॉयस और लेन गाइडेंस के साथ' : 'With live traffic, voice & lane guidance'}
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: '#2563eb', fontWeight: 'bold' }}>➔</Text>
          </TouchableOpacity>

          {/* TRIP SAFETY & LOCATION DELAY STATUS BANNER */}
          <View style={[styles.tripComplianceCard, !isLight && styles.tripComplianceCardDark]}>
            <View style={styles.tripComplianceHeader}>
              <Text style={[styles.tripComplianceTitle, !isLight && styles.textWhite]}>
                🛡️ {driverLang === 'mr' ? 'सुरक्षितता व वेळेची स्थिती' : driverLang === 'hi' ? 'सुरक्षा एवं समय स्थिति' : 'Safety & Schedule Compliance'}
              </Text>
              <View style={[styles.tripPunctualityPill, locationDelayMin > 0 ? styles.tripPunctualityPillDelayed : styles.tripPunctualityPillOnTime]}>
                <Text style={[styles.tripPunctualityText, locationDelayMin > 0 ? styles.tripPunctualityTextDelayed : styles.tripPunctualityTextOnTime]}>
                  {locationDelayMin > 0 ? `⏱️ +${locationDelayMin}m Delay` : '🟢 On-Time'}
                </Text>
              </View>
            </View>

            <View style={styles.tripComplianceRow}>
              <View style={styles.tripComplianceItem}>
                <Text style={styles.tripComplianceLabel}>{driverLang === 'mr' ? 'अतिवेग उल्लंघन' : 'Over-speed Violations'}</Text>
                <Text style={[styles.tripComplianceVal, overspeedIncidentsCount > 0 ? { color: '#ef4444' } : { color: '#059669' }]}>
                  {overspeedIncidentsCount > 0 ? `⚠️ ${overspeedIncidentsCount} (Speed > 60 km/h)` : '🛡️ 0 (Compliant)'}
                </Text>
              </View>
              <View style={styles.tripMetaDivider} />
              <View style={styles.tripComplianceItem}>
                <Text style={styles.tripComplianceLabel}>{driverLang === 'mr' ? 'ठिकाणी विलंब' : 'Delay at Location'}</Text>
                <Text style={[styles.tripComplianceVal, locationDelayMin > 0 ? { color: '#f59e0b' } : { color: '#059669' }]}>
                  {locationDelayMin > 0 ? `+${locationDelayMin} min (Traffic)` : '0 min (On Schedule)'}
                </Text>
              </View>
            </View>
          </View>

          {/* PICKUP STOP CARD */}
          <View style={[styles.locationCard, !isLight && styles.locationCardDark]}>
            <View style={styles.locIconCol}>
              <View style={styles.pickupCircleOuter}>
                <View style={styles.pickupCircleInner} />
              </View>
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.locTypeLabel}>{t.pickupPoint} ({pickupPoint.time})</Text>
                <Text style={styles.locDelayChipGreen}>🟢 0m Delay</Text>
              </View>
              <Text style={[styles.locName, !isLight && styles.textWhite]}>{pickupPoint.name}</Text>
              <Text style={styles.locAddress}>{pickupPoint.address}</Text>
              <Text style={styles.locDistanceBadge}>
                📍 {distanceToPickupKm} km from your car • ~{etaToPickupMin} min • Scheduled 08:30 AM
              </Text>
            </View>
            <TouchableOpacity
              style={styles.inAppNavSmallBtn}
              onPress={openInAppNavigation}
            >
              <Text style={styles.inAppNavSmallIcon}>🧭</Text>
              <Text style={styles.inAppNavSmallText}>Map</Text>
            </TouchableOpacity>
          </View>

          {/* DESTINATION DROP STOP CARD */}
          <View style={[styles.locationCard, !isLight && styles.locationCardDark]}>
            <View style={styles.locIconCol}>
              <View style={styles.dropCircleOuter}>
                <Text style={{ fontSize: 13 }}>🏁</Text>
              </View>
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.locTypeLabel}>{t.dropPoint} ({dropPoint.time})</Text>
                <Text style={styles.locDelayChipYellow}>⏱️ +4m Traffic Delay</Text>
              </View>
              <Text style={[styles.locName, !isLight && styles.textWhite]}>{dropPoint.name}</Text>
              <Text style={styles.locAddress}>{dropPoint.address}</Text>
              <Text style={styles.locDistanceBadge}>📍 25.6 km total corridor • ETA ~09:34 AM</Text>
            </View>
            <TouchableOpacity
              style={styles.inAppNavSmallBtn}
              onPress={openInAppNavigation}
            >
              <Text style={styles.inAppNavSmallIcon}>🧭</Text>
              <Text style={styles.inAppNavSmallText}>Map</Text>
            </TouchableOpacity>
          </View>

          {/* PASSENGER CHECK-IN SECTION */}
          <View style={styles.passengersSection}>
            <View style={styles.passengersHeaderRow}>
              <Text style={[styles.passengersHeading, !isLight && styles.textWhite]}>
                {t.passengers} ({riders.length})
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.passengersBoardedCount, canStartTrip && { color: '#059669', fontWeight: '800' }]}>
                  {boardedCount}/{riders.length} {t.boarded}
                </Text>
                <TouchableOpacity
                  style={styles.checkInAllBtn}
                  onPress={() => {
                    setRiders((prev) => prev.map((r) => ({ ...r, status: 'boarded' })));
                    speakVoice(driverLang === 'mr' ? 'सर्व प्रवाशांचे चेक-इन पूर्ण झाले' : driverLang === 'hi' ? 'सभी यात्रियों का चेक-इन पूरा हुआ' : 'All passengers checked in');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.checkInAllBtnText}>
                    ✓ {driverLang === 'mr' ? 'सर्व चेक-इन' : driverLang === 'hi' ? 'सभी चेक-इन' : 'All In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!canStartTrip && (
              <View style={styles.checkInWarningBox}>
                <Text style={styles.checkInWarningText}>
                  ⚠️ {t.lockedTripBtn}
                </Text>
              </View>
            )}

            {riders.map((rider) => (
              <View key={rider.id} style={[styles.passengerRow, !isLight && styles.passengerRowDark]}>
                <View style={styles.passengerAvatar}>
                  <Text style={styles.passengerAvatarText}>{rider.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[styles.passengerName, !isLight && styles.textWhite]}>{rider.name}</Text>
                  <Text style={styles.passengerMeta}>{rider.company} • {rider.seat}</Text>
                </View>
                <TouchableOpacity onPress={() => callRider(rider.phone)} style={styles.callIconBtn}>
                  <Text style={styles.callIconBtnText}>📞 {t.call}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => toggleRiderStatus(rider.id)}
                  style={[styles.checkInBtn, rider.status === 'boarded' && styles.checkInBtnActive]}
                >
                  <Text style={[styles.checkInBtnText, rider.status === 'boarded' && styles.checkInBtnTextActive]}>
                    {rider.status === 'boarded' ? t.checkedIn : t.checkIn}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* FIXED BOTTOM ACTION BAR - STRICT CHECK-IN ENFORCEMENT */}
        <View style={[styles.fixedBottomBar, !isLight && styles.fixedBottomBarDark]}>
          <TouchableOpacity
            style={[styles.bigStartBtn, !canStartTrip && styles.bigStartBtnLocked]}
            onPress={handleStartTrip}
            activeOpacity={0.85}
          >
            <Text style={[styles.bigStartBtnText, !canStartTrip && styles.bigStartBtnTextLocked]}>
              {canStartTrip ? `${t.startTripBtn} (${boardedCount}/${riders.length})` : `🔒 ${t.lockedTripBtn}`}
            </Text>
            <Text style={[styles.bigStartBtnSub, !canStartTrip && styles.bigStartBtnSubLocked]}>
              {canStartTrip ? t.readyTripSub : t.lockedTripSub}
            </Text>
          </TouchableOpacity>
        </View>
        {renderVoiceModal()}
        {renderIncidentModal()}
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SCREEN 3: 100% IN-APP TURN-BY-TURN NAVIGATION COCKPIT (NO EXTERNAL APPS)
  // =========================================================================
  if (currentScreen === 'full_navigation') {
    return (
      <SafeAreaView style={[styles.container, styles.containerDark, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle="light-content" backgroundColor="#00402e" />

        {/* GOOGLE MAPS STYLE TOP TURN-BY-TURN HUD (MAX SCREEN TO MAP) */}
        <TouchableOpacity
          style={styles.googleHudBanner}
          activeOpacity={0.92}
          onPress={nextNavigationStep}
        >
          {/* Top Micro-Bar: Navigation Exit, Car ID, Language Switcher, Direct Google Maps */}
          <View style={styles.googleHudTopMicroRow}>
            <TouchableOpacity
              onPress={() => setCurrentScreen('trips_list')}
              style={styles.googleHudMicroExitBtn}
            >
              <Text style={styles.googleHudMicroExitText}>← Trips</Text>
            </TouchableOpacity>

            <Text style={styles.googleHudMicroCarText}>
              🚗 {vehicleRegNo}
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#2563eb',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
              onPress={() => launchGoogleMapsNavigation(dropPoint.lat, dropPoint.lng)}
            >
              <Text style={{ fontSize: 11, color: '#ffffff', fontWeight: '800' }}>🚀 Maps</Text>
            </TouchableOpacity>

            <View style={{ transform: [{ scale: 0.85 }] }}>
              {renderLanguageSwitcher()}
            </View>
          </View>

          {/* Main Maneuver Row: Big Arrow, Street Name, Single Mic Button */}
          <View style={styles.googleHudMainRow}>
            <View style={styles.googleHudManeuverBox}>
              <Text style={styles.googleHudManeuverArrow}>{NAVIGATION_STEPS[currentStepIdx].icon}</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={styles.googleHudTowardsText}>
                {driverLang === 'mr' ? 'दिशेने' : driverLang === 'hi' ? 'की ओर' : 'towards'}
              </Text>
              <Text style={styles.googleHudStreetName}>
                {NAVIGATION_STEPS[currentStepIdx].towards[driverLang]}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.googleHudMicBtn}
              onPress={() => setShowVoiceModal(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ fontSize: 20 }}>🎤</Text>
            </TouchableOpacity>
          </View>

          {/* Sub Row: Next turn preview chip + distance + sound mute toggle */}
          <View style={styles.googleHudSubRow}>
            <View style={styles.googleHudNextChip}>
              <Text style={styles.googleHudNextChipText}>
                {NAVIGATION_STEPS[currentStepIdx].nextChip[driverLang]}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const nextSpeed = isOverSpeeding ? 35 : 72;
                setCurrentSpeed(nextSpeed);
                checkOverSpeeding(nextSpeed);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.googleHudDistText, isOverSpeeding && { color: '#f87171', fontWeight: '900' }]}>
                {NAVIGATION_STEPS[currentStepIdx].dist} • {currentSpeed} km/h
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.googleHudSpeakerBtn, isMuted && { opacity: 0.6 }]}
              onPress={toggleSoundMute}
            >
              <Text style={{ fontSize: 16 }}>{isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* OVER-SPEEDING WARNING BANNER (AUTO DETECTED > 60 KM/H) */}
        {isOverSpeeding && (
          <View style={styles.overspeedAlertBanner}>
            <View style={styles.overspeedSpeedBadge}>
              <Text style={styles.overspeedSpeedVal}>{currentSpeed}</Text>
              <Text style={styles.overspeedSpeedUnit}>km/h</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={styles.overspeedAlertTitle}>
                {driverLang === 'mr' ? '⚠️ सावधान! अतिवेग इशारा' : driverLang === 'hi' ? '⚠️ सावधान! अधिक गति चेतावनी' : '⚠️ WARNING: OVER-SPEED DETECTED!'}
              </Text>
              <Text style={styles.overspeedAlertSub}>
                {driverLang === 'mr' ? 'मर्यादा: ६० किमी/तास • कृपया वाहनाचा वेग कमी करा!' : driverLang === 'hi' ? 'सीमा: ६० किमी/घंटा • कृपया गाड़ी की गति धीमी करें!' : 'Speed limit: 60 km/h • Please slow down immediately!'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.overspeedDismissBtn}
              onPress={() => setIsOverSpeeding(false)}
            >
              <Text style={styles.overspeedDismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* APPROACHING PASSENGER STOP ALERT CARD (AUTO DETECTED AT 500M) */}
        {approachingStop && (
          <View style={styles.approachingStopBanner}>
            <View style={styles.approachingStopIconCircle}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={styles.approachingStopTitle}>
                {driverLang === 'mr' ? 'पुढील थांबा जवळ आला आहे (~५०० मी)' : driverLang === 'hi' ? 'अगला स्टॉप पास आ रहा है (~५०० मी)' : 'Approaching Next Stop (~500m)'}
              </Text>
              <Text style={styles.approachingStopName}>{approachingStop.name}</Text>
              {approachingStop.riderName ? (
                <Text style={styles.approachingStopRider}>
                  👤 {approachingStop.riderName} ({approachingStop.type === 'pickup' ? 'पिकअप' : 'ड्रॉप'})
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {approachingStop.riderPhone ? (
                <TouchableOpacity
                  style={styles.approachingCallBtn}
                  onPress={() => callRider(approachingStop.riderPhone)}
                >
                  <Text style={{ fontSize: 16 }}>📞</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.approachingCheckInBtn}
                onPress={() => {
                  if (approachingStop.riderName) {
                    setRiders((prev) =>
                      prev.map((r) =>
                        r.name.toLowerCase().includes(approachingStop.riderName.toLowerCase())
                          ? { ...r, status: 'boarded' }
                          : r
                      )
                    );
                  }
                  speakVoice(driverLang === 'mr' ? `${approachingStop.name} चेक-इन पूर्ण` : `${approachingStop.name} चेक-इन पूरा`);
                  setApproachingStop(null);
                }}
              >
                <Text style={styles.approachingCheckInBtnText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approachingDismissBtn}
                onPress={() => setApproachingStop(null)}
              >
                <Text style={styles.approachingDismissBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FULL-SCREEN REAL GOOGLE MAP - MAXIMUM SCREEN AREA (85%+) */}
        <View style={{ flex: 1 }}>
          <RouteMap
            stops={PUNE_RT505_STOPS}
            pickupPoint={pickupPoint}
            dropPoint={dropPoint}
            driverLat={currentLat}
            driverLng={currentLng}
            driverHeading={currentHeading}
            driverSpeed={currentSpeed}
            isTripActive={isTripActive}
            distanceText={`${distanceRemainingKm} km`}
            etaText={`~${etaMinutes} min`}
            isFullScreen={true}
            theme="dark"
            language={driverLang}
            isMuted={isMuted}
            onToggleSound={() => setIsMuted(!isMuted)}
            onRecenter={() => {
              requestEssentialPermissions();
              speakVoice(driverLang === 'mr' ? 'गाडीवर री-सेंटर केले' : driverLang === 'hi' ? 'गाड़ी पर री-सेंटर किया गया' : 'Re-centered on car');
            }}
          />
        </View>

        {/* Slide-Up Passenger Drawer */}
        {showInNavRiders && (
          <View style={[styles.inNavRiderDrawer, styles.tripListCardDark]}>
            <View style={styles.drawerHeaderRow}>
              <Text style={[styles.drawerTitle, styles.textWhite]}>
                {t.passengers} ({riders.length})
              </Text>
              <TouchableOpacity onPress={() => setShowInNavRiders(false)}>
                <Text style={styles.drawerCloseBtn}>✕ {t.closeVoice}</Text>
              </TouchableOpacity>
            </View>
            {riders.map((r) => (
              <View key={r.id} style={[styles.drawerRiderRow, styles.passengerRowDark]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.drawerRiderName, styles.textWhite]}>{r.name}</Text>
                  <Text style={styles.drawerRiderSub}>{r.company} • {r.seat}</Text>
                </View>
                <TouchableOpacity onPress={() => callRider(r.phone)} style={styles.callIconBtn}>
                  <Text style={styles.callIconBtnText}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => toggleRiderStatus(r.id)}
                  style={[styles.checkInBtn, r.status === 'boarded' && styles.checkInBtnActive]}
                >
                  <Text style={[styles.checkInBtnText, r.status === 'boarded' && styles.checkInBtnTextActive]}>
                    {r.status === 'boarded' ? t.checkedIn : t.checkIn}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* SLEEK SINGLE-ROW GOOGLE MAPS COCKPIT (NO DUPLICATE BUTTONS) */}
        <View style={styles.googleBottomCockpitDark}>
          <View style={styles.googleCockpitMainRow}>
            {/* Left Exit Navigation */}
            <TouchableOpacity
              style={styles.googleCockpitCloseBtn}
              onPress={() => setCurrentScreen('trips_list')}
            >
              <Text style={styles.googleCockpitCloseIcon}>✕</Text>
            </TouchableOpacity>

            {/* Center Big ETA & Distance */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.googleCockpitEtaBig}>{etaMinutes} min</Text>
                <Text style={styles.googleCockpitEcoLeaf}>🍃</Text>
              </View>
              <Text style={styles.googleCockpitSubInfo}>
                {distanceRemainingKm} km •{' '}
                {new Date(Date.now() + etaMinutes * 60000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Quick Action: Report Incident (⚠️) */}
            <TouchableOpacity
              style={[styles.googleCockpitActionPill, { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)' }]}
              onPress={() => setShowIncidentModal(true)}
            >
              <Text style={{ fontSize: 14 }}>⚠️</Text>
            </TouchableOpacity>

            {/* Sound Toggle Button (🔊 / 🔇) */}
            <TouchableOpacity
              style={[
                styles.googleCockpitActionPill,
                isMuted
                  ? { borderColor: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.15)' }
                  : { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)' },
              ]}
              onPress={toggleSoundMute}
            >
              <Text style={{ fontSize: 14 }}>{isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            {/* Quick Action: Open in Native Google Maps App */}
            <TouchableOpacity
              style={[styles.googleCockpitActionPill, { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.18)' }]}
              onPress={() => launchGoogleMapsNavigation(dropPoint.lat, dropPoint.lng)}
            >
              <Text style={{ fontSize: 13 }}>🚀</Text>
            </TouchableOpacity>

            {/* Passenger Count (👥) */}
            <TouchableOpacity
              style={styles.googleCockpitPassengerBtn}
              onPress={() => setShowInNavRiders(!showInNavRiders)}
            >
              <Text style={styles.googleCockpitPassengerIcon}>👥 {boardedCount}</Text>
            </TouchableOpacity>

            {/* End Trip Button (⏹) */}
            <TouchableOpacity
              style={[styles.googleCockpitActionPill, { backgroundColor: '#dc2626', borderColor: '#b91c1c' }]}
              onPress={endTrip}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>⏹ End</Text>
            </TouchableOpacity>
          </View>
        </View>
        {renderVoiceModal()}
        {renderIncidentModal()}
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SCREEN 4: REPORT INCIDENT
  // =========================================================================
  if (currentScreen === 'incident') {
    return (
      <SafeAreaView style={[styles.container, !isLight && styles.containerDark, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={isLight ? '#ffffff' : '#0f172a'} />
        <View style={[styles.subHeaderBar, !isLight && styles.headerBarDark]}>
          <TouchableOpacity onPress={() => setCurrentScreen('full_navigation')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, !isLight && styles.textWhite]}>Report Issue to Dispatch</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionHeading, !isLight && styles.textWhite]}>Select Incident Type</Text>
          <Text style={styles.sectionSubtitle}>Broadcasts live GPS coordinates to fleet management console.</Text>

          {[
            { id: 'puncture', label: 'Tyre Puncture / Flat Tyre', icon: '🛞' },
            { id: 'traffic', label: 'Severe Traffic Jam (>15 min delay)', icon: '🚧' },
            { id: 'mechanical', label: 'EV Battery / Motor Alert', icon: '⚡' },
            { id: 'emergency', label: 'Accident / Emergency Police', icon: '🚨' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.incidentOption,
                incidentKind === item.id && styles.incidentOptionActive,
                !isLight && styles.tripListCardDark,
              ]}
              onPress={() => setIncidentKind(item.id)}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>{item.icon}</Text>
              <Text style={[styles.incidentOptionText, !isLight && styles.textWhite]}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          {incidentTransmitted && (
            <View style={styles.incidentSuccessAlert}>
              <Text style={styles.incidentSuccessText}>✓ Incident transmitted to fleet dispatch.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.transmitBtn} onPress={transmitIncident}>
            <Text style={styles.transmitBtnText}>TRANSMIT ALERT TO FLEET DISPATCH</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SCREEN 5: TRIP COMPLETED SUMMARY
  // =========================================================================
  if (currentScreen === 'summary') {
    return (
      <SafeAreaView style={[styles.container, !isLight && styles.containerDark, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={isLight ? '#ffffff' : '#0f172a'} />
        <ScrollView contentContainerStyle={styles.summaryContainer}>
          <View style={styles.summarySuccessCircle}>
            <Text style={{ fontSize: 44 }}>✓</Text>
          </View>
          <Text style={[styles.summaryTitle, !isLight && styles.textWhite]}>Trip Completed</Text>
          <Text style={styles.summarySubtitle}>Route RT-505 safely finished at Megapolis Phase 3.</Text>

          <View style={[styles.summaryCard, !isLight && styles.tripListCardDark]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Distance</Text>
              <Text style={[styles.summaryValue, !isLight && styles.textWhite]}>{tripSummaryStats.distanceKm} km</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Trip Duration</Text>
              <Text style={[styles.summaryValue, !isLight && styles.textWhite]}>{tripSummaryStats.durationMin} min</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Passengers Dropped</Text>
              <Text style={[styles.summaryValue, !isLight && styles.textWhite]}>
                {tripSummaryStats.boardedCount} / {tripSummaryStats.totalRiders}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vehicle</Text>
              <Text style={[styles.summaryValue, !isLight && styles.textWhite]}>{vehicleRegNo}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.summaryDoneBtn} onPress={() => setCurrentScreen('trips_list')}>
            <Text style={styles.summaryDoneBtnText}>RETURN TO TODAY'S TRIPS</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SCREEN 4: TRIP HISTORY (इतिहास)
  // =========================================================================
  if (currentScreen === 'history') {
    const filteredTrips = PAST_TRIPS.filter((tRecord) => {
      if (historyFilter === 'today') return tRecord.date.includes('आज') || tRecord.date.includes('Today');
      if (historyFilter === 'week') return true;
      return true;
    });

    return (
      <SafeAreaView style={[styles.container, !isLight && styles.containerDark, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={isLight ? '#ffffff' : '#0f172a'} />

        {/* Sub Header */}
        <View style={[styles.subHeaderBar, !isLight && styles.headerBarDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>📜</Text>
            <Text style={[styles.subHeaderTitle, !isLight && styles.textWhite]}>{t.historyTitle || 'Trip History'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {renderLanguageSwitcher()}
            <TouchableOpacity
              style={styles.headerProfileCircle}
              onPress={() => setCurrentScreen('profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.headerProfileInitials}>GJ</Text>
              <View style={styles.headerProfileOnlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContentWithPadding}>
          {/* Top Performance Stats Ribbon */}
          <View style={[styles.historyStatsCard, !isLight && styles.historyStatsCardDark]}>
            <View style={styles.historyStatCol}>
              <Text style={styles.historyStatVal}>142</Text>
              <Text style={styles.historyStatLabel}>{t.statsTotalTrips || 'Total Trips'}</Text>
            </View>
            <View style={styles.historyStatDivider} />
            <View style={styles.historyStatCol}>
              <Text style={styles.historyStatVal}>3,840</Text>
              <Text style={styles.historyStatLabel}>{t.statsTotalKm || 'Total KM'}</Text>
            </View>
            <View style={styles.historyStatDivider} />
            <View style={styles.historyStatCol}>
              <Text style={[styles.historyStatVal, { color: '#eab308' }]}>4.95 ★</Text>
              <Text style={styles.historyStatLabel}>{t.statsRating || 'Rating'}</Text>
            </View>
            <View style={styles.historyStatDivider} />
            <View style={styles.historyStatCol}>
              <Text style={[styles.historyStatVal, { color: '#10b981' }]}>13.8</Text>
              <Text style={styles.historyStatLabel}>kWh/100km</Text>
            </View>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            {[
              { id: 'all', label: t.filterAll || 'All' },
              { id: 'today', label: t.filterToday || 'Today' },
              { id: 'week', label: t.filterWeek || 'This Week' },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterPill,
                  historyFilter === f.id && styles.filterPillActive,
                  !isLight && historyFilter !== f.id && styles.filterPillDark,
                ]}
                onPress={() => setHistoryFilter(f.id as any)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    historyFilter === f.id && styles.filterPillTextActive,
                    !isLight && historyFilter !== f.id && styles.textWhite,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Past Trips List */}
          {filteredTrips.map((item) => (
            <View key={item.id} style={[styles.historyTripCard, !isLight && styles.tripListCardDark]}>
              <View style={styles.historyCardHeader}>
                <View>
                  <Text style={styles.historyShiftBadge}>{item.shift}</Text>
                  <Text style={styles.historyDateText}>{item.date}</Text>
                </View>
                <View style={styles.historyRatingBadge}>
                  <Text style={styles.historyRatingText}>{item.rating}</Text>
                </View>
              </View>

              <Text style={[styles.historyRouteTitle, !isLight && styles.textWhite]}>{item.routeName}</Text>

              <View style={styles.historyStopDetails}>
                <View style={styles.historyStopRow}>
                  <View style={styles.historyStopGreenDot} />
                  <Text style={[styles.historyStopText, !isLight && styles.textMutedDark]}>{item.from}</Text>
                </View>
                <View style={styles.historyStopRow}>
                  <View style={styles.historyStopRedDot} />
                  <Text style={[styles.historyStopText, !isLight && styles.textMutedDark]}>{item.to}</Text>
                </View>
              </View>

              {/* Vehicle & Metrics with Over-Speed & Delay */}
              <View style={styles.historyMetricsRow}>
                <Text style={styles.historyMetricText}>🚗 {item.vehicle.split('•')[1] || item.vehicle}</Text>
                <Text style={styles.historyMetricText}>📏 {item.distanceKm} km</Text>
                <Text style={styles.historyMetricText}>⏱️ {item.durationMin} min</Text>
                <Text style={styles.historyMetricText}>👥 {item.passengersCount}/{item.totalPassengers}</Text>
                <Text style={[styles.historyMetricText, item.overspeedIncidents > 0 ? { color: '#ef4444' } : { color: '#059669' }]}>
                  {item.overspeedIncidents > 0 ? `⚠️ ${item.overspeedIncidents} Over-spd` : '🛡️ 0 Over-spd'}
                </Text>
                <Text style={[styles.historyMetricText, item.locationDelayMinutes > 0 ? { color: '#f59e0b' } : { color: '#059669' }]}>
                  {item.locationDelayMinutes > 0 ? `⏱️ +${item.locationDelayMinutes}m Delay` : '🟢 On-Time'}
                </Text>
              </View>

              {/* Corporate Passengers */}
              <View style={styles.historyPassengerChips}>
                {item.passengersList.map((pName, idx) => (
                  <View key={idx} style={styles.historyPassengerChip}>
                    <Text style={styles.historyPassengerChipText}>👤 {pName}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.historyCardFooter}>
                <View style={styles.historySuccessPill}>
                  <Text style={styles.historySuccessPillText}>✓ {driverLang === 'mr' ? 'यशस्वीरीत्या पूर्ण' : driverLang === 'hi' ? 'सफलतापूर्वक पूर्ण' : 'Completed'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.historyReceiptBtn}
                  onPress={() => {
                    Alert.alert(
                      item.routeName,
                      `Trip ID: ${item.id}\nDate: ${item.date}\nDistance: ${item.distanceKm} km\nDuration: ${item.durationMin} min\nVehicle: ${item.vehicle}\nRiders: ${item.passengersList.join(', ')}`
                    );
                  }}
                >
                  <Text style={styles.historyReceiptBtnText}>
                    {driverLang === 'mr' ? 'तपशील पहा ➔' : driverLang === 'hi' ? 'विवरण देखें ➔' : 'Details ➔'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {renderBottomTabBar()}
        {renderVoiceModal()}
        {renderIncidentModal()}
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SCREEN 5: NOTIFICATIONS & DISPATCH ALERTS (सूचना)
  // =========================================================================
  if (currentScreen === 'notifications') {
    const filteredNotifs = notifications.filter((n) => {
      if (notifFilter === 'speed') return n.type === 'speed';
      if (notifFilter === 'dispatch') return n.type === 'dispatch';
      if (notifFilter === 'battery') return n.type === 'battery' || n.type === 'system';
      return true;
    });

    const markAllAsRead = () => {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      speakVoice(driverLang === 'mr' ? 'सर्व सूचना वाचल्या म्हणून चिन्हांकित केल्या' : 'All notifications marked as read');
    };

    return (
      <SafeAreaView style={[styles.container, !isLight && styles.containerDark, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={isLight ? '#ffffff' : '#0f172a'} />

        {/* Sub Header */}
        <View style={[styles.subHeaderBar, !isLight && styles.headerBarDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            <Text style={[styles.subHeaderTitle, !isLight && styles.textWhite]}>{t.notificationsTitle || 'Notifications'}</Text>
            {unreadNotifCount > 0 && (
              <View style={styles.headerUnreadBadge}>
                <Text style={styles.headerUnreadBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Text style={styles.markReadBtnText}>{t.markAllRead || 'Mark Read'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContentWithPadding}>
          {/* Notification Category Filters */}
          <View style={styles.filterPillsRow}>
            {[
              { id: 'all', label: t.filterAll || 'All' },
              { id: 'speed', label: '⚠️ Speed' },
              { id: 'dispatch', label: '📢 Dispatch' },
              { id: 'battery', label: '🔋 EV' },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterPill,
                  notifFilter === f.id && styles.filterPillActive,
                  !isLight && notifFilter !== f.id && styles.filterPillDark,
                ]}
                onPress={() => setNotifFilter(f.id as any)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    notifFilter === f.id && styles.filterPillTextActive,
                    !isLight && notifFilter !== f.id && styles.textWhite,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List of Notification Cards */}
          {filteredNotifs.length === 0 ? (
            <View style={styles.emptyNotifsBox}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>✅</Text>
              <Text style={[styles.emptyNotifsText, !isLight && styles.textWhite]}>{t.noAlerts || 'No notifications'}</Text>
            </View>
          ) : (
            filteredNotifs.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notifCard,
                  !isLight && styles.notifCardDark,
                  !item.read && styles.notifCardUnread,
                  !isLight && !item.read && styles.notifCardUnreadDark,
                ]}
                onPress={() => {
                  setNotifications((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
                  );
                  speakVoice(item.title[driverLang]);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.notifIconCircle, { backgroundColor: item.color + '20', borderColor: item.color }]}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>

                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.notifTitle, !isLight && styles.textWhite]}>{item.title[driverLang]}</Text>
                    {!item.read && <View style={styles.notifUnreadDot} />}
                  </View>
                  <Text style={[styles.notifMsg, !isLight && styles.textMutedDark]}>{item.message[driverLang]}</Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {renderBottomTabBar()}
        {renderVoiceModal()}
        {renderIncidentModal()}
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SCREEN 6: DRIVER PROFILE & PREFERENCES (प्रोफाइल)
  // =========================================================================
  if (currentScreen === 'profile') {
    return (
      <SafeAreaView style={[styles.container, !isLight && styles.containerDark, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={isLight ? '#ffffff' : '#0f172a'} />

        {/* Sub Header */}
        <View style={[styles.subHeaderBar, !isLight && styles.headerBarDark]}>
          <TouchableOpacity onPress={() => setCurrentScreen('trips_list')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← {t.tabHome}</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, !isLight && styles.textWhite]}>{t.profileTitle || 'Driver Profile'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContentWithPadding}>
          {/* Driver Identity Hero Card */}
          <View style={[styles.profileHeroCard, !isLight && styles.profileHeroCardDark]}>
            <View style={styles.profileBigAvatarCircle}>
              <Text style={styles.profileBigAvatarText}>GJ</Text>
              <View style={styles.profileVerifiedBadge}>
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>✓</Text>
              </View>
            </View>

            <Text style={[styles.profileHeroName, !isLight && styles.textWhite]}>{driverName}</Text>
            <Text style={styles.profileHeroSub}>Commercial EV Fleet Pilot • {driverId}</Text>
            <View style={styles.profileRatingRow}>
              <Text style={styles.profileStarBadge}>⭐ 4.95 Rating</Text>
              <Text style={styles.profileTripsBadge}>142 Corporate Trips</Text>
            </View>
            <Text style={styles.profilePhoneText}>📱 +91 {driverPhone}</Text>
          </View>

          {/* Assigned EV Cab Information */}
          <View style={[styles.profileSectionBox, !isLight && styles.tripListCardDark]}>
            <Text style={[styles.profileSectionTitle, !isLight && styles.textWhite]}>⚡ Assigned Commercial EV</Text>
            <View style={styles.profileDetailRow}>
              <Text style={styles.profileDetailLabel}>Vehicle Model</Text>
              <Text style={[styles.profileDetailVal, !isLight && styles.textWhite]}>{vehicleModel}</Text>
            </View>
            <View style={styles.profileDetailRow}>
              <Text style={styles.profileDetailLabel}>Registration Plate</Text>
              <Text style={[styles.profileDetailVal, !isLight && styles.textWhite]}>{vehicleRegNo}</Text>
            </View>
            <View style={styles.profileDetailRow}>
              <Text style={styles.profileDetailLabel}>Battery Level & Range</Text>
              <Text style={[styles.profileDetailVal, { color: '#10b981', fontWeight: '800' }]}>78% (~220 km)</Text>
            </View>
            <View style={styles.profileDetailRow}>
              <Text style={styles.profileDetailLabel}>Charging Protocol</Text>
              <Text style={[styles.profileDetailVal, !isLight && styles.textWhite]}>CCS-2 DC Fast Charging</Text>
            </View>
          </View>

          {/* App Preferences & Language */}
          <View style={[styles.profileSectionBox, !isLight && styles.tripListCardDark]}>
            <Text style={[styles.profileSectionTitle, !isLight && styles.textWhite]}>🌐 भाषा व नेव्हिगेशन आवाज (Language & Voice)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              {[
                { code: 'mr', label: 'मराठी' },
                { code: 'hi', label: 'हिंदी' },
                { code: 'en', label: 'English' },
              ].map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.profileLangBtn,
                    driverLang === lang.code && styles.profileLangBtnActive,
                  ]}
                  onPress={() => {
                    setDriverLang(lang.code as any);
                    speakVoice(
                      lang.code === 'mr' ? 'मराठी भाषा निवडली आहे' : lang.code === 'hi' ? 'हिंदी भाषा चुनी गई है' : 'English selected',
                      lang.code as any
                    );
                  }}
                >
                  <Text style={[styles.profileLangBtnText, driverLang === lang.code && styles.profileLangBtnTextActive]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.profileVoiceTestBtn}
              onPress={() => {
                const sample = driverLang === 'mr'
                  ? 'नमस्कार गणेश! नेव्हिगेशन आणि व्हॉइस असिस्टंट सुस्थितीत कार्यरत आहे.'
                  : driverLang === 'hi'
                  ? 'नमस्ते गणेश! नेविगेशन और वॉयस असिस्टेंट सही तरीके से काम कर रहा है।'
                  : 'Hello Ganesh! Navigation and voice guidance are working properly.';
                speakVoice(sample);
              }}
            >
              <Text style={styles.profileVoiceTestBtnText}>🔊 {driverLang === 'mr' ? 'ऑडिओ आवाज तपासा (Speaker Test)' : 'Test Audio Voice'}</Text>
            </TouchableOpacity>
          </View>

          {/* Support & Dispatch Helpline */}
          <View style={[styles.profileSectionBox, !isLight && styles.tripListCardDark]}>
            <Text style={[styles.profileSectionTitle, !isLight && styles.textWhite]}>📞 Fleet Dispatch & Support</Text>
            <TouchableOpacity
              style={styles.profileHelpBtn}
              onPress={() => Linking.openURL('tel:18002093533')}
            >
              <Text style={{ fontSize: 20 }}>🚨</Text>
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={styles.profileHelpTitle}>24/7 Dispatch Control Room</Text>
                <Text style={styles.profileHelpSub}>1800-209-3533 (Toll Free Hotline)</Text>
              </View>
              <Text style={{ fontSize: 16, color: '#2563eb' }}>📞 Call</Text>
            </TouchableOpacity>
          </View>

          {/* App Version & Status */}
          <View style={styles.profileVersionBox}>
            <Text style={styles.profileVersionText}>FleetCommand Commercial Driver App v2.4.0</Text>
            <Text style={styles.profileVersionSub}>Hermes Engine • Silent OTA Active • GPS Fix Ready</Text>
          </View>
        </ScrollView>

        {renderBottomTabBar()}
        {renderVoiceModal()}
        {renderIncidentModal()}
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SCREEN 6: PERMISSION REQUIRED
  // =========================================================================
  return (
    <SafeAreaView style={[styles.container, !isLight && styles.containerDark, styles.centerAll]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.permCard}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>📍</Text>
        <Text style={[styles.permTitle, !isLight && styles.textWhite]}>Location Access Required</Text>
        <Text style={styles.permSubtitle}>
          FleetCommand requires location access while using the app to track your car trip and show route navigation.
        </Text>
        <TouchableOpacity style={styles.buttonPrimary} onPress={requestEssentialPermissions}>
          <Text style={styles.buttonText}>GRANT LOCATION PERMISSION</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0b1120',
  },
  centerAll: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  textWhite: {
    color: '#ffffff',
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBarDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  headerCompanyBadge: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerDriverName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  headerCarPlate: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  langPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langPill: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 14,
  },
  langPillActive: {
    backgroundColor: '#059669',
  },
  langPillText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  langPillTextActive: {
    color: '#ffffff',
  },
  voiceHeaderBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  voiceHeaderBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
  },
  themeToggleBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  themeToggleBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  themeToggleText: {
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollContentWithPadding: {
    padding: 16,
    paddingBottom: 110,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeading: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 14,
  },
  liveDutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 6,
  },
  greenPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#059669',
  },
  liveDutyText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  tripListCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  tripListCardDark: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
  },
  tripCardUpcoming: {
    opacity: 0.82,
    borderStyle: 'dashed',
  },
  tripCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shiftBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tripTimeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  tripTimeTextSecondary: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  tripMainRoute: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  upcomingNote: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  tripMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  tripMetaDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  tripMetaLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  tripMetaVal: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  tripCardActionBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  tripCardActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subHeaderTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  locationCardDark: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
  },
  locIconCol: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCircleOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCircleInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
  },
  dropCircleOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
  },
  locTypeLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  locAddress: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  locDistanceBadge: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  inAppNavSmallBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inAppNavSmallIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  inAppNavSmallText: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '800',
  },
  passengersSection: {
    marginTop: 6,
    marginBottom: 16,
  },
  passengersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  passengersHeading: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  passengersBoardedCount: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  checkInWarningBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  checkInWarningText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  passengerRowDark: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
  },
  passengerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerAvatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  passengerName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  passengerMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  callIconBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginRight: 6,
  },
  callIconBtnText: {
    color: '#1e293b',
    fontSize: 11,
    fontWeight: '700',
  },
  checkInBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  checkInBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  checkInBtnText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  checkInBtnTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 99,
  },
  fixedBottomBarDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  bigStartBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  bigStartBtnLocked: {
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    shadowOpacity: 0,
    elevation: 0,
  },
  bigStartBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bigStartBtnTextLocked: {
    color: '#b45309',
  },
  bigStartBtnSub: {
    color: '#d1fae5',
    fontSize: 11,
    marginTop: 3,
  },
  bigStartBtnSubLocked: {
    color: '#92400e',
    fontWeight: '600',
  },
  navTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navExitBtn: {
    paddingVertical: 4,
    paddingRight: 6,
  },
  navExitText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  navTopStatus: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  navTopCar: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  navMicBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  navMicBtnIcon: {
    fontSize: 16,
  },
  turnHudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#047857',
  },
  turnHudIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  turnHudArrow: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  turnHudDist: {
    color: '#d1fae5',
    fontSize: 10,
    fontWeight: '800',
  },
  turnHudTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  turnHudSub: {
    color: '#d1fae5',
    fontSize: 11,
    marginTop: 2,
  },
  turnHudSpeakerBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 7,
    borderRadius: 16,
  },
  inNavRiderDrawer: {
    position: 'absolute',
    top: 110,
    left: 12,
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    zIndex: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    maxHeight: 280,
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  drawerTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  drawerCloseBtn: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  drawerRiderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  drawerRiderName: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  drawerRiderSub: {
    color: '#64748b',
    fontSize: 10,
  },
  fullNavBottomCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    zIndex: 50,
  },
  fullNavBottomCardDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  navInAppSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  navInAppDestTitle: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '800',
  },
  navInAppDestSub: {
    color: '#047857',
    fontSize: 11,
    marginTop: 2,
  },
  navAudioRepeatBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  navAudioRepeatIcon: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  drawerToggleBtn: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  drawerToggleBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  drawerToggleText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  navActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navProblemBtn: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navProblemBtnText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '800',
  },
  navEndBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  navEndBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  voiceModalBox: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  voiceModalBoxDark: {
    backgroundColor: '#0f172a',
  },
  voiceModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  voiceMicCircleLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  voiceModalTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  voiceModalSub: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  voiceCommandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  voiceCmdBtn: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  voiceCmdEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  voiceCmdLabel: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  voiceModalCloseBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voiceModalCloseText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  incidentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  incidentOptionActive: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  incidentOptionText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  incidentSuccessAlert: {
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  incidentSuccessText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  transmitBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  transmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySuccessCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#10b981',
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  summarySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  summaryDoneBtn: {
    width: '100%',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  summaryDoneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  permCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  permTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  permSubtitle: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonPrimary: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  otaUpdateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    gap: 10,
  },
  otaUpdatePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  otaUpdateTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  otaUpdateSub: {
    color: '#d1fae5',
    fontSize: 11,
    marginTop: 2,
  },
  otaUpdateActionBtn: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  otaFooterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  otaFooterVersion: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  otaFooterStatus: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  otaCheckBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  otaCheckBtnText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
  },
  googleHudBanner: {
    backgroundColor: '#00543c',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#00402e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  googleHudMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleHudManeuverBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00422f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleHudManeuverArrow: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  googleHudTowardsText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '700',
  },
  googleHudStreetName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  googleHudMicBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleHudSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 4,
    gap: 10,
  },
  googleHudNextChip: {
    backgroundColor: '#00422f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  googleHudNextChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  googleHudDistText: {
    color: '#d1fae5',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  googleHudSpeakerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#00422f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleHudTopMicroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  googleHudMicroExitBtn: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  googleHudMicroExitText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  googleHudMicroCarText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '700',
  },
  googleCockpitActionPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBottomCockpit: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
  },
  googleBottomCockpitDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
  },
  googleCockpitMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 0,
  },
  googleCockpitCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  googleCockpitCloseIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  googleCockpitEtaBig: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '900',
  },
  googleCockpitEcoLeaf: {
    fontSize: 14,
  },
  googleCockpitSubInfo: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  googleCockpitPassengerBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  googleCockpitPassengerIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  googleNavDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    elevation: 2,
  },
  googleNavDirectIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleNavDirectTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  googleNavDirectSub: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
    fontWeight: '600',
  },
  checkInAllBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  checkInAllBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  overspeedAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#b91c1c',
    zIndex: 999,
  },
  overspeedSpeedBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#991b1b',
  },
  overspeedSpeedVal: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '900',
  },
  overspeedSpeedUnit: {
    color: '#dc2626',
    fontSize: 9,
    fontWeight: '800',
  },
  overspeedAlertTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  overspeedAlertSub: {
    color: '#fee2e2',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  overspeedDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overspeedDismissText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  approachingStopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderColor: '#38bdf8',
    borderWidth: 1.5,
    borderRadius: 14,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    position: 'absolute',
    top: 130,
    left: 0,
    right: 0,
    zIndex: 998,
    elevation: 6,
  },
  approachingStopIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56,189,248,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approachingStopTitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  approachingStopName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  approachingStopRider: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  approachingCallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approachingCheckInBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approachingCheckInBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  approachingDismissBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approachingDismissBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '800',
  },
  // Bottom Tab Bar
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    paddingBottom: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  bottomTabBarDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
    position: 'relative',
  },
  bottomTabIconBox: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTabIcon: {
    fontSize: 22,
    opacity: 0.65,
  },
  bottomTabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  bottomTabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    color: '#64748b',
  },
  bottomTabLabelActive: {
    color: '#059669',
    fontWeight: '800',
  },
  bottomTabActiveIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#059669',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  textMutedLight: {
    color: '#64748b',
  },
  // Top Header Profile Circle
  headerProfileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  headerProfileInitials: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  headerProfileOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  // Filter Pills Row
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  filterPillDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  // History Screen Styles
  historyStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  historyStatsCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  historyStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  historyStatVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  historyStatLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  historyStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#cbd5e1',
  },
  historyTripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  historyShiftBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  historyDateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  historyRatingBadge: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  historyRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854d0e',
  },
  historyRouteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 4,
  },
  historyStopDetails: {
    marginVertical: 6,
    gap: 4,
  },
  historyStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyStopGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  historyStopRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  historyStopText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  historyMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historyMetricText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  historyPassengerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  historyPassengerChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyPassengerChipText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historySuccessPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historySuccessPillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  historyReceiptBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyReceiptBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
  },
  // Notifications Screen Styles
  headerUnreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerUnreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  markReadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
  },
  markReadBtnText: {
    color: '#3730a3',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyNotifsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyNotifsText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notifCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  notifCardUnread: {
    borderColor: '#93c5fd',
    backgroundColor: '#f0f9ff',
  },
  notifCardUnreadDark: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c2340',
  },
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  notifUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 6,
  },
  notifMsg: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
    lineHeight: 17,
  },
  notifTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 5,
    fontWeight: '600',
  },
  // Profile Screen Styles
  profileHeroCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  profileHeroCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  profileBigAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#10b981',
  },
  profileBigAvatarText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  profileVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeroName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  profileHeroSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  profileRatingRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  profileStarBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854d0e',
    backgroundColor: '#fef9c3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  profileTripsBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  profilePhoneText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
    fontWeight: '600',
  },
  profileSectionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileDetailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  profileDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileLangBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  profileLangBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  profileLangBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  profileLangBtnTextActive: {
    color: '#ffffff',
  },
  profileVoiceTestBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  profileVoiceTestBtnText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '800',
  },
  profileHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  profileHelpTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
  },
  profileHelpSub: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  profileVersionBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  profileVersionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  profileVersionSub: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 2,
  },
  // Zero Overflow Multi-row Header
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  sectionSubHeading: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  // Trip Punctuality & Delay Chips
  tripPunctualityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tripPunctualityPillOnTime: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  tripPunctualityPillDelayed: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tripPunctualityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tripPunctualityTextOnTime: {
    color: '#059669',
  },
  tripPunctualityTextDelayed: {
    color: '#b45309',
  },
  tripSubRouteLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 10,
  },
  // 4-Bento Metric Grid (Distance, Riders, Over-speed, Location Delay)
  tripBentoGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tripBentoCell: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  tripBentoCellDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  tripBentoLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tripBentoVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  // Stops Timeline Preview
  tripTimelineBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tripTimelineBoxDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  tripTimelineHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  tripTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripTimelineConnector: {
    width: 2,
    height: 12,
    backgroundColor: '#cbd5e1',
    marginLeft: 4,
    marginVertical: 1,
  },
  timelineDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  timelineDotYellow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
  timelineDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  timelineStopTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  timelineStopSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  // Trip Details Compliance Card
  tripComplianceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  tripComplianceCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  tripComplianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripComplianceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  tripComplianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tripComplianceItem: {
    flex: 1,
    alignItems: 'center',
  },
  tripComplianceLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  tripComplianceVal: {
    fontSize: 12,
    fontWeight: '900',
  },
  locDelayChipGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  locDelayChipYellow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
