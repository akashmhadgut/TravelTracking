import React, { useState, useEffect } from 'react';
import {
  Car,
  Phone,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock,
  MapPin,
  Battery,
  Gauge,
  Copy,
  Check,
  ExternalLink,
  Shield,
  RefreshCw,
  X,
  Radio,
  History,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type { LatestBusLocation } from '@fleet/contracts';

export interface SupervisorInstructionItem {
  id: string;
  bus_id: string;
  bus_reg: string;
  driver_name: string;
  driver_phone?: string;
  supervisor_name: string;
  category: string;
  message: string;
  priority: 'normal' | 'urgent';
  sent_at: string;
  status: 'sent' | 'delivered' | 'acknowledged';
  ack_reply?: string;
  ack_at?: string;
}

interface SupervisorCarInspectionDrawerProps {
  car: LatestBusLocation;
  supervisorName: string;
  onClose: () => void;
  onOpenReplay: () => void;
  onInstructionSent?: (instruction: SupervisorInstructionItem) => void;
}

export const SupervisorCarInspectionDrawer: React.FC<SupervisorCarInspectionDrawerProps> = ({
  car,
  supervisorName,
  onClose,
  onOpenReplay,
  onInstructionSent,
}) => {
  const [activeTab, setActiveTab] = useState<'driver' | 'message' | 'cleanliness' | 'telemetry'>('driver');
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Message Sending Form State
  const [messageText, setMessageText] = useState('');
  const [messageCategory, setMessageCategory] = useState<'stop_inquiry' | 'route_resume' | 'cleanliness_check' | 'safety_alert' | 'custom'>('stop_inquiry');
  const [messagePriority, setMessagePriority] = useState<'normal' | 'urgent'>('normal');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Cleanliness Form State
  const [cleanlinessStatus, setCleanlinessStatus] = useState<'clean' | 'needs_cleaning' | 'in_progress'>(
    ((car as any).cleanliness_status as any) || 'clean'
  );
  const [checklist, setChecklist] = useState({
    interior: true,
    exterior: true,
    sanitized: true,
    ac_fresh: true,
  });
  const [cleanlinessNote, setCleanlinessNote] = useState('');
  const [isSavingCleanliness, setIsSavingCleanliness] = useState(false);
  const [cleanlinessSavedAlert, setCleanlinessSavedAlert] = useState(false);

  // Instructions History for this car
  const [instructionHistory, setInstructionHistory] = useState<SupervisorInstructionItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const regNo = (car as any).reg_no || `MH-12-DT-${car.bus_id.slice(-4).toUpperCase()}`;
  const model = (car as any).model || 'Nexon EV Max';
  const make = (car as any).make || 'Tata Motors';
  const isStopped = car.status === 'stopped';
  const driverName = (car as any).driver_name || 'Sunil Patil';
  const driverPhone = (car as any).driver_phone || '+91 98220 03344';
  const driverLicense = (car as any).driver_license || 'MH-12-2019-0098432 (Commercial HMV)';
  const driverRating = (car as any).driver_rating || 4.8;
  const stoppedReason = (car as any).stopped_reason || 'Stationary halt near transit stop / Junction';

  // Load past instructions for this car
  useEffect(() => {
    setIsLoadingHistory(true);
    fetch(`/v1/supervisor/instructions?bus_id=${car.bus_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setInstructionHistory(data.items);
        }
      })
      .catch((err) => console.error('Failed to fetch instructions:', err))
      .finally(() => setIsLoadingHistory(false));
  }, [car.bus_id]);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(driverPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSelectPreset = (text: string, category: 'stop_inquiry' | 'route_resume' | 'cleanliness_check' | 'safety_alert' | 'custom') => {
    setMessageText(text);
    setMessageCategory(category);
    setActiveTab('message');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    setIsSending(true);
    try {
      const payload = {
        bus_id: car.bus_id,
        bus_reg: regNo,
        driver_id: (car as any).driver_id,
        driver_name: driverName,
        driver_phone: driverPhone,
        supervisor_name: supervisorName || 'Anand Shinde (Supervisor)',
        category: messageCategory,
        message: messageText.trim(),
        priority: messagePriority,
      };

      const res = await fetch('/v1/supervisor/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setInstructionHistory((prev) => [data.instruction, ...prev]);
        setSendSuccess(true);
        setMessageText('');
        if (onInstructionSent) onInstructionSent(data.instruction);
        setTimeout(() => setSendSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to send supervisor instruction:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveCleanliness = async (newStatus: 'clean' | 'needs_cleaning' | 'in_progress') => {
    setIsSavingCleanliness(true);
    try {
      const payload = {
        bus_id: car.bus_id,
        status: newStatus,
        interior_clean: checklist.interior,
        exterior_clean: checklist.exterior,
        sanitized: checklist.sanitized,
        ac_fresh: checklist.ac_fresh,
        inspected_by: supervisorName || 'Anand Shinde (Supervisor)',
        notes: cleanlinessNote,
      };

      const res = await fetch('/v1/supervisor/cleanliness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCleanlinessStatus(newStatus);
        (car as any).cleanliness_status = newStatus;
        setCleanlinessSavedAlert(true);
        setTimeout(() => setCleanlinessSavedAlert(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save cleanliness report:', err);
    } finally {
      setIsSavingCleanliness(false);
    }
  };

  const rawPhone = driverPhone.replace(/\\D/g, '');
  const cleanPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${driverName}, this is Supervisor ${supervisorName} from Deccan Transit Control Room. Regarding vehicle ${regNo} (${isStopped ? 'currently stopped' : 'in service'}): please report your current status.`
  )}`;

  return (
    <div className="absolute top-3 right-3 bottom-3 w-[420px] max-w-[95vw] bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-30 flex flex-col text-slate-100 font-sans overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Top Vehicle Status Header Banner */}
      <div className={`p-4 border-b ${isStopped ? 'bg-rose-950/40 border-rose-900/50' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm ${
                car.status === 'moving'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : car.status === 'stopped'
                  ? 'bg-rose-600 text-white font-extrabold shadow-rose-900/40'
                  : car.status === 'stale'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isStopped && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
              {car.status}
              {isStopped && ' • 0 km/h'}
            </span>

            {/* Cleanliness Tag */}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                cleanlinessStatus === 'clean'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  : cleanlinessStatus === 'needs_cleaning'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                  : 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {cleanlinessStatus === 'clean'
                ? 'Certified Clean'
                : cleanlinessStatus === 'needs_cleaning'
                ? 'Cleanliness Check Req'
                : 'Washing in Depot'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vehicle Identity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isStopped ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-indigo-950 text-indigo-400 border-indigo-800'}`}>
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-base font-mono tracking-wide text-white leading-tight">
                {regNo}
              </div>
              <div className="text-xs text-slate-400">
                {make} • {model}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-end gap-1">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span>{car.battery_pct ?? 85}%</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">rev #{car.rev}</div>
          </div>
        </div>

        {/* If Stopped: Prominent Stoppage Diagnosis Box */}
        {isStopped && (
          <div className="mt-3 p-2.5 bg-rose-900/20 border border-rose-800/40 rounded-xl text-xs flex items-start gap-2.5 text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold text-rose-300">Stationary Alert: </span>
              <span>{stoppedReason}. Immediate supervisor contact recommended.</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs for Supervisor */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 shrink-0 text-xs">
        <button
          onClick={() => setActiveTab('driver')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'driver'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Driver Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('message')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'message'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Dispatch Notice</span>
        </button>

        <button
          onClick={() => setActiveTab('cleanliness')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'cleanliness'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Hygiene Desk</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'telemetry'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>Telemetry</span>
        </button>
      </div>

      {/* Main Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ================= TAB 1: DRIVER & DIRECT CONTACT ================= */}
        {activeTab === 'driver' && (
          <div className="space-y-4">
            {/* Driver Identity Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                {/* Avatar with Status Indicator */}
                <div className="relative shrink-0">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {driverName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 absolute -bottom-1 -right-1" title="Online On-Duty" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-white truncate">{driverName}</h3>
                    <span title="Verified Commercial Driver">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ID: DRV-{regNo.slice(-4)} • ⭐ {driverRating} Rating
                  </div>
                  <div className="text-[11px] text-indigo-400 font-medium mt-0.5">
                    {driverLicense}
                  </div>
                </div>
              </div>

              {/* Duty Shift Badges */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-900 text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Shift Started</span>
                  <span className="font-semibold text-slate-200">06:30 AM (Active Shift)</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Duty Status</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> On Duty (Assigned)
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Contact Actions Banner */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  Driver Direct Contact Phone
                </span>
                <span className="font-mono font-bold text-slate-200 text-xs">{driverPhone}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 1. Direct Phone Call */}
                <a
                  href={`tel:${driverPhone}`}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/20 text-center"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Driver</span>
                </a>

                {/* 2. WhatsApp Direct Message */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition border border-emerald-600/50 text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                {/* 3. Copy Phone Number */}
                <button
                  onClick={handleCopyPhone}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer text-center"
                >
                  {copiedPhone ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Stoppage Inquiries for Supervisor */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  Quick Inquiries for {isStopped ? 'Stopped Vehicle' : 'In-Transit Vehicle'}
                </span>
                <span className="text-[10px] text-indigo-400">Click to compose</span>
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    handleSelectPreset(
                      `Supervisor Notice (${supervisorName}): Reason for prolonged stop at current location? Please report immediately.`,
                      'stop_inquiry'
                    )
                  }
                  className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-between"
                >
                  <span>🛑 "Why is vehicle stopped? Report reason."</span>
                  <span className="text-indigo-400 font-mono text-[10px]">Send &rarr;</span>
                </button>

                <button
                  onClick={() =>
                    handleSelectPreset(
                      `Supervisor Notice (${supervisorName}): Traffic clear ahead. Please resume designated transit route immediately.`,
                      'route_resume'
                    )
                  }
                  className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-between"
                >
                  <span>🚦 "Signal cleared. Resume route now."</span>
                  <span className="text-indigo-400 font-mono text-[10px]">Send &rarr;</span>
                </button>

                <button
                  onClick={() =>
                    handleSelectPreset(
                      `Supervisor Inspection (${supervisorName}): Please perform mandatory passenger cabin cleanliness & sanitization check.`,
                      'cleanliness_check'
                    )
                  }
                  className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-between"
                >
                  <span>🧹 "Verify vehicle hygiene & cleanliness."</span>
                  <span className="text-indigo-400 font-mono text-[10px]">Send &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: DISPATCH MESSAGE / NOTIFICATION ================= */}
        {activeTab === 'message' && (
          <div className="space-y-4">
            {sendSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instruction successfully transmitted to Driver Terminal!</span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Recipient Driver Terminal
                </label>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>{driverName} ({regNo})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{driverPhone}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Supervisor Instruction Message
                  </label>
                  <span className="text-[10px] text-slate-500">Pushed to mobile HUD</span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Type dispatch instruction or operational query to driver..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Notice Category</label>
                  <select
                    value={messageCategory}
                    onChange={(e) => setMessageCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="stop_inquiry">🛑 Unscheduled Stop Inquiry</option>
                    <option value="route_resume">🚦 Route Resume Order</option>
                    <option value="cleanliness_check">🧹 Cleanliness Check</option>
                    <option value="safety_alert">⚠️ Safety Alert</option>
                    <option value="custom">💬 Custom Instruction</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Priority Level</label>
                  <select
                    value={messagePriority}
                    onChange={(e) => setMessagePriority(e.target.value as any)}
                    className={`w-full border rounded-lg p-2 text-xs focus:outline-none ${
                      messagePriority === 'urgent'
                        ? 'bg-rose-950/80 border-rose-800 text-rose-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="urgent">🚨 Urgent (Siren Alert)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSending || !messageText.trim()}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting Notice...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Notification to Driver</span>
                  </>
                )}
              </button>
            </form>

            {/* Instruction Activity Feed */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  Recent Transmission Feed for {regNo}
                </span>
                <span className="text-[10px] text-slate-500">{instructionHistory.length} notices</span>
              </div>

              {isLoadingHistory ? (
                <div className="text-center py-4 text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading transmissions...</span>
                </div>
              ) : instructionHistory.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-[11px]">
                  No previous instructions logged for this shift.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {instructionHistory.map((inst) => (
                    <div
                      key={inst.id}
                      className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-indigo-400">{inst.supervisor_name}</span>
                        <span className="text-slate-500 font-mono">
                          {new Date(inst.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-snug">{inst.message}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            inst.status === 'acknowledged' ? 'text-emerald-400' : 'text-sky-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {inst.status === 'acknowledged' ? 'Driver Acknowledged' : 'Delivered'}
                        </span>
                        {inst.ack_reply && (
                          <span className="text-slate-400 italic">"{inst.ack_reply}"</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: CLEANLINESS & HYGIENE DESK ================= */}
        {activeTab === 'cleanliness' && (
          <div className="space-y-4">
            {cleanlinessSavedAlert && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Vehicle Cleanliness Inspection Logged & Certified!</span>
              </div>
            )}

            {/* Cleanliness Status Header */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Vehicle Hygiene Audit
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    cleanlinessStatus === 'clean'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : cleanlinessStatus === 'needs_cleaning'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-sky-950 text-sky-400 border border-sky-800'
                  }`}
                >
                  {cleanlinessStatus === 'clean'
                    ? 'Certified Clean'
                    : cleanlinessStatus === 'needs_cleaning'
                    ? 'Needs Cleaning'
                    : 'Wash In Progress'}
                </span>
              </div>

              {/* 4-Point Supervisor Inspection Checklist */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <label className="flex items-center gap-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.interior}
                    onChange={(e) => setChecklist({ ...checklist, interior: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Passenger Cabin & Seats</span>
                    <span className="text-[10px] text-slate-400">Seats vacuumed, floor mats spotless & dry</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.exterior}
                    onChange={(e) => setChecklist({ ...checklist, exterior: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Exterior Body & Windows</span>
                    <span className="text-[10px] text-slate-400">Windshield clear, body washed, mirrors clean</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.sanitized}
                    onChange={(e) => setChecklist({ ...checklist, sanitized: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Sanitization & Waste Bin</span>
                    <span className="text-[10px] text-slate-400">Bin emptied, contact handles sanitized</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.ac_fresh}
                    onChange={(e) => setChecklist({ ...checklist, ac_fresh: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-white block">Climate & Air Quality</span>
                    <span className="text-[10px] text-slate-400">Air vents clean, cabin fragrance fresh</span>
                  </div>
                </label>
              </div>

              {/* Inspection Notes */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Optional supervisor notes (e.g. spotless condition)..."
                  value={cleanlinessNote}
                  onChange={(e) => setCleanlinessNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cleanliness Status Change Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSavingCleanliness}
                  onClick={() => handleSaveCleanliness('clean')}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Certify Clean</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingCleanliness}
                  onClick={() => handleSaveCleanliness('needs_cleaning')}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flag for Wash</span>
                </button>
              </div>
            </div>

            {/* If Flagged: 1-Click Cleanliness Notice to Driver */}
            {cleanlinessStatus === 'needs_cleaning' && (
              <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Cleanliness Attention Needed</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Vehicle flagged by supervisor. Would you like to notify {driverName} to complete depot cleaning?
                </p>
                <button
                  onClick={() =>
                    handleSelectPreset(
                      `Supervisor Notice (${supervisorName}): Vehicle ${regNo} flagged for cleaning. Please wash passenger cabin and empty bins at depot before next dispatch.`,
                      'cleanliness_check'
                    )
                  }
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Cleaning Notice to Driver Terminal</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: TELEMETRY & ROUTE ================= */}
        {activeTab === 'telemetry' && (
          <div className="space-y-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-slate-500" /> Current Speed
                </span>
                <span className="font-bold font-mono text-white text-sm">
                  {car.speed_kmh?.toFixed(1) || '0.0'} km/h
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Status Duration
                </span>
                <span className="font-semibold text-white">
                  {isStopped ? 'Stationary (~22m)' : 'Active In-Transit'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> GPS Fix Accuracy
                </span>
                <span className="font-mono text-emerald-400">
                  ±{car.accuracy_m?.toFixed(1) || '4.8'} m (High Fix)
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Battery className="w-3.5 h-3.5 text-slate-500" /> Battery Telemetry
                </span>
                <span className="font-semibold text-white">
                  {car.battery_pct ?? 85}% • Phone Telemetry Link
                </span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">Monotonic Rev Sequence</span>
                <span className="font-mono text-indigo-400 font-bold">#{car.rev}</span>
              </div>
            </div>

            {/* Replay Path Trigger */}
            <button
              onClick={onOpenReplay}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span>Open Full Trip Breadcrumb Replay</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Quick Footer Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-amber-400" /> Supervisor Anand Shinde
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          Dismiss Panel
        </button>
      </div>
    </div>
  );
};
