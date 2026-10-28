import React, { useState } from 'react';
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
} from 'lucide-react';

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

export const FleetManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'buses' | 'drivers' | 'routes'>('buses');

  // Selected for Document Vault Inspection Modals
  const [selectedCarForDocs, setSelectedCarForDocs] = useState<BusItem | null>(null);
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<DriverItem | null>(null);

  // Cars State with Client's 6 Mandatory Vehicle Documents
  const [buses, setBuses] = useState<BusItem[]>([
    {
      id: '1',
      reg_no: 'MH-12-DT-0001',
      make: 'Tata Motors',
      model: 'Nexon EV Max',
      capacity: 5,
      tracking_source: 'phone',
      is_active: true,
      documents: {
        rc: { docNo: 'MH12-2023-008914', validUntil: '2038-03-15', status: 'verified' },
        roadTax: { receiptNo: 'RTX-MH12-2023-4412', validUntil: '2028-03-31', status: 'verified' },
        puc: { certNo: 'PUC-MH12-887412', validUntil: '2027-04-10', status: 'verified' },
        insurance: { policyNo: 'HDFC-ERGO-COMM-991823', insurer: 'HDFC ERGO General Insurance', validUntil: '2027-08-20', status: 'verified' },
        permit: { permitNo: 'MH-12-CP-2023-1102', type: 'State Contract Carriage', validUntil: '2028-05-15', status: 'verified' },
        fitness: { certNo: 'FC-RTO-PUN-2024-991', validUntil: '2027-06-30', status: 'verified' },
      },
    },
    {
      id: '2',
      reg_no: 'MH-12-DT-0002',
      make: 'MG Motor',
      model: 'ZS EV Exclusive',
      capacity: 5,
      tracking_source: 'phone',
      is_active: true,
      documents: {
        rc: { docNo: 'MH12-2023-009122', validUntil: '2038-06-20', status: 'verified' },
        roadTax: { receiptNo: 'RTX-MH12-2023-5590', validUntil: '2028-06-30', status: 'verified' },
        puc: { certNo: 'PUC-MH12-991044', validUntil: '2027-02-15', status: 'verified' },
        insurance: { policyNo: 'BAJAJ-ALLIANZ-771899', insurer: 'Bajaj Allianz Commercial', validUntil: '2027-07-12', status: 'verified' },
        permit: { permitNo: 'MH-12-CP-2023-1250', type: 'State Contract Carriage', validUntil: '2028-07-01', status: 'verified' },
        fitness: { certNo: 'FC-RTO-PUN-2024-1044', validUntil: '2027-08-15', status: 'verified' },
      },
    },
    {
      id: '3',
      reg_no: 'MH-12-DT-0003',
      make: 'Hyundai',
      model: 'Ioniq 5 Electric',
      capacity: 5,
      tracking_source: 'phone',
      is_active: true,
      documents: {
        rc: { docNo: 'MH12-2024-001889', validUntil: '2039-01-10', status: 'verified' },
        roadTax: { receiptNo: 'RTX-MH12-2024-0120', validUntil: '2029-01-31', status: 'verified' },
        puc: { certNo: 'PUC-MH12-104921', validUntil: '2026-11-15', status: 'expiring_soon' },
        insurance: { policyNo: 'ICICI-LOMBARD-448102', insurer: 'ICICI Lombard General', validUntil: '2027-03-25', status: 'verified' },
        permit: { permitNo: 'MH-12-AITP-2024-009', type: 'All India Tourist Permit', validUntil: '2029-01-15', status: 'verified' },
        fitness: { certNo: 'FC-RTO-PUN-2025-0112', validUntil: '2028-01-10', status: 'verified' },
      },
    },
    {
      id: '4',
      reg_no: 'MH-12-DT-0004',
      make: 'Mahindra',
      model: 'XUV400 EV Pro',
      capacity: 5,
      tracking_source: 'phone',
      is_active: true,
      documents: {
        rc: { docNo: 'MH12-2024-004512', validUntil: '2039-05-18', status: 'verified' },
        roadTax: { receiptNo: 'RTX-MH12-2024-1189', validUntil: '2029-05-31', status: 'verified' },
        puc: { certNo: 'PUC-MH12-330198', validUntil: '2027-05-10', status: 'verified' },
        insurance: { policyNo: 'TATA-AIG-COMM-229104', insurer: 'Tata AIG General Insurance', validUntil: '2027-06-18', status: 'verified' },
        permit: { permitNo: 'MH-12-CP-2024-3310', type: 'State Contract Carriage', validUntil: '2029-05-18', status: 'verified' },
        fitness: { certNo: 'FC-RTO-PUN-2025-0489', validUntil: '2028-05-18', status: 'verified' },
      },
    },
  ]);

  // Add Car Modal Form State
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newRegNo, setNewRegNo] = useState('');
  const [newBusModel, setNewBusModel] = useState('Tata Nexon EV Max');
  const [newCapacity, setNewCapacity] = useState(5);
  const [newRcNo, setNewRcNo] = useState('');
  const [newRoadTaxNo, setNewRoadTaxNo] = useState('');
  const [newPucNo, setNewPucNo] = useState('');
  const [newInsuranceNo, setNewInsuranceNo] = useState('');
  const [newInsuranceInsurer, setNewInsuranceInsurer] = useState('HDFC ERGO General Insurance');
  const [newPermitNo, setNewPermitNo] = useState('');
  const [newFitnessNo, setNewFitnessNo] = useState('');

  // Drivers State with Client's 5 Required Driver Documents
  const [drivers, setDrivers] = useState<DriverItem[]>([
    {
      id: '1',
      name: 'Ganesh Jadhav',
      phone: '+919822001122',
      license: 'MH-14-2018-0045129',
      class: 'HMV-Passenger',
      address: 'Kothrud, Pune',
      pin: '123456',
      duty_status: 'on_duty',
      documents: {
        aadhaar: { docNo: 'XXXX-XXXX-4812', status: 'verified' },
        policeVerification: { certNo: 'PUN-POL-2024-1189', policeStation: 'Kothrud Police Station', validUntil: '2027-11-20', status: 'verified' },
        medicalFitness: { certNo: 'MED-FIT-88914', doctorName: 'Dr. S. K. Joshi (MBBS)', doctorReg: 'MMC-2004-0981', validUntil: '2027-10-15', status: 'verified' },
        drivingLicence: { licenseNo: 'MH-14-2018-0045129', classType: 'HMV-Passenger (Commercial)', validUntil: '2029-04-18', status: 'verified' },
        contactNumber: { phone: '+919822001122', isVerified: true },
      },
    },
    {
      id: '2',
      name: 'Sunil Patil',
      phone: '+919822003344',
      license: 'MH-12-2019-0098432',
      class: 'HMV-Passenger',
      address: 'Hadapsar, Pune',
      pin: '654321',
      duty_status: 'on_duty',
      documents: {
        aadhaar: { docNo: 'XXXX-XXXX-8921', status: 'verified' },
        policeVerification: { certNo: 'PUN-POL-2024-2204', policeStation: 'Hadapsar Police Station', validUntil: '2027-09-10', status: 'verified' },
        medicalFitness: { certNo: 'MED-FIT-99120', doctorName: 'Dr. A. N. Kulkarni (MD)', doctorReg: 'MMC-1998-1145', validUntil: '2027-08-30', status: 'verified' },
        drivingLicence: { licenseNo: 'MH-12-2019-0098432', classType: 'HMV-Passenger (Commercial)', validUntil: '2029-08-11', status: 'verified' },
        contactNumber: { phone: '+919822003344', isVerified: true },
      },
    },
    {
      id: '3',
      name: 'Ramesh More',
      phone: '+919822005566',
      license: 'MH-14-2020-0012876',
      class: 'HMV-Passenger',
      address: 'Nigdi, Pune',
      pin: '112233',
      duty_status: 'off_duty',
      documents: {
        aadhaar: { docNo: 'XXXX-XXXX-3341', status: 'verified' },
        policeVerification: { certNo: 'PUN-POL-2024-3419', policeStation: 'Nigdi Police Station', validUntil: '2026-12-05', status: 'expiring_soon' },
        medicalFitness: { certNo: 'MED-FIT-77142', doctorName: 'Dr. V. B. Shinde (MBBS)', doctorReg: 'MMC-2012-0451', validUntil: '2027-04-12', status: 'verified' },
        drivingLicence: { licenseNo: 'MH-14-2020-0012876', classType: 'HMV-Passenger (Commercial)', validUntil: '2030-01-20', status: 'verified' },
        contactNumber: { phone: '+919822005566', isVerified: true },
      },
    },
  ]);

  // Add Driver Modal Form State
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverLicense, setNewDriverLicense] = useState('');
  const [newDriverAddress, setNewDriverAddress] = useState('');
  const [newAadhaarNo, setNewAadhaarNo] = useState('');
  const [newPoliceStation, setNewPoliceStation] = useState('Shivajinagar Police Station');
  const [newDoctorName, setNewDoctorName] = useState('Dr. P. R. Deshmukh (MBBS, MMC-2010)');

  // Routes State
  const [routes, setRoutes] = useState([
    { id: '1', code: 'RT-501', name: 'Swargate to Nigdi Express', distance_km: 24.5, stops: ['Swargate Terminal', 'Shivajinagar', 'Khadki', 'Chinchwad', 'Nigdi'] },
    { id: '2', code: 'RT-505', name: 'Katraj to Hinjawadi IT Park', distance_km: 31.2, stops: ['Katraj Depot', 'Warje Flyover', 'Chandani Chowk', 'Baner', 'Hinjawadi Phase 3'] },
  ]);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [newRouteCode, setNewRouteCode] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDistance, setNewRouteDistance] = useState(25.0);

  // Handle Add Bus with 6 Mandatory Documents
  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNo) return;

    const newVehicleDocs: VehicleMandatoryDocs = {
      rc: { docNo: newRcNo || `RC-${newRegNo}`, validUntil: '2039-01-01', status: 'verified' },
      roadTax: { receiptNo: newRoadTaxNo || `RTX-${newRegNo}-2026`, validUntil: '2029-03-31', status: 'verified' },
      puc: { certNo: newPucNo || `PUC-${newRegNo}-99`, validUntil: '2027-04-01', status: 'verified' },
      insurance: { policyNo: newInsuranceNo || `INS-${newRegNo}-881`, insurer: newInsuranceInsurer, validUntil: '2027-05-15', status: 'verified' },
      permit: { permitNo: newPermitNo || `PMT-${newRegNo}-01`, type: 'State Contract Carriage', validUntil: '2029-01-01', status: 'verified' },
      fitness: { certNo: newFitnessNo || `FIT-${newRegNo}-001`, validUntil: '2028-06-30', status: 'verified' },
    };

    const newBusItem: BusItem = {
      id: String(buses.length + 1),
      reg_no: newRegNo,
      make: 'Tata Motors',
      model: newBusModel,
      capacity: Number(newCapacity),
      tracking_source: 'phone',
      is_active: true,
      documents: newVehicleDocs,
    };

    setBuses((prev) => [...prev, newBusItem]);
    setNewRegNo('');
    setNewRcNo('');
    setNewRoadTaxNo('');
    setNewPucNo('');
    setNewInsuranceNo('');
    setNewPermitNo('');
    setNewFitnessNo('');
    setShowAddBusModal(false);
  };

  // Handle Add Driver with 5 Required Documents
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone || !newDriverLicense) return;

    const newDriverDocs: DriverRequiredDocs = {
      aadhaar: { docNo: newAadhaarNo || 'XXXX-XXXX-9912', status: 'verified' },
      policeVerification: { certNo: `PUN-POL-${Date.now().toString().slice(-4)}`, policeStation: newPoliceStation, validUntil: '2027-12-31', status: 'verified' },
      medicalFitness: { certNo: `MED-FIT-${Date.now().toString().slice(-4)}`, doctorName: newDoctorName, doctorReg: 'MMC-2015-0812', validUntil: '2027-10-30', status: 'verified' },
      drivingLicence: { licenseNo: newDriverLicense, classType: 'HMV-Passenger (Commercial)', validUntil: '2030-05-15', status: 'verified' },
      contactNumber: { phone: newDriverPhone, isVerified: true },
    };

    const newDriverItem: DriverItem = {
      id: String(drivers.length + 1),
      name: newDriverName,
      phone: newDriverPhone,
      license: newDriverLicense,
      class: 'HMV-Passenger',
      address: newDriverAddress || 'Pune, MH',
      pin: '123456',
      duty_status: 'on_duty',
      documents: newDriverDocs,
    };

    setDrivers((prev) => [...prev, newDriverItem]);
    setNewDriverName('');
    setNewDriverPhone('');
    setNewDriverLicense('');
    setNewDriverAddress('');
    setNewAadhaarNo('');
    setShowAddDriverModal(false);
  };

  // Handle Add Route
  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteCode || !newRouteName) return;

    setRoutes((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        code: newRouteCode,
        name: newRouteName,
        distance_km: Number(newRouteDistance),
        stops: ['Station Terminal', 'Midpoint Transit', 'Depot Destination'],
      },
    ]);
    setNewRouteCode('');
    setNewRouteName('');
    setShowAddRouteModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-6 space-y-4 sm:space-y-6 text-slate-800 text-xs font-sans">
      {/* Header */}
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
            onClick={() => setActiveTab('buses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'buses'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5 shrink-0" />
            <span>1. Cars & Vehicle Documents ({buses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('drivers')}
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
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'routes'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>3. Routes ({routes.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CARS & MANDATORY VEHICLE DOCUMENTS */}
      {activeTab === 'buses' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Mandatory Vehicle Documents Compliance Register</h2>
              <p className="text-[11px] text-slate-500">
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

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase font-semibold">
                  <th className="pb-3">Vehicle Reg No</th>
                  <th className="pb-3">Make & Model</th>
                  <th className="pb-3">Mandatory Documents Status</th>
                  <th className="pb-3">Tracking Mode</th>
                  <th className="pb-3">Fleet Status</th>
                  <th className="pb-3 text-right">Compliance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {buses.map((b) => {
                  const hasExpiring = b.documents && Object.values(b.documents).some((d: any) => d.status === 'expiring_soon');

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-bold text-slate-900 text-xs">{b.reg_no}</td>
                      <td className="py-3 font-sans font-medium">{b.make} — {b.model}</td>
                      <td className="py-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
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
                        </div>
                      </td>
                      <td className="py-3 uppercase text-indigo-600 font-bold text-[10px]">Android / iOS Phone</td>
                      <td className="py-3 text-emerald-600 font-sans font-semibold">Active In Fleet</td>
                      <td className="py-3 text-right font-sans">
                        <button
                          onClick={() => setSelectedCarForDocs(b)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Inspect 6 Docs</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DRIVERS & MANDATORY REQUIRED DOCUMENTS */}
      {activeTab === 'drivers' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Driver Roster & Mandatory KYC Dossier Register</h2>
              <p className="text-[11px] text-slate-500">
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

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase font-semibold">
                  <th className="pb-3">Driver Name</th>
                  <th className="pb-3">Verified Contact</th>
                  <th className="pb-3">License Number</th>
                  <th className="pb-3">Mandatory Dossier</th>
                  <th className="pb-3">Duty Status</th>
                  <th className="pb-3 text-right">Dossier Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {drivers.map((d) => {
                  const hasExpiring = d.documents && Object.values(d.documents).some((doc: any) => doc.status === 'expiring_soon');

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-bold font-sans text-slate-900 text-xs">{d.name}</td>
                      <td className="py-3 text-indigo-600 font-semibold">{d.phone}</td>
                      <td className="py-3 font-semibold text-slate-800">{d.license}</td>
                      <td className="py-3 font-sans">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
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
                      <td className="py-3 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ON DUTY
                        </span>
                      </td>
                      <td className="py-3 text-right font-sans">
                        <button
                          onClick={() => setSelectedDriverForDocs(d)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-2xs"
                        >
                          <Award className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View 5 Docs</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROUTES & STOPS MANAGEMENT */}
      {activeTab === 'routes' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Route Corridors & Versioned Stops (§4 & §10.3)</h2>
              <p className="text-[11px] text-slate-500">Routes are versioned so modifying stops never alters historical trip logs.</p>
            </div>
            <button
              onClick={() => setShowAddRouteModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create Route Corridor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((r) => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded-lg text-xs">
                      {r.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs">{r.name}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{r.distance_km} km</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Ordered Stop Sequence
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {r.stops.map((stop, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-1 bg-white rounded-lg border border-slate-200 text-[10px] text-slate-700 font-medium shadow-2xs"
                      >
                        {sIdx + 1}. {stop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: MANDATORY VEHICLE DOCUMENTS VAULT */}
      {selectedCarForDocs && (
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
                      {selectedCarForDocs.reg_no}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedCarForDocs.make} — {selectedCarForDocs.model} • Motor Vehicles Act Compliance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCarForDocs(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist of 6 Mandatory Documents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* 1. Registration Certificate (RC) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    <span>1. Registration Certificate (RC)</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                    VERIFIED
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Doc #: <strong>{selectedCarForDocs.documents.rc.docNo}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  Valid Until: {selectedCarForDocs.documents.rc.validUntil}
                </div>
              </div>

              {/* 2. Road Tax Receipt */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>2. Road Tax Receipt</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                    PAID & ACTIVE
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Receipt #: <strong>{selectedCarForDocs.documents.roadTax.receiptNo}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  Tax Paid Validity: {selectedCarForDocs.documents.roadTax.validUntil}
                </div>
              </div>

              {/* 3. Pollution Under Control (PUC) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>3. PUC Certificate</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedCarForDocs.documents.puc.status === 'expiring_soon'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {selectedCarForDocs.documents.puc.status === 'expiring_soon' ? 'RENEWAL DUE' : 'VALID'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Cert #: <strong>{selectedCarForDocs.documents.puc.certNo}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  Valid Until: {selectedCarForDocs.documents.puc.validUntil}
                </div>
              </div>

              {/* 4. Valid Insurance */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>4. Commercial Insurance</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                    INSURED
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Policy #: <strong>{selectedCarForDocs.documents.insurance.policyNo}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  Insurer: {selectedCarForDocs.documents.insurance.insurer} (Expires: {selectedCarForDocs.documents.insurance.validUntil})
                </div>
              </div>

              {/* 5. Valid Permit */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>5. Valid Commercial Permit</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                    PERMIT ACTIVE
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Permit #: <strong>{selectedCarForDocs.documents.permit.permitNo}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  Type: {selectedCarForDocs.documents.permit.type} (Expires: {selectedCarForDocs.documents.permit.validUntil})
                </div>
              </div>

              {/* 6. Fitness Certificate */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>6. Fitness Certificate (FC)</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                    FIT APPROVED
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Cert #: <strong>{selectedCarForDocs.documents.fitness.certNo}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  RTO Inspected Valid Until: {selectedCarForDocs.documents.fitness.validUntil}
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
              <button
                onClick={() => setSelectedDriverForDocs(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist of 5 Required Driver Documents */}
            <div className="space-y-3 text-xs">
              {/* 1. Aadhaar Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
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
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                  VERIFIED
                </span>
              </div>

              {/* 2. Police Verification Certificate */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
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
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                    selectedDriverForDocs.documents.policeVerification.status === 'expiring_soon'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {selectedDriverForDocs.documents.policeVerification.status === 'expiring_soon' ? 'RENEWAL DUE' : 'CLEARED'}
                </span>
              </div>

              {/* 3. Medical Fitness Certificate */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
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
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                  MEDICALLY FIT
                </span>
              </div>

              {/* 4. Valid Driving Licence */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
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
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                  ACTIVE LICENCE
                </span>
              </div>

              {/* 5. Contact Number */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span>5. Contact Number (Login Phone)</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">
                    Primary Phone: <strong>{selectedDriverForDocs.documents.contactNumber.phone}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Real-time SMS & OTP Dispatch Link Established
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                  OTP VERIFIED
                </span>
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
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add New Vehicle & Link Mandatory Documents</h3>
                <p className="text-[11px] text-slate-500">Includes all 6 client mandatory transport certificates.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBusModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Vehicle Registration Number *</label>
                <input
                  type="text"
                  placeholder="MH-12-DT-0005"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono uppercase focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Car Make & Model *</label>
                <input
                  type="text"
                  value={newBusModel}
                  onChange={(e) => setNewBusModel(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Passenger Seating Capacity</label>
                <input
                  type="number"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Client Mandatory Vehicle Documents Section */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Mandatory Vehicle Documents Submission (6 Items)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">1. Registration Certificate (RC) No *</label>
                  <input
                    type="text"
                    placeholder="MH12-2024-00981"
                    value={newRcNo}
                    onChange={(e) => setNewRcNo(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono uppercase focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">2. Road Tax Receipt No *</label>
                  <input
                    type="text"
                    placeholder="RTX-MH12-2024-991"
                    value={newRoadTaxNo}
                    onChange={(e) => setNewRoadTaxNo(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono uppercase focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">3. PUC Certificate No *</label>
                  <input
                    type="text"
                    placeholder="PUC-MH12-44109"
                    value={newPucNo}
                    onChange={(e) => setNewPucNo(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono uppercase focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">4. Insurance Policy & Insurer *</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="Policy No"
                      value={newInsuranceNo}
                      onChange={(e) => setNewInsuranceNo(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Insurer Name"
                      value={newInsuranceInsurer}
                      onChange={(e) => setNewInsuranceInsurer(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-indigo-600 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">5. Valid Permit No *</label>
                  <input
                    type="text"
                    placeholder="MH12-CP-2024-001"
                    value={newPermitNo}
                    onChange={(e) => setNewPermitNo(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">6. Fitness Certificate (FC) No *</label>
                  <input
                    type="text"
                    placeholder="FC-RTO-2025-101"
                    value={newFitnessNo}
                    onChange={(e) => setNewFitnessNo(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                  />
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
              >
                Register Car & Link All 6 Documents
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
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Enroll Driver & Link Mandatory Documents</h3>
                <p className="text-[11px] text-slate-500">Includes all 5 client mandatory KYC documents.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDriverModal(false)}
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
                  placeholder="Santosh Gaikwad"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">5. Contact Number (Login ID) *</label>
                <input
                  type="text"
                  placeholder="+919822007788"
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-700 block mb-1 font-semibold">Residential Address</label>
                <input
                  type="text"
                  placeholder="Shivajinagar, Pune"
                  value={newDriverAddress}
                  onChange={(e) => setNewDriverAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Client Mandatory Driver Documents Section */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Driver Documents Required (Client Compliance)</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">1. Aadhaar Card Number (12 Digits) *</label>
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-4512"
                    value={newAadhaarNo}
                    onChange={(e) => setNewAadhaarNo(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">2. Police Verification Certificate Issuing Station *</label>
                  <input
                    type="text"
                    value={newPoliceStation}
                    onChange={(e) => setNewPoliceStation(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">3. Medical Fitness Certificate (Doctor & Reg No) *</label>
                  <input
                    type="text"
                    value={newDoctorName}
                    onChange={(e) => setNewDoctorName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1 font-semibold">4. Valid Driving Licence Number (HMV/Commercial) *</label>
                  <input
                    type="text"
                    placeholder="MH-14-2021-0078912"
                    value={newDriverLicense}
                    onChange={(e) => setNewDriverLicense(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                  />
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
              >
                Enroll Driver & Verify 5 Documents
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: CREATE ROUTE */}
      {showAddRouteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleAddRoute}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <h3 className="font-bold text-base text-slate-900">Create Route Corridor</h3>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Route Code</label>
              <input
                type="text"
                placeholder="RT-601"
                value={newRouteCode}
                onChange={(e) => setNewRouteCode(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono uppercase focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Route Name (Origin to Destination)</label>
              <input
                type="text"
                placeholder="Pune Station to Kothrud Depot"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Total Corridor Distance (km)</label>
              <input
                type="number"
                value={newRouteDistance}
                onChange={(e) => setNewRouteDistance(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRouteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
              >
                Create Route
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
