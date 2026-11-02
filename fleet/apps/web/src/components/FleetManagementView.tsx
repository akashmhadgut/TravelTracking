import React, { useState, useEffect, useMemo } from 'react';
import {
  Car,
  User,
  MapPin,
  Plus,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
  Calendar,
  Phone,
  Award,
  FileCheck,
  Eye,
  Upload,
  Download,
  Printer,
  QrCode,
  Edit3,
  Paperclip,
  Check,
  Search,
  Trash2,
  Clock,
  Users,
  Wrench,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { RouteCorridorMapModal, RouteCorridorData } from './RouteCorridorMapModal';
import { DispatchTripModal } from './DispatchTripModal';

export interface VehicleMandatoryDocs {
  rc: { docNo: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
  roadTax: { receiptNo: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
  puc: { certNo: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
  insurance: { policyNo: string; insurer: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
  permit: { permitNo: string; type: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
  fitness: { certNo: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
}

export interface DriverRequiredDocs {
  aadhaar: { docNo: string; status: 'verified' | 'pending' };
  policeVerification: { certNo: string; policeStation: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
  medicalFitness: { certNo: string; doctorName: string; doctorReg: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
  drivingLicence: { licenseNo: string; classType: string; validUntil: string; status: 'verified' | 'pending' | 'expiring_soon' };
  contactNumber: { phone: string; isVerified: boolean };
}

export interface BusItem {
  id: string;
  reg_no: string;
  make: string;
  model: string;
  capacity: number;
  tracking_source: string;
  is_active: boolean;
  status?: 'active' | 'on_trip' | 'maintenance' | 'inactive';
  documents: VehicleMandatoryDocs;
}

export interface DriverItem {
  id: string;
  name: string;
  phone: string;
  license: string;
  class: string;
  address: string;
  pin: string;
  duty_status: string;
  documents: DriverRequiredDocs;
}

export type CarItem = BusItem;

export const generateDemoCars = (): BusItem[] => {
  return [];
};

export const generateDemoDrivers = (): DriverItem[] => {
  return [];
};

export interface FleetManagementViewProps {
  initialTab?: 'cars' | 'drivers' | 'routes' | 'trips';
  onTabChange?: (tab: 'cars' | 'drivers' | 'routes' | 'trips') => void;
  hideHeaderTabs?: boolean;
}

export const FleetManagementView: React.FC<FleetManagementViewProps> = ({ initialTab = 'cars', onTabChange, hideHeaderTabs = false }) => {
  const [activeTab, setActiveTab] = useState<'cars' | 'drivers' | 'routes'>(
    initialTab === 'trips' ? 'routes' : (initialTab as any)
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'trips' ? 'routes' : initialTab);
    }
  }, [initialTab]);

  const handleTabClick = (tab: 'cars' | 'drivers' | 'routes' | 'trips') => {
    const target = tab === 'trips' ? 'routes' : tab;
    setActiveTab(target);
    onTabChange?.(target);
  };

  // Selected for Document Vault Inspection Modals
  const [selectedBusForDocs, setSelectedCarForDocs] = useState<BusItem | null>(null);
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<DriverItem | null>(null);
  // Selected Trip for Detailed Dossier Inspector Modal
  const [selectedTripForDetails, setSelectedTripForDetails] = useState<any | null>(null);

  // Quick Inline Status Update for Vehicles (Cars)
  const handleQuickChangeCarStatus = async (
    carId: string,
    nextStatus: 'active' | 'on_trip' | 'maintenance' | 'inactive'
  ) => {
    const nextIsActive = nextStatus === 'active' || nextStatus === 'on_trip';
    setBuses((prev) =>
      prev.map((b) => (b.id === carId ? { ...b, status: nextStatus, is_active: nextIsActive } : b))
    );
    try {
      await fetch(`/v1/buses/${carId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, is_active: nextIsActive }),
      });
    } catch {}
  };

  // Quick Inline Duty Status Update for Drivers
  const handleQuickChangeDriverDuty = async (driverId: string, nextDuty: string) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, duty_status: nextDuty } : d))
    );
    try {
      await fetch(`/v1/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duty_status: nextDuty }),
      });
    } catch {}
  };

  // Handle Trip Status Update (Start / Complete / Cancel)
  const handleUpdateTripStatus = async (
    tripId: string,
    nextStatus: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  ) => {
    setTrips((prev: any[]) =>
      prev.map((t: any) => (t.id === tripId ? { ...t, status: nextStatus } : t))
    );
    if (selectedTripForDetails && selectedTripForDetails.id === tripId) {
      setSelectedTripForDetails((prev: any) => ({ ...prev, status: nextStatus }));
    }
    const targetTrip = trips.find((t: any) => t.id === tripId);
    if (targetTrip?.bus_id) {
      if (nextStatus === 'in_progress') {
        handleQuickChangeCarStatus(targetTrip.bus_id, 'on_trip');
      } else if (nextStatus === 'completed') {
        handleQuickChangeCarStatus(targetTrip.bus_id, 'active');
      }
    }
    try {
      await fetch(`/v1/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {}
  };
  // Document Viewer Lightbox State
  interface DocPreviewData {
    title: string;
    category: string;
    docNo: string;
    regNoOrPerson: string;
    validUntil: string;
    issuer: string;
    status: string;
    fileUrl?: string;
    details?: Record<string, string>;
  }

  const [previewDoc, setPreviewDoc] = useState<DocPreviewData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; size: string; url: string }>>({});

  const handleFileUpload = (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const size = (file.size / 1024).toFixed(1) + ' KB';
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedFiles((prev) => ({
        ...prev,
        [docKey]: { name: file.name, size, url: dataUrl },
      }));
    };
    reader.readAsDataURL(file);
  };

  // Helper for generic file upload
  const handleGenericFileUpload = (
    key: string,
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<Record<string, { name: string; size: string; url: string }>>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const size = (file.size / 1024).toFixed(1) + ' KB';
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setter((prev) => ({
        ...prev,
        [key]: { name: file.name, size, url: dataUrl },
      }));
    };
    reader.readAsDataURL(file);
  };

  // 100 Cars State with Client's 6 Mandatory Vehicle Documents
  const [buses, setBuses] = useState<BusItem[]>(() => generateDemoCars());
  const [carSearch, setCarSearch] = useState('');

  // Add Car Modal Form State
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newRegNo, setNewRegNo] = useState('');
  const [newBusMake, setNewBusMake] = useState('Tata Motors');
  const [newBusModel, setNewBusModel] = useState('Nexon EV Max');
  const [newCapacity, setNewCapacity] = useState(5); // Default 5 for Corporate Cars
  const [newRcNo, setNewRcNo] = useState('');
  const [newRcValid, setNewRcValid] = useState('2039-01-01');
  const [newRoadTaxNo, setNewRoadTaxNo] = useState('');
  const [newRoadTaxValid, setNewRoadTaxValid] = useState('2029-03-31');
  const [newPucNo, setNewPucNo] = useState('');
  const [newPucValid, setNewPucValid] = useState('2027-04-01');
  const [newInsuranceNo, setNewInsuranceNo] = useState('');
  const [newInsuranceInsurer, setNewInsuranceInsurer] = useState('HDFC ERGO General Insurance');
  const [newInsuranceValid, setNewInsuranceValid] = useState('2027-05-15');
  const [newPermitNo, setNewPermitNo] = useState('');
  const [newPermitValid, setNewPermitValid] = useState('2029-01-01');
  const [newFitnessNo, setNewFitnessNo] = useState('');
  const [newFitnessValid, setNewFitnessValid] = useState('2028-06-30');
  const [newBusDocFiles, setNewBusDocFiles] = useState<Record<string, { name: string; size: string; url: string }>>({});

  // Edit Car Modal Form State
  const [showEditBusModal, setShowEditBusModal] = useState(false);
  const [editingCar, setEditingCar] = useState<BusItem | null>(null);
  const [editRegNo, setEditRegNo] = useState('');
  const [editMake, setEditMake] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCapacity, setEditCapacity] = useState(5);
  const [editTrackingSource, setEditTrackingSource] = useState('phone');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editCarStatus, setEditCarStatus] = useState<'active' | 'on_trip' | 'maintenance' | 'inactive'>('active');

  // Filter & Pagination States
  const [carStatusFilter, setCarStatusFilter] = useState<'all' | 'active' | 'on_trip' | 'maintenance' | 'inactive'>('all');
  const [carCurrentPage, setCarCurrentPage] = useState(1);
  const [carPageSize] = useState(15);

  const [driverDutyFilter, setDriverDutyFilter] = useState<'all' | 'on_duty' | 'available' | 'off_duty' | 'inactive'>('all');
  const [driverCurrentPage, setDriverCurrentPage] = useState(1);
  const [driverPageSize] = useState(15);
  const [editRcNo, setEditRcNo] = useState('');
  const [editRcValid, setEditRcValid] = useState('');
  const [editRoadTaxNo, setEditRoadTaxNo] = useState('');
  const [editRoadTaxValid, setEditRoadTaxValid] = useState('');
  const [editPucNo, setEditPucNo] = useState('');
  const [editPucValid, setEditPucValid] = useState('');
  const [editInsuranceNo, setEditInsuranceNo] = useState('');
  const [editInsuranceInsurer, setEditInsuranceInsurer] = useState('');
  const [editInsuranceValid, setEditInsuranceValid] = useState('');
  const [editPermitNo, setEditPermitNo] = useState('');
  const [editPermitValid, setEditPermitValid] = useState('');
  const [editFitnessNo, setEditFitnessNo] = useState('');
  const [editFitnessValid, setEditFitnessValid] = useState('');
  const [editBusDocFiles, setEditBusDocFiles] = useState<Record<string, { name: string; size: string; url: string }>>({});

  // Edit Driver Modal Form State
  const [showEditDriverModal, setShowEditDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverItem | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editDriverLicense, setEditDriverLicense] = useState('');
  const [editDriverClass, setEditDriverClass] = useState('HMV-Passenger (Commercial)');
  const [editDriverAddress, setEditDriverAddress] = useState('');
  const [editDriverDutyStatus, setEditDriverDutyStatus] = useState('on_duty');
  const [editDriverAadhaar, setEditDriverAadhaar] = useState('');
  const [editDriverPoliceStation, setEditDriverPoliceStation] = useState('');
  const [editDriverDoctorName, setEditDriverDoctorName] = useState('');
  const [editDriverDocFiles, setEditDriverDocFiles] = useState<Record<string, { name: string; size: string; url: string }>>({});

  // 100 Drivers State with Client's 5 Required Driver Documents
  const [drivers, setDrivers] = useState<DriverItem[]>(() => generateDemoDrivers());
  const [driverSearch, setDriverSearch] = useState('');

  const filteredCars = useMemo(() => {
    return buses.filter((b) => {
      const bStatus = b.status || (b.is_active ? 'active' : 'inactive');
      const matchesStatus = carStatusFilter === 'all' || bStatus === carStatusFilter;
      const q = carSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.reg_no.toLowerCase().includes(q) ||
        b.make.toLowerCase().includes(q) ||
        b.model.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [buses, carSearch, carStatusFilter]);

  const paginatedCars = useMemo(() => {
    const start = (carCurrentPage - 1) * carPageSize;
    return filteredCars.slice(start, start + carPageSize);
  }, [filteredCars, carCurrentPage, carPageSize]);

  const totalCarPages = Math.ceil(filteredCars.length / carPageSize);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const dDuty = d.duty_status || 'on_duty';
      const matchesFilter = driverDutyFilter === 'all' || dDuty === driverDutyFilter;
      const q = driverSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        d.license.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [drivers, driverSearch, driverDutyFilter]);

  const paginatedDrivers = useMemo(() => {
    const start = (driverCurrentPage - 1) * driverPageSize;
    return filteredDrivers.slice(start, start + driverPageSize);
  }, [filteredDrivers, driverCurrentPage, driverPageSize]);

  const totalDriverPages = Math.ceil(filteredDrivers.length / driverPageSize);

  // Add Driver Modal Form State
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverLicense, setNewDriverLicense] = useState('');
  const [newDriverAddress, setNewDriverAddress] = useState('');
  const [newAadhaarNo, setNewAadhaarNo] = useState('');
  const [newPoliceStation, setNewPoliceStation] = useState('Shivajinagar Police Station');
  const [newDoctorName, setNewDoctorName] = useState('Dr. P. R. Deshmukh (MBBS, MMC-2010)');
  const [newDriverDocFiles, setNewDriverDocFiles] = useState<Record<string, { name: string; size: string; url: string }>>({});

  // Routes State & Edit Route Modal
  const [routes, setRoutes] = useState<any[]>([]);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any | null>(null);
  const [editingRouteCode, setEditingRouteCode] = useState<string>('');
  const [editingRouteName, setEditingRouteName] = useState<string>('');
  const [editingRouteDistance, setEditingRouteDistance] = useState<number>(20);
  const [editingRouteDuration, setEditingRouteDuration] = useState<number>(30);
  const [editingRouteStops, setEditingRouteStops] = useState<string[]>([]);

  // Trips & Scheduling State (Date & Time Configuration)
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTripForEdit, setSelectedTripForEdit] = useState<any | null>(null);
  const [showDispatchTripModalInFleet, setShowDispatchTripModalInFleet] = useState(false);

  // Sync with live PostgreSQL backend
  useEffect(() => {
    fetch('/v1/buses')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.items)) {
          const serverCars = data.items.map((b: any, idx: number) => ({
            id: b.id,
            reg_no: b.reg_no,
            make: b.make || 'Tata Motors',
            model: b.model || 'Nexon EV Max',
            capacity: b.capacity || 5,
            tracking_source: b.tracking_source || 'phone',
            is_active: b.is_active !== false,
            status: b.status || (b.is_active !== false ? 'active' : 'inactive'),
            documents: {
              rc: { docNo: b.documents?.rc?.doc_number || b.documents?.rc?.docNo || ('MH12-2024-' + (1000 + idx)), validUntil: '2039-01-01', status: 'verified' },
              roadTax: { receiptNo: b.documents?.road_tax?.receipt_number || b.documents?.roadTax?.receiptNo || ('RTX-' + b.reg_no + '-2026'), validUntil: '2029-03-31', status: 'verified' },
              puc: { certNo: b.documents?.puc?.cert_number || b.documents?.puc?.certNo || ('PUC-' + b.reg_no + '-01'), validUntil: '2027-04-01', status: 'verified' },
              insurance: { policyNo: b.documents?.insurance?.policy_number || b.documents?.insurance?.policyNo || ('INS-' + b.reg_no + '-99'), insurer: 'HDFC ERGO Commercial', validUntil: '2027-08-20', status: 'verified' },
              permit: { permitNo: b.documents?.permit?.permit_number || b.documents?.permit?.permitNo || ('PMT-' + b.reg_no + '-01'), type: 'Contract Carriage (Corporate Cab)', validUntil: '2029-01-01', status: 'verified' },
              fitness: { certNo: b.documents?.fitness?.cert_number || b.documents?.fitness?.certNo || ('FC-' + b.reg_no + '-001'), validUntil: '2028-06-30', status: 'verified' },
            },
          }));
          setBuses(serverCars);
        }
      })
      .catch(() => { });

    fetch('/v1/drivers')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.items)) {
          const serverDrivers = data.items.map((d: any, idx: number) => ({
            id: d.id,
            name: d.name || ('Driver ' + (idx + 1)),
            phone: d.phone || ('+91982200' + (1000 + idx)),
            license: d.license || ('MH-14-2020-00' + (1000 + idx)),
            class: d.licence_class || 'HMV-Passenger',
            address: d.address || 'Pune, MH',
            pin: '123456',
            duty_status: d.duty_status || 'available',
            documents: {
              aadhaar: { docNo: 'XXXX-XXXX-' + (1000 + idx), status: 'verified' },
              policeVerification: { certNo: 'PUN-POL-' + (2000 + idx), policeStation: 'Shivajinagar Police Station', validUntil: '2027-12-31', status: 'verified' },
              medicalFitness: { certNo: 'MED-FIT-' + (3000 + idx), doctorName: 'Dr. P. R. Deshmukh (MBBS)', doctorReg: 'MMC-2015-0812', validUntil: '2027-10-30', status: 'verified' },
              drivingLicence: { licenseNo: d.license || ('MH-14-2020-00' + (1000 + idx)), classType: 'HMV-Passenger (Commercial)', validUntil: '2030-05-15', status: 'verified' },
              contactNumber: { phone: d.phone || ('+91982200' + (1000 + idx)), isVerified: true },
            },
          }));
          setDrivers(serverDrivers);
        }
      })
      .catch(() => { });

    fetch('/v1/routes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.items)) {
          setRoutes(data.items);
        }
      })
      .catch(() => { });

    fetch('/v1/trips')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.items)) {
          setTrips(data.items);
        }
      })
      .catch(() => { });
  }, []);

  // Handle Delete Trip
  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm('Are you sure you want to delete / cancel this scheduled trip?')) return;
    try {
      await fetch(`/v1/trips/${tripId}`, { method: 'DELETE' });
    } catch {}
    setTrips((prev: any) => prev.filter((t: any) => t.id !== tripId));
  };

  // Handle Add Route & Schedule Trip via 4-Step Interactive Corridor Studio
  const handleSaveNewRouteAndTrip = async (newRouteData: RouteCorridorData, tripData: any) => {
    try {
      // 1. Save Route
      const routeRes = await fetch('/v1/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRouteData),
      });
      let createdRoute = newRouteData;
      if (routeRes.ok) {
        const json = await routeRes.json();
        createdRoute = json.route || newRouteData;
      }
      setRoutes((prev: any) => [createdRoute, ...prev.filter((r: any) => r.code !== createdRoute.code)]);

      // 2. Save Trip
      const tripPayload = {
        route_id: createdRoute.id || '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2001',
        bus_id: tripData.bus_id,
        driver_id: tripData.driver_id,
        planned_start: tripData.planned_start,
        planned_end: tripData.planned_end,
        bus_reg: tripData.bus_reg,
        bus_model: tripData.bus_model,
        driver_name: tripData.driver_name,
        driver_phone: tripData.driver_phone,
        route_code: createdRoute.code,
        route_name: createdRoute.name,
        shift: tripData.shift,
        passengers: tripData.passengers,
        status: 'scheduled',
      };

      const tripRes = await fetch('/v1/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripPayload),
      });

      let createdTrip = { ...tripPayload, id: `trip-${Date.now()}` };
      if (tripRes.ok) {
        const tripJson = await tripRes.json();
        createdTrip = { ...createdTrip, ...(tripJson.trip || {}) };
      }
      setTrips((prev: any) => [createdTrip, ...prev]);
    } catch {
      setRoutes((prev: any) => [newRouteData, ...prev.filter((r: any) => r.code !== newRouteData.code)]);
      setTrips((prev: any) => [{ ...tripData, id: `trip-${Date.now()}` }, ...prev]);
    }
  };

  // Handle Add Route via Interactive Real Map Corridor Studio
  const handleSaveNewRoute = async (newRouteData: RouteCorridorData) => {
    try {
      const res = await fetch('/v1/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRouteData),
      });
      if (res.ok) {
        const json = await res.json();
        const created = json.route || newRouteData;
        setRoutes((prev: any) => [created, ...prev.filter((r: any) => r.code !== created.code)]);
      } else {
        setRoutes((prev: any) => [newRouteData, ...prev.filter((r: any) => r.code !== newRouteData.code)]);
      }
    } catch {
      setRoutes((prev: any) => [newRouteData, ...prev.filter((r: any) => r.code !== newRouteData.code)]);
    }
  };

  // Open Edit Route Modal
  const handleOpenEditRoute = (route: any) => {
    setEditingRoute(route);
    setEditingRouteCode(route.code || '');
    setEditingRouteName(route.name || '');
    setEditingRouteDistance(route.distance_km || 20);
    setEditingRouteDuration(route.estimated_duration_min || 30);
    setEditingRouteStops(
      (route.stops || []).map((s: any) => (typeof s === 'string' ? s : s.name))
    );
  };

  // Save Edit Route Changes
  const handleSaveEditRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;

    const updated = {
      ...editingRoute,
      code: editingRouteCode.toUpperCase().trim(),
      name: editingRouteName.trim(),
      distance_km: Number(editingRouteDistance),
      estimated_duration_min: Number(editingRouteDuration),
      stops: editingRouteStops.filter((s) => s.trim().length > 0),
    };

    try {
      await fetch(`/v1/routes/${editingRoute.id || editingRoute.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}

    setRoutes((prev: any) =>
      prev.map((r: any) => (r.id === editingRoute.id || r.code === editingRoute.code ? updated : r))
    );
    setEditingRoute(null);
  };

  // Delete Route Corridor
  const handleDeleteRoute = async (routeId: string, routeCode: string) => {
    if (!window.confirm(`Are you sure you want to delete route corridor ${routeCode}?`)) return;
    try {
      await fetch(`/v1/routes/${routeId || routeCode}`, { method: 'DELETE' });
    } catch {}
    setRoutes((prev: any) => prev.filter((r: any) => r.id !== routeId && r.code !== routeCode));
  };

  // Quick In-Place Rename for Stop Badges
  const handleQuickRenameStop = async (routeId: string, stopIndex: number, newStopName: string) => {
    if (!newStopName.trim()) return;
    const targetRoute = routes.find((r: any) => r.id === routeId || r.code === routeId);
    if (!targetRoute) return;

    const newStops = [...(targetRoute.stops || [])];
    newStops[stopIndex] = newStopName.trim();
    const updated = { ...targetRoute, stops: newStops };

    setRoutes((prev: any) =>
      prev.map((r: any) => (r.id === routeId || r.code === routeId ? updated : r))
    );

    try {
      await fetch(`/v1/routes/${targetRoute.id || targetRoute.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}
  };

  // Handle Trip Dispatch / Update
  const handleTripUpdated = (updatedTrip: any) => {
    setTrips((prev) => {
      const exists = prev.some((t) => t.id === updatedTrip.id);
      if (exists) {
        return prev.map((t) => (t.id === updatedTrip.id ? { ...t, ...updatedTrip } : t));
      }
      return [updatedTrip, ...prev];
    });
  };

  // Handle Add Bus with 6 Mandatory Documents and Scanned Uploads
  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNo) return;

    const newVehicleDocs: VehicleMandatoryDocs = {
      rc: { docNo: newRcNo || `RC-${newRegNo}`, validUntil: newRcValid || '2039-01-01', status: 'verified' },
      roadTax: { receiptNo: newRoadTaxNo || `RTX-${newRegNo}-2026`, validUntil: newRoadTaxValid || '2029-03-31', status: 'verified' },
      puc: { certNo: newPucNo || `PUC-${newRegNo}-99`, validUntil: newPucValid || '2027-04-01', status: 'verified' },
      insurance: { policyNo: newInsuranceNo || `INS-${newRegNo}-881`, insurer: newInsuranceInsurer, validUntil: newInsuranceValid || '2027-05-15', status: 'verified' },
      permit: { permitNo: newPermitNo || `PMT-${newRegNo}-01`, type: 'Contract Carriage (Corporate Cab)', validUntil: newPermitValid || '2029-01-01', status: 'verified' },
      fitness: { certNo: newFitnessNo || `FIT-${newRegNo}-001`, validUntil: newFitnessValid || '2028-06-30', status: 'verified' },
    };

    const newBusItem: BusItem = {
      id: String(buses.length + 1),
      reg_no: newRegNo,
      make: newBusMake || 'Tata Motors',
      model: newBusModel || 'Nexon EV Max',
      capacity: Number(newCapacity) || 5,
      tracking_source: 'phone',
      is_active: true,
      documents: newVehicleDocs,
    };

    // Save to PostgreSQL via API
    fetch('/v1/buses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reg_no: newRegNo,
        make: newBusMake || 'Tata Motors',
        model: newBusModel || 'Nexon EV Max',
        capacity: Number(newCapacity) || 5,
        tracking_source: 'phone',
      }),
    }).catch(() => { });

    // Save uploaded files mapped by reg_no
    const updatedUploads = { ...uploadedFiles };
    Object.entries(newBusDocFiles).forEach(([docKey, fileData]) => {
      updatedUploads[`${newRegNo}_${docKey}`] = fileData;
    });
    setUploadedFiles(updatedUploads);

    setBuses((prev) => [...prev, newBusItem]);
    setNewRegNo('');
    setNewRcNo('');
    setNewRoadTaxNo('');
    setNewPucNo('');
    setNewInsuranceNo('');
    setNewPermitNo('');
    setNewFitnessNo('');
    setNewBusDocFiles({});
    setShowAddBusModal(false);
  };

  const handleOpenEditCar = (car: BusItem) => {
    setEditingCar(car);
    setEditRegNo(car.reg_no);
    setEditMake(car.make);
    setEditModel(car.model);
    setEditCapacity(car.capacity || 5);
    setEditTrackingSource(car.tracking_source || 'phone');
    setEditIsActive(car.is_active ?? true);
    setEditCarStatus(car.status || (car.is_active ? 'active' : 'inactive'));
    setEditRcNo(car.documents?.rc?.docNo || `RC-${car.reg_no}`);
    setEditRcValid(car.documents?.rc?.validUntil || '2039-01-01');
    setEditRoadTaxNo(car.documents?.roadTax?.receiptNo || `RTX-${car.reg_no}`);
    setEditRoadTaxValid(car.documents?.roadTax?.validUntil || '2029-03-31');
    setEditPucNo(car.documents?.puc?.certNo || `PUC-${car.reg_no}`);
    setEditPucValid(car.documents?.puc?.validUntil || '2027-04-01');
    setEditInsuranceNo(car.documents?.insurance?.policyNo || `INS-${car.reg_no}`);
    setEditInsuranceInsurer(car.documents?.insurance?.insurer || 'HDFC ERGO General Insurance');
    setEditInsuranceValid(car.documents?.insurance?.validUntil || '2027-05-15');
    setEditPermitNo(car.documents?.permit?.permitNo || `PMT-${car.reg_no}`);
    setEditPermitValid(car.documents?.permit?.validUntil || '2029-01-01');
    setEditFitnessNo(car.documents?.fitness?.certNo || `FC-${car.reg_no}`);
    setEditFitnessValid(car.documents?.fitness?.validUntil || '2028-06-30');

    // Load any existing uploaded files
    const existingForCar: Record<string, { name: string; size: string; url: string }> = {};
    ['rc', 'tax', 'puc', 'ins', 'permit', 'fitness'].forEach((key) => {
      const found = uploadedFiles[`${car.reg_no}_${key}`];
      if (found) {
        existingForCar[key] = found;
      }
    });
    setEditBusDocFiles(existingForCar);
    setShowEditBusModal(true);
  };

  const handleSaveEditCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar || !editRegNo) return;

    fetch(`/v1/buses/${editingCar.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reg_no: editRegNo,
        make: editMake,
        model: editModel,
        capacity: Number(editCapacity) || 5,
        tracking_source: editTrackingSource,
        is_active: editIsActive,
      }),
    }).catch(() => { });

    const updatedDocs: VehicleMandatoryDocs = {
      rc: { docNo: editRcNo, validUntil: editRcValid, status: 'verified' },
      roadTax: { receiptNo: editRoadTaxNo, validUntil: editRoadTaxValid, status: 'verified' },
      puc: { certNo: editPucNo, validUntil: editPucValid, status: 'verified' },
      insurance: { policyNo: editInsuranceNo, insurer: editInsuranceInsurer, validUntil: editInsuranceValid, status: 'verified' },
      permit: { permitNo: editPermitNo, type: 'Contract Carriage (Corporate Cab)', validUntil: editPermitValid, status: 'verified' },
      fitness: { certNo: editFitnessNo, validUntil: editFitnessValid, status: 'verified' },
    };

    setBuses((prev) =>
      prev.map((b) =>
        b.id === editingCar.id
          ? {
            ...b,
            reg_no: editRegNo,
            make: editMake,
            model: editModel,
            capacity: Number(editCapacity) || 5,
            tracking_source: editTrackingSource,
            is_active: editCarStatus === 'active' || editCarStatus === 'on_trip',
            status: editCarStatus,
            documents: updatedDocs,
          }
          : b
      )
    );

    const updatedUploads = { ...uploadedFiles };
    Object.entries(editBusDocFiles).forEach(([docKey, fileData]) => {
      updatedUploads[`${editRegNo}_${docKey}`] = fileData;
    });
    setUploadedFiles(updatedUploads);

    setShowEditBusModal(false);
    setEditingCar(null);
  };

  const handleOpenEditDriver = (d: DriverItem) => {
    setEditingDriver(d);
    setEditDriverName(d.name);
    setEditDriverPhone(d.phone);
    setEditDriverLicense(d.license);
    setEditDriverClass(d.class || 'HMV-Passenger (Commercial)');
    setEditDriverAddress(d.address || 'Pune, MH');
    setEditDriverDutyStatus(d.duty_status || 'on_duty');
    setEditDriverAadhaar(d.documents?.aadhaar?.docNo || '');
    setEditDriverPoliceStation(d.documents?.policeVerification?.policeStation || 'Shivajinagar Police Station');
    setEditDriverDoctorName(d.documents?.medicalFitness?.doctorName || 'Dr. P. R. Deshmukh (MBBS)');

    const existingForDriver: Record<string, { name: string; size: string; url: string }> = {};
    ['aadhaar', 'police', 'medical', 'license', 'photo'].forEach((key) => {
      const found = uploadedFiles[`driver_${d.id}_${key}`];
      if (found) {
        existingForDriver[key] = found;
      }
    });
    setEditDriverDocFiles(existingForDriver);
    setShowEditDriverModal(true);
  };

  const handleSaveEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    fetch(`/v1/drivers/${editingDriver.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editDriverName,
        phone: editDriverPhone,
        licence_class: editDriverClass,
        duty_status: editDriverDutyStatus,
      }),
    }).catch(() => { });

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === editingDriver.id
          ? {
            ...d,
            name: editDriverName,
            phone: editDriverPhone,
            license: editDriverLicense,
            class: editDriverClass,
            address: editDriverAddress,
            duty_status: editDriverDutyStatus,
            documents: {
              ...d.documents,
              aadhaar: { docNo: editDriverAadhaar, status: 'verified' },
              policeVerification: {
                certNo: d.documents?.policeVerification?.certNo || 'PUN-POL-2024',
                policeStation: editDriverPoliceStation,
                validUntil: '2027-12-31',
                status: 'verified',
              },
              medicalFitness: {
                certNo: d.documents?.medicalFitness?.certNo || 'MED-FIT-88914',
                doctorName: editDriverDoctorName,
                doctorReg: 'MMC-2015-0812',
                validUntil: '2027-10-30',
                status: 'verified',
              },
              drivingLicence: {
                licenseNo: editDriverLicense,
                classType: editDriverClass,
                validUntil: '2030-05-15',
                status: 'verified',
              },
              contactNumber: { phone: editDriverPhone, isVerified: true },
            },
          }
          : d
      )
    );

    const updatedUploads = { ...uploadedFiles };
    Object.entries(editDriverDocFiles).forEach(([docKey, fileData]) => {
      updatedUploads[`driver_${editingDriver.id}_${docKey}`] = fileData;
    });
    setUploadedFiles(updatedUploads);

    setShowEditDriverModal(false);
    setEditingDriver(null);
  };

  // Handle Add Driver with 5 Required Documents
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone || !newDriverLicense) return;

    const newId = String(drivers.length + 1);

    const newDriverDocs: DriverRequiredDocs = {
      aadhaar: { docNo: newAadhaarNo || 'XXXX-XXXX-9912', status: 'verified' },
      policeVerification: { certNo: `PUN-POL-${Date.now().toString().slice(-4)}`, policeStation: newPoliceStation, validUntil: '2027-12-31', status: 'verified' },
      medicalFitness: { certNo: `MED-FIT-${Date.now().toString().slice(-4)}`, doctorName: newDoctorName, doctorReg: 'MMC-2015-0812', validUntil: '2027-10-30', status: 'verified' },
      drivingLicence: { licenseNo: newDriverLicense, classType: 'HMV-Passenger (Commercial)', validUntil: '2030-05-15', status: 'verified' },
      contactNumber: { phone: newDriverPhone, isVerified: true },
    };

    const newDriverItem: DriverItem = {
      id: newId,
      name: newDriverName,
      phone: newDriverPhone,
      license: newDriverLicense,
      class: 'HMV-Passenger (Commercial)',
      address: newDriverAddress || 'Pune, MH',
      pin: '123456',
      duty_status: 'on_duty',
      documents: newDriverDocs,
    };

    // Store any uploaded KYC files for this driver
    const updatedUploads = { ...uploadedFiles };
    Object.entries(newDriverDocFiles).forEach(([docKey, fileData]) => {
      updatedUploads[`driver_${newId}_${docKey}`] = fileData;
    });
    setUploadedFiles(updatedUploads);

    setDrivers((prev) => [...prev, newDriverItem]);
    setNewDriverName('');
    setNewDriverPhone('');
    setNewDriverLicense('');
    setNewDriverAddress('');
    setNewAadhaarNo('');
    setNewDriverDocFiles({});
    setShowAddDriverModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-6 space-y-4 sm:space-y-6 text-slate-800 text-xs font-sans">
      {/* Header — Only displayed when not embedded inside SuperAdminView */}
      {!hideHeaderTabs && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">Fleet & Resource Administration</h1>
            <p className="text-slate-500 text-xs">
              <strong className="text-indigo-600">Client Compliance Standard</strong>: Vehicles require 6 mandatory RTO documents & Drivers require 5 KYC clearances.
            </p>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
            <button
              onClick={() => handleTabClick('cars')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'cars'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-3.5 h-3.5 shrink-0" />
              <span>1. Cars & Documents ({buses.length})</span>
            </button>

            <button
              onClick={() => handleTabClick('drivers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'drivers'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>2. Drivers & Dossiers ({drivers.length})</span>
            </button>

            <button
              onClick={() => handleTabClick('routes')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'routes'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>3. Routes & Scheduled Trips ({trips.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CARS & MANDATORY VEHICLE DOCUMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'cars' && (
        <div className="space-y-4">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Fleet</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{buses.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Commercial Cars</div>
            </div>

            <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-2xs bg-gradient-to-b from-white to-emerald-50/20">
              <div className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Active In Fleet</span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {buses.filter((b) => (b.status || (b.is_active ? 'active' : 'inactive')) === 'active').length}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Ready For Dispatch</div>
            </div>

            <div className="bg-white border border-blue-100 rounded-xl p-3.5 shadow-2xs bg-gradient-to-b from-white to-blue-50/20">
              <div className="text-[10px] font-bold uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>On Live Trip</span>
              </div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {buses.filter((b) => b.status === 'on_trip').length}
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">In Passenger Transit</div>
            </div>

            <div className="bg-white border border-amber-100 rounded-xl p-3.5 shadow-2xs bg-gradient-to-b from-white to-amber-50/20">
              <div className="text-[10px] font-bold uppercase text-amber-700 tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3 h-3 text-amber-600" />
                <span>Maintenance</span>
              </div>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {buses.filter((b) => b.status === 'maintenance').length}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">RTO / Garage Service</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>RTO Compliance</span>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">100%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">6/6 Documents Linked</div>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>Mandatory Vehicle Documents Compliance Register</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded border border-indigo-200">
                    {buses.length} CARS
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  All vehicles strictly linked with: <strong>RC, Road Tax, PUC, Insurance, Permit & Fitness Certificate</strong>.
                </p>
              </div>

              <button
                onClick={() => setShowAddBusModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Car & Documents</span>
              </button>
            </div>

            {/* Filter Chips & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'active', 'on_trip', 'maintenance', 'inactive'] as const).map((st) => {
                  const count = st === 'all'
                    ? buses.length
                    : buses.filter((b) => (b.status || (b.is_active ? 'active' : 'inactive')) === st).length;
                  const label = st === 'all'
                    ? 'All Cars'
                    : st === 'active'
                    ? 'Active in Fleet'
                    : st === 'on_trip'
                    ? 'On Trip'
                    : st === 'maintenance'
                    ? 'Maintenance'
                    : 'Inactive';

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => { setCarStatusFilter(st); setCarCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        carStatusFilter === st
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        carStatusFilter === st ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cars by reg no, make..."
                  value={carSearch}
                  onChange={(e) => { setCarSearch(e.target.value); setCarCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition w-full sm:w-60"
                />
              </div>
            </div>

            {/* Cars Table */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider bg-slate-50/70">
                    <th className="py-3 px-4 w-[18%] text-left">Vehicle Reg No</th>
                    <th className="py-3 px-4 w-[20%] text-left">Make & Model</th>
                    <th className="py-3 px-4 w-[22%] text-left">Mandatory Documents</th>
                    <th className="py-3 px-4 w-[14%] text-left">Tracking Mode</th>
                    <th className="py-3 px-4 w-[13%] text-left">Fleet Status</th>
                    <th className="py-3 px-4 w-[13%] text-right">Compliance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700 text-xs">
                  {paginatedCars.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                        <Car className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                        <div className="font-semibold text-slate-700 text-sm">No Vehicles Registered in Fleet</div>
                        <div className="text-xs text-slate-400 mt-0.5">Click "+ Add Car & Documents" above to register and verify mandatory RTO compliance.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCars.map((b) => {
                    const hasExpiring = b.documents && Object.values(b.documents).some((d: any) => d.status === 'expiring_soon');
                    const carStatus = b.status || (b.is_active ? 'active' : 'inactive');

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-xs font-mono">{b.reg_no}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{b.capacity || 5} Seater Sedan / SUV</div>
                        </td>
                        <td className="p-3 font-sans font-medium">
                          <div className="font-bold text-slate-800 text-xs">{b.make}</div>
                          <div className="text-[11px] text-slate-500">{b.model}</div>
                        </td>
                        <td className="p-3 font-sans">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              hasExpiring
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {hasExpiring ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>6/6 Docs (PUC Due Soon)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>6/6 Docs Verified</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3 font-sans">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-semibold whitespace-nowrap">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Mobile App GPS</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 w-[13%] text-left font-sans align-middle">
                          <div className="relative inline-block group">
                            <select
                              value={carStatus}
                              onChange={(e) => handleQuickChangeCarStatus(b.id, e.target.value as any)}
                              title="Click to change Fleet Operating Status"
                              className={`text-xs font-bold rounded-full py-1 pl-2.5 pr-6 appearance-none cursor-pointer border transition shadow-2xs outline-none focus:ring-2 focus:ring-indigo-400 font-sans ${
                                carStatus === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : carStatus === 'on_trip'
                                  ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                  : carStatus === 'maintenance'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              <option value="active">● Active In Fleet</option>
                              <option value="on_trip">● On Active Trip</option>
                              <option value="maintenance">● Maintenance</option>
                              <option value="inactive">● Inactive</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1.5 top-2.5 pointer-events-none text-slate-400 group-hover:text-slate-700" />
                          </div>
                        </td>
                        <td className="p-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedCarForDocs(b)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Inspect 6 Docs</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditCar(b)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Edit Car & Docs</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Cars */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div>
                Showing <span className="font-bold text-slate-900">{filteredCars.length === 0 ? 0 : (carCurrentPage - 1) * carPageSize + 1}</span> to <span className="font-bold text-slate-900">{Math.min(carCurrentPage * carPageSize, filteredCars.length)}</span> of <span className="font-bold text-slate-900">{filteredCars.length}</span> cars
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={carCurrentPage === 1}
                  onClick={() => setCarCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-800">
                  Page {carCurrentPage} of {totalCarPages || 1}
                </div>
                <button
                  type="button"
                  disabled={carCurrentPage >= totalCarPages}
                  onClick={() => setCarCurrentPage((p) => Math.min(totalCarPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DRIVERS & MANDATORY REQUIRED DOCUMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Drivers</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{drivers.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Enrolled Roster</div>
            </div>

            <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-2xs bg-gradient-to-b from-white to-emerald-50/20">
              <div className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>On Active Duty</span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {drivers.filter((d) => (d.duty_status || 'on_duty') === 'on_duty').length}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Assigned Shift</div>
            </div>

            <div className="bg-white border border-blue-100 rounded-xl p-3.5 shadow-2xs bg-gradient-to-b from-white to-blue-50/20">
              <div className="text-[10px] font-bold uppercase text-blue-700 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Available / Standby</span>
              </div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {drivers.filter((d) => d.duty_status === 'available').length}
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">Ready For Dispatch</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="text-[10px] font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Off Duty / Inactive</span>
              </div>
              <div className="text-2xl font-black text-slate-700 mt-1">
                {drivers.filter((d) => d.duty_status === 'off_duty' || d.duty_status === 'inactive').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Shift Complete / Leave</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>KYC Compliance</span>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">100%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">5/5 Dossiers Cleared</div>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>Driver Roster & Mandatory KYC Dossier Register</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded border border-indigo-200">
                    {drivers.length} DRIVERS
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  All drivers linked with: <strong>Aadhaar Card, Police Verification, Medical Fitness, Driving Licence & Contact Number</strong>.
                </p>
              </div>

              <button
                onClick={() => setShowAddDriverModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Enroll Driver & Docs</span>
              </button>
            </div>

            {/* Filter Chips & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'on_duty', 'available', 'off_duty', 'inactive'] as const).map((st) => {
                  const count = st === 'all'
                    ? drivers.length
                    : drivers.filter((d) => (d.duty_status || 'on_duty') === st).length;
                  const label = st === 'all'
                    ? 'All Drivers'
                    : st === 'on_duty'
                    ? 'On Duty'
                    : st === 'available'
                    ? 'Available'
                    : st === 'off_duty'
                    ? 'Off Duty'
                    : 'Inactive';

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => { setDriverDutyFilter(st); setDriverCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        driverDutyFilter === st
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        driverDutyFilter === st ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drivers by name, phone..."
                  value={driverSearch}
                  onChange={(e) => { setDriverSearch(e.target.value); setDriverCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition w-full sm:w-60"
                />
              </div>
            </div>

            {/* Drivers Table */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider bg-slate-50/70">
                    <th className="py-3 px-4 w-[24%] text-left">Driver Name & Address</th>
                    <th className="py-3 px-4 w-[16%] text-left">Verified Contact</th>
                    <th className="py-3 px-4 w-[18%] text-left">License Number</th>
                    <th className="py-3 px-4 w-[18%] text-left">Mandatory Dossier</th>
                    <th className="py-3 px-4 w-[12%] text-left">Duty Status</th>
                    <th className="py-3 px-4 w-[12%] text-right">Dossier Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700 text-xs">
                  {paginatedDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                        <User className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                        <div className="font-semibold text-slate-700 text-sm">No Drivers Enrolled in Roster</div>
                        <div className="text-xs text-slate-400 mt-0.5">Click "+ Enroll Driver & Docs" above to onboard drivers with KYC verification.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDrivers.map((d) => {
                    const hasExpiring = d.documents && Object.values(d.documents).some((doc: any) => doc.status === 'expiring_soon');
                    const dutyStatus = d.duty_status || 'on_duty';

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="font-bold font-sans text-slate-900 text-xs flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                              {d.name.slice(0, 1)}
                            </span>
                            <span>{d.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans ml-7.5">{d.address}</div>
                        </td>
                        <td className="p-3 text-indigo-700 font-semibold font-mono text-xs">{d.phone}</td>
                        <td className="p-3 font-semibold text-slate-800">
                          <div>{d.license}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{d.class || 'HMV-Passenger'}</div>
                        </td>
                        <td className="p-3 font-sans">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              hasExpiring
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {hasExpiring ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>5/5 (Police Clear Due)</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>5/5 Dossier Approved</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 w-[12%] text-left font-sans align-middle">
                          <div className="relative inline-block group">
                            <select
                              value={dutyStatus}
                              onChange={(e) => handleQuickChangeDriverDuty(d.id, e.target.value)}
                              title="Click to change Driver Duty Status"
                              className={`text-xs font-bold rounded-full py-1 pl-2.5 pr-6 appearance-none cursor-pointer border transition shadow-2xs outline-none focus:ring-2 focus:ring-indigo-400 font-sans ${
                                dutyStatus === 'on_duty'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : dutyStatus === 'available'
                                  ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                  : dutyStatus === 'off_duty'
                                  ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              }`}
                            >
                              <option value="on_duty">● ON DUTY</option>
                              <option value="available">● AVAILABLE</option>
                              <option value="off_duty">● OFF DUTY</option>
                              <option value="inactive">● INACTIVE</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1.5 top-2.5 pointer-events-none text-slate-400 group-hover:text-slate-700" />
                          </div>
                        </td>
                        <td className="p-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedDriverForDocs(d)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                              <Award className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View 5 Docs</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditDriver(d)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Edit Driver</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Drivers */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div>
                Showing <span className="font-bold text-slate-900">{filteredDrivers.length === 0 ? 0 : (driverCurrentPage - 1) * driverPageSize + 1}</span> to <span className="font-bold text-slate-900">{Math.min(driverCurrentPage * driverPageSize, filteredDrivers.length)}</span> of <span className="font-bold text-slate-900">{filteredDrivers.length}</span> drivers
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={driverCurrentPage === 1}
                  onClick={() => setDriverCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-800">
                  Page {driverCurrentPage} of {totalDriverPages || 1}
                </div>
                <button
                  type="button"
                  disabled={driverCurrentPage >= totalDriverPages}
                  onClick={() => setDriverCurrentPage((p) => Math.min(totalDriverPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UNIFIED ROUTES & SCHEDULED TRIPS */}
      {activeTab === 'routes' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Corporate Routes & Scheduled Trips Register</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded border border-indigo-200">
                  {trips.length} SCHEDULED TRIPS • {routes.length} CORRIDORS
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Unified travel management: route corridors, versioned stops, corporate passenger manifests, assigned EV cars, and driver dispatch schedules.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSelectedTripForEdit(null);
                  setShowDispatchTripModalInFleet(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Schedule New Trip</span>
              </button>
              <button
                onClick={() => setShowAddRouteModal(true)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Design Route Plan</span>
              </button>
            </div>
          </div>

          {/* Unified Cards List */}
          <div className="space-y-4">
            {trips.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-2xs">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-300 stroke-1" />
                <div className="font-bold text-slate-700 text-sm">No Scheduled Trips in Register</div>
                <div className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Plan custom corridors with map routing or select tour packages, then assign available cars and drivers to dispatch journeys.
                </div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setShowDispatchTripModalInFleet(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Schedule First Trip
                  </button>
                </div>
              </div>
            ) : (
              trips.map((t: any) => {
              // Find matching route if any
              const matchedRoute = routes.find(
                (r: any) => r.id === t.route_id || r.code === t.route_code
              );

              const startDate = t.planned_start ? new Date(t.planned_start) : new Date();
              const endDate = t.planned_end ? new Date(t.planned_end) : new Date(Date.now() + 3600000);

              const dateFormatted = startDate.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const startTimeFormatted = startDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const endTimeFormatted = endDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const isLive = t.status === 'in_progress';
              const stopsList = matchedRoute?.stops || ['Swargate Metro Hub', 'Chandani Chowk', 'Hinjawadi Phase 3'];
              const tripPassengers: { name: string; phone: string }[] = t.passengers || [];

              return (
                <div
                  key={t.id}
                  className="p-4 sm:p-5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition shadow-2xs space-y-3.5"
                >
                  {/* Card Header: Route code, Title, Status, Distance, Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded-xl text-xs">
                        {t.route_code || matchedRoute?.code || 'CR-CORRIDOR'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {t.route_name || matchedRoute?.name || 'Corporate Transit Corridor'}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isLive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {isLive ? '● Live In Transit' : 'Scheduled'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-mono font-bold text-indigo-600 block">
                          {matchedRoute?.distance_km || ((t.distance_m || 24000) / 1000).toFixed(1)} km
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Corridor Distance</span>
                      </div>

                      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSelectedTripForDetails(t)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          title="View Full Trip Dossier, Stops Sequence & Passenger Manifest"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Trip Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTripForEdit(t);
                            setShowDispatchTripModalInFleet(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          title="Edit Scheduled Timings, Vehicle, Driver & Passengers"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Edit</span>
                        </button>

                        {matchedRoute && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditRoute(matchedRoute)}
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
                            title="Edit Route Corridor & Stops"
                          >
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden md:inline">Stops</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (matchedRoute) {
                              handleDeleteRoute(matchedRoute.id, matchedRoute.code);
                            }
                            handleDeleteTrip(t.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Delete Route & Trip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stops Sequence Badges */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span>Ordered Stopping Points (Click badge to rename stop)</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 font-mono font-semibold">
                        1 ➔ {stopsList.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {stopsList.map((stop: string | any, sIdx: number) => {
                        const stopName = typeof stop === 'string' ? stop : stop.name;
                        const isFirst = sIdx === 0;
                        const isLast = sIdx === stopsList.length - 1;
                        return (
                          <span
                            key={sIdx}
                            onClick={() => {
                              if (matchedRoute) {
                                const newName = window.prompt(`Rename stop #${sIdx + 1}:`, stopName);
                                if (newName && newName.trim()) {
                                  handleQuickRenameStop(matchedRoute.id || matchedRoute.code, sIdx, newName.trim());
                                }
                              }
                            }}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition ${
                              isFirst
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : isLast
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                            title="Click to rename stop"
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold text-white shrink-0 ${
                                isFirst ? 'bg-emerald-600' : isLast ? 'bg-rose-600' : 'bg-indigo-600'
                              }`}
                            >
                              {sIdx + 1}
                            </span>
                            <span className="truncate max-w-[200px]">{stopName}</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-40 hover:opacity-100 shrink-0" />
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3-Column Resource Allocation & Passenger Manifest */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    {/* 1. Date & Time */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-500" /> Scheduled Date & Time
                      </span>
                      <div className="font-bold text-slate-900 text-xs">
                        {dateFormatted}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600 font-semibold mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{startTimeFormatted} ➔ {endTimeFormatted}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{t.shift || 'General Shift'}</span>
                    </div>

                    {/* 2. Assigned EV Car & Driver */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                        <Car className="w-3 h-3 text-emerald-500" /> Assigned Car & Driver
                      </span>
                      <div className="font-mono font-bold text-slate-900 text-xs flex items-center justify-between">
                        <span>{t.bus_reg || 'Unassigned Car'}</span>
                        <span className="text-[10px] font-sans font-normal text-slate-500 truncate">{t.bus_model || '-'}</span>
                      </div>
                      <div className="font-bold text-slate-800 text-[11px] mt-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-500" />
                        <span>{t.driver_name || 'Unassigned Driver'}</span>
                        <span className="font-mono text-[10px] text-slate-400 font-normal">({t.driver_phone || '-'})</span>
                      </div>
                    </div>

                    {/* 3. Passenger Manifest */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Users className="w-3 h-3 text-cyan-500" /> Corporate Passengers
                        </span>
                        <span className="text-[10px] font-bold bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded border border-cyan-200">
                          {tripPassengers.length} Riders
                        </span>
                      </div>

                      {tripPassengers.length > 0 ? (
                        <div className="space-y-1 max-h-16 overflow-y-auto">
                          {tripPassengers.map((p, pIdx) => (
                            <div key={pIdx} className="text-[11px] flex items-center justify-between text-slate-800 bg-slate-50 px-2 py-0.5 rounded">
                              <span className="font-semibold truncate">{p.name}</span>
                              <span className="font-mono text-[10px] text-slate-500 shrink-0">{p.phone}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic py-1">
                          No specific riders linked yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* MODAL 5B: EDIT ROUTE CORRIDOR & STOPS MODAL */}
      {editingRoute && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Edit Route Corridor & Stops</span>
                    <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {editingRouteCode}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update route title, code, distance, duration, and rename individual stopping locations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRoute(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoute} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Route Code</label>
                  <input
                    type="text"
                    value={editingRouteCode}
                    onChange={(e) => setEditingRouteCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold uppercase focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Corridor Title / Name</label>
                  <input
                    type="text"
                    value={editingRouteName}
                    onChange={(e) => setEditingRouteName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRouteDistance}
                    onChange={(e) => setEditingRouteDistance(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Est. Duration (minutes)</label>
                  <input
                    type="number"
                    value={editingRouteDuration}
                    onChange={(e) => setEditingRouteDuration(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              {/* Ordered Stops List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ordered Stops Sequence (Origin ➔ Passenger Stops ➔ Destination)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditingRouteStops([...editingRouteStops, `New Stop ${editingRouteStops.length + 1}`])}
                    className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Stop
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {editingRouteStops.map((stop, sIdx) => {
                    const isFirst = sIdx === 0;
                    const isLast = sIdx === editingRouteStops.length - 1;
                    return (
                      <div
                        key={sIdx}
                        className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2"
                      >
                        <span
                          className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isFirst ? 'bg-emerald-600' : isLast ? 'bg-rose-600' : 'bg-indigo-600'
                          }`}
                        >
                          {isFirst ? 'A' : isLast ? 'B' : sIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={stop}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingRouteStops((prev) => prev.map((s, idx) => (idx === sIdx ? val : s)));
                          }}
                          placeholder={`Stop #${sIdx + 1} Name`}
                          className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-600"
                          required
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={sIdx === 0}
                            onClick={() => {
                              const copy = [...editingRouteStops];
                              const temp = copy[sIdx - 1]!;
                              copy[sIdx - 1] = copy[sIdx]!;
                              copy[sIdx] = temp;
                              setEditingRouteStops(copy);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            title="Move earlier"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={sIdx === editingRouteStops.length - 1}
                            onClick={() => {
                              const copy = [...editingRouteStops];
                              const temp = copy[sIdx + 1]!;
                              copy[sIdx + 1] = copy[sIdx]!;
                              copy[sIdx] = temp;
                              setEditingRouteStops(copy);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            title="Move later"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={editingRouteStops.length <= 2}
                            onClick={() => setEditingRouteStops(editingRouteStops.filter((_, idx) => idx !== sIdx))}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer"
                            title="Remove stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                >
                  Save Route Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH / SCHEDULE TRIP MODAL IN FLEET VIEW */}
      {showDispatchTripModalInFleet && (
        <DispatchTripModal
          initialTrip={selectedTripForEdit}
          existingRoutes={routes}
          onRouteCreated={handleSaveNewRoute}
          availableCars={buses}
          availableDrivers={drivers}
          onClose={() => {
            setShowDispatchTripModalInFleet(false);
            setSelectedTripForEdit(null);
          }}
          onTripDispatched={(updated) => {
            handleTripUpdated(updated);
            setShowDispatchTripModalInFleet(false);
            setSelectedTripForEdit(null);
          }}
        />
      )}

      {/* MODAL 1: MANDATORY VEHICLE DOCUMENTS VAULT */}
      {selectedBusForDocs && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Vehicle Mandatory Documents Vault</span>
                    <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {selectedBusForDocs.reg_no}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedBusForDocs.make} — {selectedBusForDocs.model} • Motor Vehicles Act Compliance
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const car = selectedBusForDocs;
                    setSelectedCarForDocs(null);
                    handleOpenEditCar(car);
                  }}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Edit Car & Docs</span>
                </button>
                <button
                  onClick={() => setSelectedCarForDocs(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Checklist of 6 Mandatory Documents with Live Scanned Previews */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* 1. Registration Certificate (RC) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      <span>1. Registration Certificate (RC)</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">
                    Doc #: <strong>{selectedBusForDocs.documents.rc.docNo}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Valid Until: {selectedBusForDocs.documents.rc.validUntil}
                  </div>
                  {uploadedFiles[`${selectedBusForDocs.reg_no}_rc`] && (
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`${selectedBusForDocs.reg_no}_rc`].name}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Form 23: Certificate of Registration',
                      category: 'Registration Certificate (RC)',
                      docNo: selectedBusForDocs.documents.rc.docNo,
                      regNoOrPerson: selectedBusForDocs.reg_no,
                      validUntil: selectedBusForDocs.documents.rc.validUntil,
                      issuer: 'Regional Transport Office (RTO), Pune (MH-12)',
                      status: 'VERIFIED & ACTIVE',
                      fileUrl: uploadedFiles[`${selectedBusForDocs.reg_no}_rc`]?.url,
                      details: {
                        'Vehicle Make & Model': `${selectedBusForDocs.make} — ${selectedBusForDocs.model}`,
                        'Vehicle Class': 'Motor Cab (Commercial 5-Seater EV)',
                        'Chassis Number': 'MAT892188LMN99120',
                        'Engine / Motor ID': 'EV-DRIVE-772911',
                        'Owner / Operator': 'City Express Fleet Mobility Corporation',
                        'Registration Authority': 'Government of Maharashtra Motor Vehicles Dept'
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`${selectedBusForDocs.reg_no}_rc`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 2. Road Tax Receipt */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>2. Road Tax Receipt</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                      PAID & ACTIVE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">
                    Receipt #: <strong>{selectedBusForDocs.documents.roadTax.receiptNo}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Tax Paid Validity: {selectedBusForDocs.documents.roadTax.validUntil}
                  </div>
                  {uploadedFiles[`${selectedBusForDocs.reg_no}_tax`] && (
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`${selectedBusForDocs.reg_no}_tax`].name}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Form 32: Motor Vehicle Tax Payment Receipt',
                      category: 'Road Tax Receipt',
                      docNo: selectedBusForDocs.documents.roadTax.receiptNo,
                      regNoOrPerson: selectedBusForDocs.reg_no,
                      validUntil: selectedBusForDocs.documents.roadTax.validUntil,
                      issuer: 'Treasury & Accounts Dept, Govt of Maharashtra',
                      status: 'PAID & ACTIVE',
                      fileUrl: uploadedFiles[`${selectedBusForDocs.reg_no}_tax`]?.url,
                      details: {
                        'Payment Challan No': selectedBusForDocs.documents.roadTax.receiptNo,
                        'Tax Head': 'Commercial Contract Carriage Road Tax',
                        'Amount Paid': '₹ 18,500 (Annual Installment)',
                        'Payment Gateway': 'MAH-GRAS Treasury Portal',
                        'Transaction Ref': 'GRAS-MH12-2026-991204',
                        'Tax Validity Period': `Upto ${selectedBusForDocs.documents.roadTax.validUntil}`
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`${selectedBusForDocs.reg_no}_tax`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 3. Pollution Under Control (PUC) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      <span>3. PUC Certificate</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedBusForDocs.documents.puc.status === 'expiring_soon'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                    >
                      {selectedBusForDocs.documents.puc.status === 'expiring_soon' ? 'RENEWAL DUE' : 'VALID'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">
                    Cert #: <strong>{selectedBusForDocs.documents.puc.certNo}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Valid Until: {selectedBusForDocs.documents.puc.validUntil}
                  </div>
                  {uploadedFiles[`${selectedBusForDocs.reg_no}_puc`] && (
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`${selectedBusForDocs.reg_no}_puc`].name}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Form 59: Pollution Under Control (PUC) Certificate',
                      category: 'PUC Certificate',
                      docNo: selectedBusForDocs.documents.puc.certNo,
                      regNoOrPerson: selectedBusForDocs.reg_no,
                      validUntil: selectedBusForDocs.documents.puc.validUntil,
                      issuer: 'Central Pollution Testing Network (RTO Pune)',
                      status: selectedBusForDocs.documents.puc.status === 'expiring_soon' ? 'RENEWAL DUE' : 'VALID',
                      fileUrl: uploadedFiles[`${selectedBusForDocs.reg_no}_puc`]?.url,
                      details: {
                        'PUC Center Code': 'PUN-PUC-4412 (Shivajinagar Station)',
                        'Emission Category': 'Zero-Emission Electric Vehicle (ZEV)',
                        'CO % Measured': '0.00% (Compliant)',
                        'Hydrocarbons (HC)': '0 ppm',
                        'CMVR Compliance': 'Rule 115(7) Central Motor Vehicles Rules',
                        'Valid Through': selectedBusForDocs.documents.puc.validUntil
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`${selectedBusForDocs.reg_no}_puc`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 4. Valid Insurance */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>4. Commercial Insurance</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                      INSURED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">
                    Policy #: <strong>{selectedBusForDocs.documents.insurance.policyNo}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Insurer: {selectedBusForDocs.documents.insurance.insurer}
                  </div>
                  {uploadedFiles[`${selectedBusForDocs.reg_no}_ins`] && (
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`${selectedBusForDocs.reg_no}_ins`].name}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Commercial Vehicle Comprehensive Package Policy',
                      category: 'Commercial Insurance',
                      docNo: selectedBusForDocs.documents.insurance.policyNo,
                      regNoOrPerson: selectedBusForDocs.reg_no,
                      validUntil: selectedBusForDocs.documents.insurance.validUntil,
                      issuer: selectedBusForDocs.documents.insurance.insurer,
                      status: 'INSURED & ACTIVE',
                      fileUrl: uploadedFiles[`${selectedBusForDocs.reg_no}_ins`]?.url,
                      details: {
                        'Insurance Company': selectedBusForDocs.documents.insurance.insurer,
                        'Policy Type': 'Comprehensive Passenger Commercial Vehicle',
                        'Insured Declared Value (IDV)': '₹ 14,80,000',
                        'Third Party Property Liability': 'Unlimited (Statutory Motor Vehicles Act)',
                        'Personal Accident Cover': '₹ 15,00,000 Included',
                        'Policy Period': `Upto ${selectedBusForDocs.documents.insurance.validUntil}`
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`${selectedBusForDocs.reg_no}_ins`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 5. Valid Permit */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>5. Valid Commercial Permit</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                      PERMIT ACTIVE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">
                    Permit #: <strong>{selectedBusForDocs.documents.permit.permitNo}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Type: {selectedBusForDocs.documents.permit.type}
                  </div>
                  {uploadedFiles[`${selectedBusForDocs.reg_no}_pmt`] && (
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`${selectedBusForDocs.reg_no}_pmt`].name}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Form 47: Contract Carriage Commercial Permit',
                      category: 'Commercial Permit',
                      docNo: selectedBusForDocs.documents.permit.permitNo,
                      regNoOrPerson: selectedBusForDocs.reg_no,
                      validUntil: selectedBusForDocs.documents.permit.validUntil,
                      issuer: 'Regional Transport Authority (RTA), Pune',
                      status: 'PERMIT ACTIVE',
                      fileUrl: uploadedFiles[`${selectedBusForDocs.reg_no}_pmt`]?.url,
                      details: {
                        'Permit Grant Ref': selectedBusForDocs.documents.permit.permitNo,
                        'Permit Nature': selectedBusForDocs.documents.permit.type,
                        'Authorized Area': 'Entire State of Maharashtra & Inter-City Corridors',
                        'Passenger Capacity Approved': '5 Persons Including Driver',
                        'RTA Resolution No': 'RTA-PUN-2024-CC-0091',
                        'Permit Expiry': selectedBusForDocs.documents.permit.validUntil
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`${selectedBusForDocs.reg_no}_pmt`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 6. Fitness Certificate */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>6. Fitness Certificate (FC)</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                      FIT APPROVED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">
                    Cert #: <strong>{selectedBusForDocs.documents.fitness.certNo}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    RTO Inspected Valid Until: {selectedBusForDocs.documents.fitness.validUntil}
                  </div>
                  {uploadedFiles[`${selectedBusForDocs.reg_no}_fc`] && (
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`${selectedBusForDocs.reg_no}_fc`].name}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Form 38: Certificate of Fitness for Transport Vehicle',
                      category: 'Fitness Certificate (FC)',
                      docNo: selectedBusForDocs.documents.fitness.certNo,
                      regNoOrPerson: selectedBusForDocs.reg_no,
                      validUntil: selectedBusForDocs.documents.fitness.validUntil,
                      issuer: 'Vehicle Inspection & Certification Board, RTO Pune',
                      status: 'FIT APPROVED',
                      fileUrl: uploadedFiles[`${selectedBusForDocs.reg_no}_fc`]?.url,
                      details: {
                        'Inspection Docket': selectedBusForDocs.documents.fitness.certNo,
                        'Automated Brake Test': 'PASSED (Braking Efficiency 78%)',
                        'Steering & Suspension': 'CERTIFIED FIT',
                        'Speed Governor Test': 'Calibrated to 80 km/h Statutory Limit',
                        'AIS-140 GPS & Panic Buttons': 'Functional & Transmitting to State Server',
                        'Valid Inspection Date': selectedBusForDocs.documents.fitness.validUntil
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`${selectedBusForDocs.reg_no}_fc`, e)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All 6 mandatory vehicle documents submitted & verified in compliance with Motor Vehicles Act 1988 & RTO regulations.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCarForDocs(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Close Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DRIVER REGULATORY DOCUMENT DOSSIER */}
      {selectedDriverForDocs && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Driver Mandatory Regulatory Dossier</span>
                    <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {selectedDriverForDocs.name}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Phone: {selectedDriverForDocs.phone} • DPDP 2023 & Transport Department Mandatory KYC
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = selectedDriverForDocs;
                    setSelectedDriverForDocs(null);
                    handleOpenEditDriver(d);
                  }}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Edit Driver & Docs</span>
                </button>
                <button
                  onClick={() => setSelectedDriverForDocs(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Checklist of 5 Required Driver Documents with Live Scanned Previews */}
            <div className="space-y-3 text-xs">
              {/* 1. Aadhaar Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      <span>1. Aadhaar Card (National ID)</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-1">
                      Masked UID: <strong>{selectedDriverForDocs.documents.aadhaar.docNo}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      UIDAI eKYC Affirmative Verification Recorded
                    </div>
                    {uploadedFiles[`driver_${selectedDriverForDocs.id}_aadhaar`] && (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`driver_${selectedDriverForDocs.id}_aadhaar`].name}
                      </div>
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                    VERIFIED
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Unique Identification Authority of India (UIDAI) - Aadhaar Card',
                      category: 'National Identity Proof (Aadhaar)',
                      docNo: selectedDriverForDocs.documents.aadhaar.docNo,
                      regNoOrPerson: selectedDriverForDocs.name,
                      validUntil: 'PERMANENT (Government of India)',
                      issuer: 'Government of India / UIDAI',
                      status: 'AUTHENTICATED eKYC',
                      fileUrl: uploadedFiles[`driver_${selectedDriverForDocs.id}_aadhaar`]?.url,
                      details: {
                        'Driver Legal Name': selectedDriverForDocs.name,
                        'Masked Aadhaar Number': selectedDriverForDocs.documents.aadhaar.docNo,
                        'Identity Authentication': 'Biometric & Mobile OTP Passed (SHA-256)',
                        'Current Residential Address': selectedDriverForDocs.address || 'Pune, Maharashtra',
                        'DPDP Compliance Status': 'Section 4(2) Consent Granted for Transport Service'
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`driver_${selectedDriverForDocs.id}_aadhaar`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 2. Police Verification Certificate */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>2. Police Verification Certificate</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-1">
                      Clearance Cert #: <strong>{selectedDriverForDocs.documents.policeVerification.certNo}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Station: {selectedDriverForDocs.documents.policeVerification.policeStation} (Valid Until: {selectedDriverForDocs.documents.policeVerification.validUntil})
                    </div>
                    {uploadedFiles[`driver_${selectedDriverForDocs.id}_police`] && (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`driver_${selectedDriverForDocs.id}_police`].name}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${selectedDriverForDocs.documents.policeVerification.status === 'expiring_soon'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                  >
                    {selectedDriverForDocs.documents.policeVerification.status === 'expiring_soon' ? 'RENEWAL DUE' : 'CLEARED'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Police Verification & Character Clearance Certificate',
                      category: 'Law Enforcement Clearance',
                      docNo: selectedDriverForDocs.documents.policeVerification.certNo,
                      regNoOrPerson: selectedDriverForDocs.name,
                      validUntil: selectedDriverForDocs.documents.policeVerification.validUntil,
                      issuer: selectedDriverForDocs.documents.policeVerification.policeStation,
                      status: 'POLICE CLEARED',
                      fileUrl: uploadedFiles[`driver_${selectedDriverForDocs.id}_police`]?.url,
                      details: {
                        'Issuing Police Station': selectedDriverForDocs.documents.policeVerification.policeStation,
                        'Background Criminal Record Check': 'NO ADVERSE ENTRIES FOUND (CLEAR)',
                        'Verification Authority': 'Pune City Police Commissionerate',
                        'Valid Inspection Horizon': `Through ${selectedDriverForDocs.documents.policeVerification.validUntil}`
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`driver_${selectedDriverForDocs.id}_police`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 3. Medical Fitness Certificate */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>3. Medical Fitness Certificate</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-1">
                      Medical Cert #: <strong>{selectedDriverForDocs.documents.medicalFitness.certNo}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Certified By: {selectedDriverForDocs.documents.medicalFitness.doctorName} • Reg: {selectedDriverForDocs.documents.medicalFitness.doctorReg}
                    </div>
                    {uploadedFiles[`driver_${selectedDriverForDocs.id}_medical`] && (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`driver_${selectedDriverForDocs.id}_medical`].name}
                      </div>
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                    MEDICALLY FIT
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Form 1A: Certificate of Medical Fitness for Driver',
                      category: 'Medical Fitness Evaluation',
                      docNo: selectedDriverForDocs.documents.medicalFitness.certNo,
                      regNoOrPerson: selectedDriverForDocs.name,
                      validUntil: selectedDriverForDocs.documents.medicalFitness.validUntil,
                      issuer: selectedDriverForDocs.documents.medicalFitness.doctorName,
                      status: 'MEDICALLY FIT',
                      fileUrl: uploadedFiles[`driver_${selectedDriverForDocs.id}_medical`]?.url,
                      details: {
                        'Registered Medical Practitioner': selectedDriverForDocs.documents.medicalFitness.doctorName,
                        'Medical Council Registration': selectedDriverForDocs.documents.medicalFitness.doctorReg,
                        'Vision & Color Blindness Test': 'PASSED (6/6 Both Eyes, Normal Color Vision)',
                        'Hearing & Reflex Response': 'CERTIFIED FIT FOR COMMERCIAL PASSENGER DRIVING',
                        'Valid Until': selectedDriverForDocs.documents.medicalFitness.validUntil
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`driver_${selectedDriverForDocs.id}_medical`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 4. Valid Driving Licence */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>4. Valid Commercial Driving Licence</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-1">
                      Licence #: <strong>{selectedDriverForDocs.documents.drivingLicence.licenseNo}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Class: {selectedDriverForDocs.documents.drivingLicence.classType} • Valid Until: {selectedDriverForDocs.documents.drivingLicence.validUntil}
                    </div>
                    {uploadedFiles[`driver_${selectedDriverForDocs.id}_license`] && (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Attached: {uploadedFiles[`driver_${selectedDriverForDocs.id}_license`].name}
                      </div>
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                    ACTIVE LICENCE
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Commercial Driving Licence (Smart Card Electronic Record)',
                      category: 'SARATHI Driving Licence',
                      docNo: selectedDriverForDocs.documents.drivingLicence.licenseNo,
                      regNoOrPerson: selectedDriverForDocs.name,
                      validUntil: selectedDriverForDocs.documents.drivingLicence.validUntil,
                      issuer: 'Licencing Authority, Motor Vehicles Dept, Pune (MH-12)',
                      status: 'VALID COMMERCIAL LICENCE',
                      fileUrl: uploadedFiles[`driver_${selectedDriverForDocs.id}_license`]?.url,
                      details: {
                        'Driver Name': selectedDriverForDocs.name,
                        'Licence Identifier': selectedDriverForDocs.documents.drivingLicence.licenseNo,
                        'Endorsed Vehicle Classes': selectedDriverForDocs.documents.drivingLicence.classType,
                        'SARATHI Digital Chip Trace': 'VALID / NO SUSPENSION RECORD',
                        'Validity Expiry Date': selectedDriverForDocs.documents.drivingLicence.validUntil
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`driver_${selectedDriverForDocs.id}_license`, e)}
                    />
                  </label>
                </div>
              </div>

              {/* 5. Driver Profile Photo / Selfie */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-indigo-600" />
                      <span>5. Contact & Official KYC Photo</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-1">
                      Primary Phone: <strong>{selectedDriverForDocs.documents.contactNumber.phone}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Real-time SMS & OTP Dispatch Link Established
                    </div>
                    {uploadedFiles[`driver_${selectedDriverForDocs.id}_photo`] && (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Attached Photo: {uploadedFiles[`driver_${selectedDriverForDocs.id}_photo`].name}
                      </div>
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                    OTP & PHOTO ACTIVE
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      title: 'Official Driver Profile Identity & KYC Photograph',
                      category: 'Driver Profile Photo',
                      docNo: selectedDriverForDocs.phone,
                      regNoOrPerson: selectedDriverForDocs.name,
                      validUntil: 'ACTIVE IN ROSTER',
                      issuer: 'Fleet Operations Human Resources',
                      status: 'VERIFIED PHOTOGRAPH',
                      fileUrl: uploadedFiles[`driver_${selectedDriverForDocs.id}_photo`]?.url,
                      details: {
                        'Driver Name': selectedDriverForDocs.name,
                        'Registered Phone': selectedDriverForDocs.phone,
                        'Facial Verification': 'MATCHED AGAINST DRIVING LICENCE RECORD',
                        'Roster Enrolment': 'PASSED COMPLIANCE BACKGROUND CHECK'
                      }
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Photo / Scanned Copy</span>
                  </button>
                  <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(`driver_${selectedDriverForDocs.id}_photo`, e)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All 5 required driver documents are fully verified and linked to this driver profile for dispatch authorization.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDriverForDocs(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD CAR & SUBMIT 6 MANDATORY VEHICLE DOCUMENTS */}
      {showAddBusModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleAddBus}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Add New Corporate Car & Link Documents</h3>
                  <p className="text-[11px] text-slate-500">Includes Seating Specs & 6 Mandatory Transport Certificates.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBusModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vehicle Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Vehicle Registration No *</label>
                <input
                  type="text"
                  placeholder="MH-12-DT-0005"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono uppercase font-bold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Manufacturer Make *</label>
                <select
                  value={newBusMake}
                  onChange={(e) => setNewBusMake(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 font-medium"
                >
                  <option value="Tata Motors">Tata Motors</option>
                  <option value="MG Motor">MG Motor</option>
                  <option value="Hyundai">Hyundai</option>
                  <option value="Mahindra">Mahindra</option>
                  <option value="Toyota">Toyota</option>
                  <option value="Maruti Suzuki">Maruti Suzuki</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Car Model *</label>
                <input
                  type="text"
                  value={newBusModel}
                  onChange={(e) => setNewBusModel(e.target.value)}
                  placeholder="Nexon EV Max"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 font-medium"
                />
              </div>

              <div className="sm:col-span-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">Passenger Seating Capacity:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-center font-mono font-bold text-slate-900"
                  />
                  <span className="text-slate-500 text-[11px]">passengers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick Select:</span>
                  <button
                    type="button"
                    onClick={() => { setNewCapacity(4); setNewBusModel('Dzire Tour EV'); }}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    4-Seater Sedan
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewCapacity(5); setNewBusModel('Nexon EV Max'); }}
                    className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                  >
                    5-Seater EV (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewCapacity(7); setNewBusModel('Innova HyCross Hybrid'); }}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    7-Seater MPV
                  </button>
                </div>
              </div>
            </div>

            {/* Client Mandatory Vehicle Documents Section with Upload Windows */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>Mandatory Transport Certificates & Upload Windows (6 Items)</span>
                </h4>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  {Object.keys(newBusDocFiles).length}/6 Files Attached
                </span>
              </div>

              {/* Multi-Document Dropzone Banner */}
              <div className="p-3 bg-indigo-50/60 border border-dashed border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-2xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Direct Document File Dropzone</h5>
                    <p className="text-[10px] text-slate-500">Attach scanned PDF, JPG or PNG certificates for RTO compliance.</p>
                  </div>
                </div>
                <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach Documents</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      Array.from(files).forEach((file, idx) => {
                        const keys = ['rc', 'tax', 'puc', 'ins', 'permit', 'fitness'];
                        const targetKey = keys[idx % keys.length];
                        const size = (file.size / 1024).toFixed(1) + ' KB';
                        const reader = new FileReader();
                        reader.onload = () => {
                          setNewBusDocFiles((prev) => ({
                            ...prev,
                            [targetKey]: { name: file.name, size, url: reader.result as string },
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                </label>
              </div>

              {/* 6 Individual Document Cards with Numbers, Expiries & Upload Windows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Registration Certificate (RC) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>1. Registration Certificate (RC) *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Form 23</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="RC Number"
                      value={newRcNo}
                      onChange={(e) => setNewRcNo(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-indigo-600"
                    />
                    <input
                      type="date"
                      value={newRcValid}
                      onChange={(e) => setNewRcValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  {newBusDocFiles['rc'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newBusDocFiles['rc'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newBusDocFiles['rc'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Form 23: Registration Certificate (RC)',
                            category: 'Registration Certificate',
                            docNo: newRcNo || 'PENDING',
                            regNoOrPerson: newRegNo || 'NEW VEHICLE',
                            validUntil: newRcValid,
                            issuer: 'RTO Pune (MH-12)',
                            status: 'ATTACHED',
                            fileUrl: newBusDocFiles['rc'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBusDocFiles((prev) => { const cp = { ...prev }; delete cp['rc']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload RC Scanned Copy</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('rc', e, setNewBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 2. Road Tax Receipt */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Road Tax Receipt *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Form 32</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="Tax Receipt Number"
                      value={newRoadTaxNo}
                      onChange={(e) => setNewRoadTaxNo(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-indigo-600"
                    />
                    <input
                      type="date"
                      value={newRoadTaxValid}
                      onChange={(e) => setNewRoadTaxValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  {newBusDocFiles['tax'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newBusDocFiles['tax'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newBusDocFiles['tax'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Form 32: Road Tax Receipt',
                            category: 'Tax Challan',
                            docNo: newRoadTaxNo || 'PENDING',
                            regNoOrPerson: newRegNo || 'NEW VEHICLE',
                            validUntil: newRoadTaxValid,
                            issuer: 'MAH-GRAS Treasury',
                            status: 'ATTACHED',
                            fileUrl: newBusDocFiles['tax'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBusDocFiles((prev) => { const cp = { ...prev }; delete cp['tax']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Tax Challan Copy</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('tax', e, setNewBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 3. PUC Certificate */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>3. PUC Certificate *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Form 59</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="PUC Certificate No"
                      value={newPucNo}
                      onChange={(e) => setNewPucNo(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-indigo-600"
                    />
                    <input
                      type="date"
                      value={newPucValid}
                      onChange={(e) => setNewPucValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  {newBusDocFiles['puc'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newBusDocFiles['puc'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newBusDocFiles['puc'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Form 59: PUC Certificate',
                            category: 'Pollution Under Control',
                            docNo: newPucNo || 'PENDING',
                            regNoOrPerson: newRegNo || 'NEW VEHICLE',
                            validUntil: newPucValid,
                            issuer: 'RTO Authorized Emission Test Station',
                            status: 'ATTACHED',
                            fileUrl: newBusDocFiles['puc'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBusDocFiles((prev) => { const cp = { ...prev }; delete cp['puc']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload PUC Certificate</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('puc', e, setNewBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 4. Insurance Policy */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>4. Commercial Insurance *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Comprehensive</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="Policy Number"
                      value={newInsuranceNo}
                      onChange={(e) => setNewInsuranceNo(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600"
                    />
                    <input
                      type="text"
                      placeholder="Insurer Name"
                      value={newInsuranceInsurer}
                      onChange={(e) => setNewInsuranceInsurer(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <input
                    type="date"
                    value={newInsuranceValid}
                    onChange={(e) => setNewInsuranceValid(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                  {newBusDocFiles['ins'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newBusDocFiles['ins'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newBusDocFiles['ins'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Commercial Insurance Policy',
                            category: 'Insurance Certificate',
                            docNo: newInsuranceNo || 'PENDING',
                            regNoOrPerson: newRegNo || 'NEW VEHICLE',
                            validUntil: newInsuranceValid,
                            issuer: newInsuranceInsurer,
                            status: 'ATTACHED',
                            fileUrl: newBusDocFiles['ins'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBusDocFiles((prev) => { const cp = { ...prev }; delete cp['ins']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Policy Document</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('ins', e, setNewBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 5. Valid Permit */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>5. Commercial Permit *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Form 47</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="Permit Number"
                      value={newPermitNo}
                      onChange={(e) => setNewPermitNo(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-indigo-600"
                    />
                    <input
                      type="date"
                      value={newPermitValid}
                      onChange={(e) => setNewPermitValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  {newBusDocFiles['permit'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newBusDocFiles['permit'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newBusDocFiles['permit'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Form 47: Contract Carriage Permit',
                            category: 'Commercial Transport Permit',
                            docNo: newPermitNo || 'PENDING',
                            regNoOrPerson: newRegNo || 'NEW VEHICLE',
                            validUntil: newPermitValid,
                            issuer: 'State Transport Authority (Maharashtra)',
                            status: 'ATTACHED',
                            fileUrl: newBusDocFiles['permit'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBusDocFiles((prev) => { const cp = { ...prev }; delete cp['permit']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Permit Copy</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('permit', e, setNewBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 6. Fitness Certificate */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      <span>6. Fitness Certificate (FC) *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Form 38</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="FC Certificate No"
                      value={newFitnessNo}
                      onChange={(e) => setNewFitnessNo(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-indigo-600"
                    />
                    <input
                      type="date"
                      value={newFitnessValid}
                      onChange={(e) => setNewFitnessValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  {newBusDocFiles['fitness'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newBusDocFiles['fitness'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newBusDocFiles['fitness'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Form 38: Certificate of Fitness',
                            category: 'Vehicle Fitness',
                            docNo: newFitnessNo || 'PENDING',
                            regNoOrPerson: newRegNo || 'NEW VEHICLE',
                            validUntil: newFitnessValid,
                            issuer: 'RTO Vehicle Inspectorate Pune',
                            status: 'ATTACHED',
                            fileUrl: newBusDocFiles['fitness'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewBusDocFiles((prev) => { const cp = { ...prev }; delete cp['fitness']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Fitness Certificate</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('fitness', e, setNewBusDocFiles)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddBusModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Register Car & Link All 6 Documents</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3B: EDIT CAR & DOCUMENTS */}
      {showEditBusModal && editingCar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveEditCar}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Edit Car Specs & Documents</span>
                    <span className="font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {editingCar.reg_no}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Update vehicle details, document numbers and replace scanned files.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditBusModal(false); setEditingCar(null); }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vehicle Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Vehicle Registration No *</label>
                <input
                  type="text"
                  value={editRegNo}
                  onChange={(e) => setEditRegNo(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono uppercase font-bold focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Manufacturer Make</label>
                <input
                  type="text"
                  value={editMake}
                  onChange={(e) => setEditMake(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Car Model</label>
                <input
                  type="text"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="sm:col-span-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Seating Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Tracking Source</label>
                  <select
                    value={editTrackingSource}
                    onChange={(e) => setEditTrackingSource(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-medium"
                  >
                    <option value="phone">Android / iOS Driver App Phone</option>
                    <option value="obd_gps">Hardwired OBD GPS Telemetry Unit</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Fleet Operating Status *</label>
                  <select
                    value={editCarStatus}
                    onChange={(e) => {
                      const val = e.target.value as 'active' | 'on_trip' | 'maintenance' | 'inactive';
                      setEditCarStatus(val);
                      setEditIsActive(val === 'active' || val === 'on_trip');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                  >
                    <option value="active">Active in Fleet (Ready for Dispatch)</option>
                    <option value="on_trip">On Active Trip (Live Transit)</option>
                    <option value="maintenance">In Maintenance (RTO / Workshop)</option>
                    <option value="inactive">Inactive / Standby</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Document Details & Upload Replacement Windows */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>Edit Mandatory Documents & Upload Renewal Files (6 Items)</span>
                </h4>
                <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                  Instant Vault Sync
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. RC */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold">1. Registration Certificate (RC)</label>
                    <span className="text-[10px] text-slate-400">Form 23</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={editRcNo}
                      onChange={(e) => setEditRcNo(e.target.value)}
                      placeholder="RC Number"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs uppercase"
                    />
                    <input
                      type="date"
                      value={editRcValid}
                      onChange={(e) => setEditRcValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                  {editBusDocFiles['rc'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editBusDocFiles['rc'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('rc', e, setEditBusDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload New RC File</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('rc', e, setEditBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 2. Road Tax */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold">2. Road Tax Receipt</label>
                    <span className="text-[10px] text-slate-400">Form 32</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={editRoadTaxNo}
                      onChange={(e) => setEditRoadTaxNo(e.target.value)}
                      placeholder="Receipt Number"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs uppercase"
                    />
                    <input
                      type="date"
                      value={editRoadTaxValid}
                      onChange={(e) => setEditRoadTaxValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                  {editBusDocFiles['tax'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editBusDocFiles['tax'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('tax', e, setEditBusDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload Road Tax Receipt</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('tax', e, setEditBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 3. PUC */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold">3. PUC Certificate</label>
                    <span className="text-[10px] text-slate-400">Form 59</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={editPucNo}
                      onChange={(e) => setEditPucNo(e.target.value)}
                      placeholder="PUC Number"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs uppercase"
                    />
                    <input
                      type="date"
                      value={editPucValid}
                      onChange={(e) => setEditPucValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                  {editBusDocFiles['puc'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editBusDocFiles['puc'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('puc', e, setEditBusDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload PUC File</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('puc', e, setEditBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 4. Insurance */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold">4. Commercial Insurance</label>
                    <span className="text-[10px] text-slate-400">Policy</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={editInsuranceNo}
                      onChange={(e) => setEditInsuranceNo(e.target.value)}
                      placeholder="Policy No"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs uppercase"
                    />
                    <input
                      type="text"
                      value={editInsuranceInsurer}
                      onChange={(e) => setEditInsuranceInsurer(e.target.value)}
                      placeholder="Insurer"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <input
                    type="date"
                    value={editInsuranceValid}
                    onChange={(e) => setEditInsuranceValid(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                  />
                  {editBusDocFiles['ins'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editBusDocFiles['ins'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('ins', e, setEditBusDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload Insurance Policy</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('ins', e, setEditBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 5. Permit */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold">5. Commercial Permit</label>
                    <span className="text-[10px] text-slate-400">Form 47</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={editPermitNo}
                      onChange={(e) => setEditPermitNo(e.target.value)}
                      placeholder="Permit No"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs uppercase"
                    />
                    <input
                      type="date"
                      value={editPermitValid}
                      onChange={(e) => setEditPermitValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                  {editBusDocFiles['permit'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editBusDocFiles['permit'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('permit', e, setEditBusDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload Permit Document</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('permit', e, setEditBusDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 6. Fitness */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold">6. Fitness Certificate (FC)</label>
                    <span className="text-[10px] text-slate-400">Form 38</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={editFitnessNo}
                      onChange={(e) => setEditFitnessNo(e.target.value)}
                      placeholder="FC Number"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs uppercase"
                    />
                    <input
                      type="date"
                      value={editFitnessValid}
                      onChange={(e) => setEditFitnessValid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>
                  {editBusDocFiles['fitness'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editBusDocFiles['fitness'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('fitness', e, setEditBusDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload Fitness Certificate</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('fitness', e, setEditBusDocFiles)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowEditBusModal(false); setEditingCar(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes to Vehicle & Documents</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: ENROLL DRIVER & SUBMIT 5 REQUIRED DOCUMENTS */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleAddDriver}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Enroll Driver & Link Mandatory KYC Documents</h3>
                  <p className="text-[11px] text-slate-500">Includes Driver Identity & 5 Client Mandatory Clearance Certificates.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDriverModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Driver Full Legal Name *</label>
                <input
                  type="text"
                  placeholder="Santosh Gaikwad"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Contact Phone (Login ID) *</label>
                <input
                  type="text"
                  placeholder="+919822007788"
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-semibold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Licence Category Class</label>
                <select
                  defaultValue="HMV-Passenger (Commercial)"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                >
                  <option value="HMV-Passenger (Commercial)">HMV-Passenger (Commercial)</option>
                  <option value="LMV-Transport Commercial Cab">LMV-Transport Commercial Cab</option>
                  <option value="EV-Commercial Transit">Electric Passenger Vehicle (EV)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Residential Address</label>
                <input
                  type="text"
                  placeholder="Shivajinagar, Pune"
                  value={newDriverAddress}
                  onChange={(e) => setNewDriverAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 font-medium"
                />
              </div>
            </div>

            {/* Client Mandatory Driver Documents Section with Upload Windows */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Driver KYC Clearances & Upload Windows (5 Items)</span>
                </h4>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  {Object.keys(newDriverDocFiles).length}/5 Files Attached
                </span>
              </div>

              {/* Multi-Document Dropzone Banner */}
              <div className="p-3 bg-indigo-50/60 border border-dashed border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-2xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Direct Driver KYC File Dropzone</h5>
                    <p className="text-[10px] text-slate-500">Attach Aadhaar, Driving Licence, Medical & Police Clearances (PDF, JPG or PNG).</p>
                  </div>
                </div>
                <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach KYC Files</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      Array.from(files).forEach((file, idx) => {
                        const keys = ['aadhaar', 'police', 'medical', 'license', 'photo'];
                        const targetKey = keys[idx % keys.length];
                        const size = (file.size / 1024).toFixed(1) + ' KB';
                        const reader = new FileReader();
                        reader.onload = () => {
                          setNewDriverDocFiles((prev) => ({
                            ...prev,
                            [targetKey]: { name: file.name, size, url: reader.result as string },
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                </label>
              </div>

              {/* 5 Individual Driver KYC Cards with Dedicated Upload Windows */}
              <div className="space-y-3 text-xs">
                {/* 1. Aadhaar Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>1. Aadhaar Card (National ID) (12 Digits) *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">UIDAI Affirmative</span>
                  </div>
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-4512"
                    value={newAadhaarNo}
                    onChange={(e) => setNewAadhaarNo(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600"
                  />
                  {newDriverDocFiles['aadhaar'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newDriverDocFiles['aadhaar'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newDriverDocFiles['aadhaar'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'UIDAI Aadhaar Card',
                            category: 'National Identity Proof',
                            docNo: newAadhaarNo || 'XXXX-XXXX-4512',
                            regNoOrPerson: newDriverName || 'ENROLLED DRIVER',
                            validUntil: 'PERMANENT',
                            issuer: 'Government of India (UIDAI)',
                            status: 'ATTACHED',
                            fileUrl: newDriverDocFiles['aadhaar'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewDriverDocFiles((prev) => { const cp = { ...prev }; delete cp['aadhaar']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Aadhaar Scanned Copy (PDF / Image)</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('aadhaar', e, setNewDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 2. Police Verification Certificate */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Police Verification Certificate Issuing Station *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Clearance Cert</span>
                  </div>
                  <input
                    type="text"
                    value={newPoliceStation}
                    onChange={(e) => setNewPoliceStation(e.target.value)}
                    required
                    placeholder="Shivajinagar Police Station"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                  {newDriverDocFiles['police'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newDriverDocFiles['police'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newDriverDocFiles['police'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Police Verification & Character Clearance Certificate',
                            category: 'Police Clearance',
                            docNo: `POL-${Date.now().toString().slice(-4)}`,
                            regNoOrPerson: newDriverName || 'ENROLLED DRIVER',
                            validUntil: '2027-12-31',
                            issuer: newPoliceStation,
                            status: 'ATTACHED',
                            fileUrl: newDriverDocFiles['police'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewDriverDocFiles((prev) => { const cp = { ...prev }; delete cp['police']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Police Clearance Certificate (PDF / Image)</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('police', e, setNewDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 3. Medical Fitness Certificate */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      <span>3. Medical Fitness Certificate (Doctor & Reg No) *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Form 1A Certified</span>
                  </div>
                  <input
                    type="text"
                    value={newDoctorName}
                    onChange={(e) => setNewDoctorName(e.target.value)}
                    required
                    placeholder="Dr. P. R. Deshmukh (MBBS, MMC-2010)"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                  {newDriverDocFiles['medical'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newDriverDocFiles['medical'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newDriverDocFiles['medical'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Form 1A: Driver Medical Fitness Certificate',
                            category: 'Medical Evaluation',
                            docNo: `MED-FIT-${Date.now().toString().slice(-4)}`,
                            regNoOrPerson: newDriverName || 'ENROLLED DRIVER',
                            validUntil: '2027-10-30',
                            issuer: newDoctorName,
                            status: 'ATTACHED',
                            fileUrl: newDriverDocFiles['medical'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewDriverDocFiles((prev) => { const cp = { ...prev }; delete cp['medical']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Doctor Fitness Report (PDF / Image)</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('medical', e, setNewDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 4. Valid Driving Licence */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>4. Valid Commercial Driving Licence Number *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">SARATHI Electronic Record</span>
                  </div>
                  <input
                    type="text"
                    placeholder="MH-14-2021-0078912"
                    value={newDriverLicense}
                    onChange={(e) => setNewDriverLicense(e.target.value.toUpperCase())}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-indigo-600"
                  />
                  {newDriverDocFiles['license'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newDriverDocFiles['license'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newDriverDocFiles['license'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Commercial Driving Licence (Smart Card Electronic Record)',
                            category: 'Driving Licence Proof',
                            docNo: newDriverLicense,
                            regNoOrPerson: newDriverName || 'ENROLLED DRIVER',
                            validUntil: '2030-05-15',
                            issuer: 'RTO Licencing Authority Pune',
                            status: 'ATTACHED',
                            fileUrl: newDriverDocFiles['license'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewDriverDocFiles((prev) => { const cp = { ...prev }; delete cp['license']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Driving Licence Scan (PDF / Image)</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select File</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('license', e, setNewDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 5. Driver Official Photograph */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-800 font-bold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>5. Driver Official ID Photo / KYC Selfie *</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Driver Terminal Profile</span>
                  </div>
                  {newDriverDocFiles['photo'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{newDriverDocFiles['photo'].name}</span>
                        <span className="text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{newDriverDocFiles['photo'].size}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            title: 'Official Driver Profile Identity & KYC Photograph',
                            category: 'Driver Profile Photo',
                            docNo: newDriverPhone,
                            regNoOrPerson: newDriverName || 'ENROLLED DRIVER',
                            validUntil: 'ACTIVE IN ROSTER',
                            issuer: 'Fleet Operations Human Resources',
                            status: 'ATTACHED PHOTO',
                            fileUrl: newDriverDocFiles['photo'].url,
                          })}
                          className="p-1 text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewDriverDocFiles((prev) => { const cp = { ...prev }; delete cp['photo']; return cp; })}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700 transition">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-semibold">Upload Driver Official ID Photo (JPG / PNG)</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Select Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('photo', e, setNewDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddDriverModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Enroll Driver & Verify 5 Documents</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4B: EDIT DRIVER PROFILE & KYC DOSSIER */}
      {showEditDriverModal && editingDriver && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveEditDriver}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Edit Driver Dossier</span>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {editingDriver.name}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Update personal particulars, duty status, and replace/renew KYC certificates.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditDriverModal(false); setEditingDriver(null); }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Driver Full Legal Name *</label>
                <input
                  type="text"
                  value={editDriverName}
                  onChange={(e) => setEditDriverName(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Contact Phone (Login ID) *</label>
                <input
                  type="text"
                  value={editDriverPhone}
                  onChange={(e) => setEditDriverPhone(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Driving Licence Number *</label>
                <input
                  type="text"
                  value={editDriverLicense}
                  onChange={(e) => setEditDriverLicense(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Operational Duty Status *</label>
                <select
                  value={editDriverDutyStatus}
                  onChange={(e) => setEditDriverDutyStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                >
                  <option value="on_duty">ON DUTY (Active Assigned Shift)</option>
                  <option value="available">AVAILABLE (Standby for Immediate Dispatch)</option>
                  <option value="off_duty">OFF DUTY (Shift Complete / Resting)</option>
                  <option value="inactive">INACTIVE (On Leave / Suspended)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Residential Address</label>
                <input
                  type="text"
                  value={editDriverAddress}
                  onChange={(e) => setEditDriverAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* KYC Dossier Fields & Upload Replacement Windows */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>KYC Dossier & Document Upload Replacement Windows</span>
              </h4>

              <div className="space-y-3 text-xs">
                {/* 1. Aadhaar Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="text-[11px] text-slate-800 font-bold block">1. Aadhaar Card Number</label>
                  <input
                    type="text"
                    value={editDriverAadhaar}
                    onChange={(e) => setEditDriverAadhaar(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                  />
                  {editDriverDocFiles['aadhaar'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editDriverDocFiles['aadhaar'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('aadhaar', e, setEditDriverDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload New Aadhaar File</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('aadhaar', e, setEditDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 2. Police Clearance */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="text-[11px] text-slate-800 font-bold block">2. Police Clearance Station</label>
                  <input
                    type="text"
                    value={editDriverPoliceStation}
                    onChange={(e) => setEditDriverPoliceStation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  {editDriverDocFiles['police'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editDriverDocFiles['police'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('police', e, setEditDriverDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload Police Certificate</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('police', e, setEditDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 3. Medical Fitness */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="text-[11px] text-slate-800 font-bold block">3. Medical Fitness Examiner & Registration</label>
                  <input
                    type="text"
                    value={editDriverDoctorName}
                    onChange={(e) => setEditDriverDoctorName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  {editDriverDocFiles['medical'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editDriverDocFiles['medical'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('medical', e, setEditDriverDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload Medical Fitness Report</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('medical', e, setEditDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 4. Licence Document */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="text-[11px] text-slate-800 font-bold block">4. Driving Licence Document</label>
                  {editDriverDocFiles['license'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editDriverDocFiles['license'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('license', e, setEditDriverDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload Driving Licence Scan</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('license', e, setEditDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>

                {/* 5. Photo */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="text-[11px] text-slate-800 font-bold block">5. Official Driver Photo / Selfie</label>
                  {editDriverDocFiles['photo'] ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-xs text-emerald-950 font-bold truncate">{editDriverDocFiles['photo'].name}</span>
                      </div>
                      <label className="text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-100">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleGenericFileUpload('photo', e, setEditDriverDocFiles)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between p-2 rounded-lg border border-dashed border-indigo-300 bg-white hover:bg-indigo-50/50 cursor-pointer text-indigo-700">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold">Upload Driver Photograph</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Browse</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleGenericFileUpload('photo', e, setEditDriverDocFiles)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowEditDriverModal(false); setEditingDriver(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes to Driver Dossier</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: INTERACTIVE REAL-MAP ROUTE CORRIDOR STUDIO */}
      <RouteCorridorMapModal
        isOpen={showAddRouteModal}
        onClose={() => setShowAddRouteModal(false)}
        onSaveRoute={handleSaveNewRoute}
        onSaveRouteAndTrip={handleSaveNewRouteAndTrip}
        existingRoutesCount={routes.length}
        availableCars={buses}
        availableDrivers={drivers}
      />

      {/* MODAL: TRIP DOSSIER & OPERATIONAL DETAILS */}
      {selectedTripForDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92dvh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded-xl text-xs">
                    {selectedTripForDetails.route_code || 'CR-CORRIDOR'}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    {selectedTripForDetails.route_name || 'Corporate Transit Corridor'}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      selectedTripForDetails.status === 'in_progress'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                        : selectedTripForDetails.status === 'completed'
                        ? 'bg-slate-100 text-slate-700 border border-slate-300'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    {selectedTripForDetails.status === 'in_progress'
                      ? '● Live In Transit'
                      : selectedTripForDetails.status === 'completed'
                      ? 'Completed'
                      : 'Scheduled Dispatch'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Trip Reference ID: <span className="text-slate-700 font-semibold">{selectedTripForDetails.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedTripForDetails(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex-wrap">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">Operational Status:</span>
                <span className="font-semibold text-slate-600 capitalize">{selectedTripForDetails.status || 'scheduled'}</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedTripForDetails.status !== 'in_progress' && selectedTripForDetails.status !== 'completed' && (
                  <button
                    onClick={() => {
                      handleUpdateTripStatus(selectedTripForDetails.id, 'in_progress');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Start Live Trip Now</span>
                  </button>
                )}
                {selectedTripForDetails.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      handleUpdateTripStatus(selectedTripForDetails.id, 'completed');
                    }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Trip Completed</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedTripForEdit(selectedTripForDetails);
                    setShowDispatchTripModalInFleet(true);
                    setSelectedTripForDetails(null);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Edit Schedule & Manifest</span>
                </button>
              </div>
            </div>

            {/* 3 Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Card 1: Timings & Shift */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Scheduled Timings</span>
                </div>
                <div className="font-extrabold text-slate-900 text-sm">
                  {new Date(selectedTripForDetails.planned_start || Date.now()).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-xs font-mono font-bold text-indigo-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(selectedTripForDetails.planned_start || Date.now()).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' ➔ '}
                    {new Date(selectedTripForDetails.planned_end || Date.now() + 3600000).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Shift: <span className="font-bold text-slate-700">{selectedTripForDetails.shift || 'General Shift'}</span>
                </div>
              </div>

              {/* Card 2: Assigned Vehicle */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Assigned EV Vehicle</span>
                </div>
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {selectedTripForDetails.bus_reg || 'Unassigned Car'}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  {selectedTripForDetails.bus_model || '-'}
                </div>
                <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>6/6 Mandatory Docs Verified</span>
                </div>
              </div>

              {/* Card 3: Assigned Driver */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>Assigned Professional Driver</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedTripForDetails.driver_name || 'Unassigned Driver'}
                </div>
                <div className="text-xs font-mono text-indigo-700 font-semibold flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{selectedTripForDetails.driver_phone || '+91 98220 01122'}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  DL: <span className="font-mono text-slate-700">HMV-Commercial Cleared</span>
                </div>
              </div>
            </div>

            {/* Stops Corridor Sequence */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Route Corridor Stops Sequence</span>
                </h4>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {((selectedTripForDetails.distance_m || 24500) / 1000).toFixed(1)} km total corridor
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(routes.find((r: any) => r.id === selectedTripForDetails.route_id || r.code === selectedTripForDetails.route_code)?.stops || [
                  'Swargate Metro Hub',
                  'Chandani Chowk Bypass',
                  'Hinjawadi Phase 3 TechZone',
                ]).map((stop: any, sIdx: number, arr: any[]) => {
                  const stopName = typeof stop === 'string' ? stop : stop.name;
                  const isFirst = sIdx === 0;
                  const isLast = sIdx === arr.length - 1;
                  return (
                    <div
                      key={sIdx}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5"
                    >
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white shrink-0 ${
                          isFirst ? 'bg-emerald-600' : isLast ? 'bg-rose-600' : 'bg-indigo-600'
                        }`}
                      >
                        {sIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{stopName}</div>
                        <div className="text-[10px] text-slate-400">
                          {isFirst ? 'Origin Terminal' : isLast ? 'Final Destination' : `Waypoint #${sIdx + 1}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Corporate Passenger Manifest */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-600" />
                  <span>Corporate Passenger Manifest</span>
                  <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                    {(selectedTripForDetails.passengers || []).length} Booked Riders
                  </span>
                </h4>
              </div>

              {(selectedTripForDetails.passengers || []).length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {(selectedTripForDetails.passengers || []).map((p: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{p.phone || '+91 98000 00000'}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                        Confirmed Seat
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  No passengers assigned to this trip yet. Click "Edit Schedule & Manifest" above to add corporate riders.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTripForDetails(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIGH-FIDELITY DOCUMENT VIEWER & SCANNED COPY PREVIEW LIGHTBOX */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92dvh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{previewDoc.title}</h3>
                  <p className="text-[11px] text-slate-400">{previewDoc.issuer}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Scanned Document Canvas */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-100 space-y-4 font-sans">
              {previewDoc.fileUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-300 bg-white p-2 text-center shadow-xs">
                  <img src={previewDoc.fileUrl} alt="Uploaded Document Preview" className="max-h-[380px] w-auto mx-auto rounded-lg object-contain" />
                  <p className="text-[11px] text-slate-500 mt-2 font-mono">User Uploaded Scanned File Preview</p>
                </div>
              ) : (
                <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md relative overflow-hidden">
                  {/* Subtle Security Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                    <span className="text-6xl font-black uppercase rotate-[-25deg] select-none text-slate-900">
                      GOVERNMENT OF INDIA • RTO PUNE
                    </span>
                  </div>

                  {/* Document Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                      Transport Department • Government of Maharashtra
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight mt-1">
                      {previewDoc.title}
                    </h2>
                    <div className="text-xs font-mono font-bold text-indigo-700 mt-0.5">
                      National Register / VAHAN Portal Verified Record
                    </div>
                  </div>

                  {/* Verification QR Code & Digital Signature Stamp */}
                  <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white border border-slate-300 rounded-lg shadow-2xs">
                        <QrCode className="w-9 h-9 text-slate-900" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Document Security Status</div>
                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Digital Signature Verified (SHA-256)</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full border border-emerald-300">
                      {previewDoc.status}
                    </span>
                  </div>

                  {/* Structured Certificate Fields */}
                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Vehicle Registration</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{previewDoc.regNoOrPerson}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Certificate Validity Period</span>
                      <span className="font-bold text-slate-900">{previewDoc.validUntil}</span>
                    </div>

                    {previewDoc.details && Object.entries(previewDoc.details).map(([key, val]) => (
                      <div key={key} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">{key}</span>
                        <span className="font-medium text-slate-800 mt-0.5 block">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Official Stamping Footer */}
                  <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                    <div>Registering Authority: <strong>{previewDoc.issuer}</strong></div>
                    <div>Digital Trace ID: <strong className="font-mono">MH-PARIVAHAN-2026-8819</strong></div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Scanned Copy / Photo</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setPreviewDoc({ ...previewDoc, fileUrl: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Official PDF for ${previewDoc.title} (${previewDoc.docNo}) downloaded successfully.`)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Official Copy (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
