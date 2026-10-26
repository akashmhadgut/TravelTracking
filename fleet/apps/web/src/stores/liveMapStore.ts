import { create } from 'zustand';
import type { LatestBusLocation, BusStatus } from '@fleet/contracts';

interface LiveMapState {
  busesById: Map<string, LatestBusLocation>;
  snapshotRev: bigint;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  lastHeartbeat: number;
  selectedBusId: string | null;

  // Actions as specified in Section 8.3 & 10.2
  setConnectionStatus: (status: 'connected' | 'reconnecting' | 'disconnected') => void;
  setSelectedBusId: (busId: string | null) => void;
  applySnapshot: (snapshotRev: string, buses: LatestBusLocation[]) => void;
  applyBatch: (items: LatestBusLocation[]) => void;
  applyStatus: (busId: string, status: BusStatus, statusSince: string, rev: string) => void;
}

export const useLiveMapStore = create<LiveMapState>((set) => ({
  busesById: new Map(),
  snapshotRev: 0n,
  connectionStatus: 'disconnected',
  lastHeartbeat: Date.now(),
  selectedBusId: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setSelectedBusId: (busId) => set({ selectedBusId: busId }),

  // Section 8.3: Snapshot initialization
  applySnapshot: (snapshotRevStr, buses) => {
    const rev = BigInt(snapshotRevStr);
    const map = new Map<string, LatestBusLocation>();
    for (const bus of buses) {
      map.set(bus.bus_id, bus);
    }
    set({
      busesById: map,
      snapshotRev: rev,
      lastHeartbeat: Date.now(),
      connectionStatus: 'connected',
    });
  },

  // Section 8.3: Apply batch updates ONLY if item.rev > current stored rev
  applyBatch: (items) => {
    set((state) => {
      const nextMap = new Map(state.busesById);
      let updated = false;

      for (const item of items) {
        const itemRev = BigInt(item.rev);
        const existing = nextMap.get(item.bus_id);

        if (!existing || itemRev > BigInt(existing.rev)) {
          nextMap.set(item.bus_id, item);
          updated = true;
        }
      }

      if (!updated) return state;
      return { busesById: nextMap, lastHeartbeat: Date.now() };
    });
  },

  // Section 8.3: Apply status event ONLY if rev > stored rev
  applyStatus: (busId, status, statusSince, revStr) => {
    set((state) => {
      const itemRev = BigInt(revStr);
      const existing = state.busesById.get(busId);
      if (!existing || itemRev <= BigInt(existing.rev)) {
        return state;
      }

      const nextMap = new Map(state.busesById);
      nextMap.set(busId, {
        ...existing,
        status,
        status_since: statusSince,
        rev: revStr,
      });

      return { busesById: nextMap, lastHeartbeat: Date.now() };
    });
  },
}));
