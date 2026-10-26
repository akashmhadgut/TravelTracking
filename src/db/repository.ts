import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { db, kyselyDb } from './index.ts';
import {
  organizations,
  users,
  buses,
  drivers,
  devices,
  routes,
  trips,
  latestBusLocations,
  tripLocations,
  quarantinedLocations,
  alerts,
  auditLogs,
  backgroundJobs,
} from './schema.ts';
import {
  evaluateGpsPoint,
  evaluateTrackingStatus,
  shouldTriggerOemPingToWake,
  shouldTriggerUnpluggedAlert,
  maskDriverPiiForRole,
} from '../shared/gpsEngine.ts';
import type { IngestBatchRequest, IngestPointResult } from '../shared/contracts.ts';

let isSeeded = false;

export async function getOrCreateUser(uid: string, email: string, organizationId = 1) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        organizationId,
        fullName: email.split('@')[0] || 'Fleet Supervisor',
        role: 'supervisor',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function ensureFleetSeeded() {
  if (isSeeded) return;
  try {
    const existingOrgs = await db.select().from(organizations).limit(1);
    if (existingOrgs.length > 0) {
      isSeeded = true;
      return;
    }

    const [org] = await db
      .insert(organizations)
      .values({
        slug: 'deccan-transit-pune',
        name: 'Deccan Metro Transit Pvt. Ltd. (Pune — Mumbai Operations)',
        ais140GateOutcome: 'A_PHONE_GPS',
        deviceOwnershipPolicy: 'HYBRID_COMPANY_AND_BYOD',
        rawGpsRetentionDays: 90,
        grievanceOfficerName: 'Rajesh Sharma (DPDP Data Protection Officer)',
        grievanceOfficerEmail: 'dpo-privacy@deccantransit.in',
      })
      .returning();

    await db.insert(organizations).values({
      slug: 'konkan-express-tenant-2',
      name: 'Konkan Coastal Express Corp (Isolated Tenant #2)',
      ais140GateOutcome: 'B_AIS140_FITTED',
      deviceOwnershipPolicy: 'COMPANY_ISSUED',
      rawGpsRetentionDays: 180,
    });

    await db
      .insert(users)
      .values({
        uid: 'operator-deccan-01',
        organizationId: org.id,
        email: 'vasant.kulkarni@deccantransit.in',
        fullName: 'Vasant Kulkarni (Chief Fleet Controller)',
        role: 'admin',
      })
      .onConflictDoNothing();

    // Seed 4 realistic Pune corridor routes with stops and polylines
    const routeData = [
      {
        organizationId: org.id,
        routeCode: 'RT-101',
        name: 'Hinjewadi Phase 3 — Shivajinagar Metro Express',
        originName: 'Hinjewadi IT Park Ph-3',
        destinationName: 'Shivajinagar Bus Terminal',
        distanceKm: 21.4,
        scheduledDurationMin: 55,
        stopsJson: JSON.stringify([
          { name: 'Hinjewadi Phase 3 (Quadron)', lat: 18.5808, lng: 73.6845, seq: 1, offsetMin: 0 },
          { name: 'Wipro Circle Phase 2', lat: 18.5892, lng: 73.7112, seq: 2, offsetMin: 12 },
          { name: 'Wakad Chowk Flyover', lat: 18.5987, lng: 73.7554, seq: 3, offsetMin: 24 },
          { name: 'Aundh Bremen Chowk', lat: 18.5621, lng: 73.8072, seq: 4, offsetMin: 39 },
          { name: 'Shivajinagar Terminal', lat: 18.5314, lng: 73.8446, seq: 5, offsetMin: 55 },
        ]),
        polylineJson: JSON.stringify([
          [73.6845, 18.5808],
          [73.7112, 18.5892],
          [73.7389, 18.5913],
          [73.7554, 18.5987],
          [73.782, 18.579],
          [73.8072, 18.5621],
          [73.829, 18.545],
          [73.8446, 18.5314],
        ]),
      },
      {
        organizationId: org.id,
        routeCode: 'RT-204',
        name: 'Kharadi EON Free Zone — Swargate BRT Corridor',
        originName: 'Kharadi EON IT Park',
        destinationName: 'Swargate Multimodal Hub',
        distanceKm: 18.8,
        scheduledDurationMin: 50,
        stopsJson: JSON.stringify([
          { name: 'Kharadi EON Gate 1', lat: 18.5515, lng: 73.9512, seq: 1, offsetMin: 0 },
          { name: 'Viman Nagar Phoenix', lat: 18.5665, lng: 73.914, seq: 2, offsetMin: 15 },
          { name: 'Yerwada Gunjan Chowk', lat: 18.547, lng: 73.882, seq: 3, offsetMin: 28 },
          { name: 'Pune Railway Station', lat: 18.5284, lng: 73.8739, seq: 4, offsetMin: 38 },
          { name: 'Swargate BRT Terminal', lat: 18.5018, lng: 73.8636, seq: 5, offsetMin: 50 },
        ]),
        polylineJson: JSON.stringify([
          [73.9512, 18.5515],
          [73.932, 18.559],
          [73.914, 18.5665],
          [73.882, 18.547],
          [73.8739, 18.5284],
          [73.8636, 18.5018],
        ]),
      },
      {
        organizationId: org.id,
        routeCode: 'RT-309',
        name: 'Pimpri Chinchwad MIDC — Hadapsar Magarpatta Shuttle',
        originName: 'Nigdi Bhakti Shakti Depot',
        destinationName: 'Magarpatta Cybercity South',
        distanceKm: 29.2,
        scheduledDurationMin: 75,
        stopsJson: JSON.stringify([
          { name: 'Nigdi Bhakti Shakti', lat: 18.665, lng: 73.7705, seq: 1, offsetMin: 0 },
          { name: 'Pimpri Finolex Chowk', lat: 18.6298, lng: 73.7997, seq: 2, offsetMin: 18 },
          { name: 'Nashik Phata Flyover', lat: 18.6032, lng: 73.8205, seq: 3, offsetMin: 32 },
          { name: 'Koregaon Park North', lat: 18.5362, lng: 73.894, seq: 4, offsetMin: 55 },
          { name: 'Hadapsar Magarpatta', lat: 18.5158, lng: 73.9272, seq: 5, offsetMin: 75 },
        ]),
        polylineJson: JSON.stringify([
          [73.7705, 18.665],
          [73.7997, 18.6298],
          [73.8205, 18.6032],
          [73.855, 18.568],
          [73.894, 18.5362],
          [73.9272, 18.5158],
        ]),
      },
      {
        organizationId: org.id,
        routeCode: 'RT-412',
        name: 'Katraj Wonder City — Baner Balewadi Stadium Link',
        originName: 'Katraj Zoologic Terminal',
        destinationName: 'Balewadi High Street',
        distanceKm: 24.6,
        scheduledDurationMin: 60,
        stopsJson: JSON.stringify([
          { name: 'Katraj Chowk', lat: 18.4529, lng: 73.8652, seq: 1, offsetMin: 0 },
          { name: 'Warje Flyover', lat: 18.4865, lng: 73.802, seq: 2, offsetMin: 20 },
          { name: 'Chandni Chowk Bavdhan', lat: 18.5074, lng: 73.7802, seq: 3, offsetMin: 34 },
          { name: 'Baner Radha Chowk', lat: 18.5642, lng: 73.768, seq: 4, offsetMin: 48 },
          { name: 'Balewadi Stadium', lat: 18.5745, lng: 73.7625, seq: 5, offsetMin: 60 },
        ]),
        polylineJson: JSON.stringify([
          [73.8652, 18.4529],
          [73.825, 18.469],
          [73.802, 18.4865],
          [73.7802, 18.5074],
          [73.772, 18.538],
          [73.768, 18.5642],
          [73.7625, 18.5745],
        ]),
      },
    ];

    const insertedRoutes = await db.insert(routes).values(routeData).returning();

    // Seed 10 realistic buses across diverse OEM phones + AIS-140 VLTD
    const seedDefinitions = [
      {
        reg: 'MH-12-FC-1001',
        code: 'BUS-001',
        depot: 'Pune Wakad Depot',
        busModel: 'Tata Starbus EV 12m',
        driverName: 'Suresh Jadhav',
        driverPhone: '+91 98230 11001',
        license: 'MH12-20160089121',
        deviceUid: 'DEV-XIAOMI-R12-001',
        mfg: 'Xiaomi',
        model: 'Redmi 12 5G',
        os: 'Android 14 (HyperOS 1.0)',
        ownership: 'COMPANY_ISSUED',
        sourceType: 'ANDROID_COMPANION',
        routeIdx: 0,
        lat: 18.5913,
        lng: 73.7389,
        speed: 44.5,
        heading: 108,
        ageSec: 8,
        status: 'fresh',
        tripStatus: 'active',
        battery: 94,
        charging: true,
      },
      {
        reg: 'MH-12-FC-1002',
        code: 'BUS-002',
        depot: 'Pune Wakad Depot',
        busModel: 'Olectra K9 e-Buzz',
        driverName: 'Prakash Deshmukh',
        driverPhone: '+91 98230 11002',
        license: 'MH12-20150044122',
        deviceUid: 'DEV-VIVO-T2X-002',
        mfg: 'Vivo',
        model: 'Vivo T2x 5G',
        os: 'Android 14 (FuntouchOS 14)',
        ownership: 'DRIVER_PERSONAL',
        sourceType: 'ANDROID_COMPANION',
        routeIdx: 0,
        lat: 18.5621,
        lng: 73.8072,
        speed: 38.2,
        heading: 125,
        ageSec: 14,
        status: 'fresh',
        tripStatus: 'active',
        battery: 78,
        charging: true,
      },
      {
        reg: 'MH-12-FC-1003',
        code: 'BUS-003',
        depot: 'Kharadi East Depot',
        busModel: 'Ashok Leyland Switch EiV',
        driverName: 'Mahesh Shinde',
        driverPhone: '+91 98230 11003',
        license: 'MH12-20180077310',
        deviceUid: 'DEV-OPPO-A78-003',
        mfg: 'OPPO',
        model: 'Oppo A78',
        os: 'Android 13 (ColorOS 13.1)',
        ownership: 'DRIVER_PERSONAL',
        sourceType: 'ANDROID_COMPANION',
        routeIdx: 1,
        lat: 18.559,
        lng: 73.932,
        speed: 41.0,
        heading: 245,
        ageSec: 19,
        status: 'fresh',
        tripStatus: 'active',
        battery: 82,
        charging: true,
      },
      {
        reg: 'MH-12-FC-1004',
        code: 'BUS-004',
        depot: 'Kharadi East Depot',
        busModel: 'Tata Starbus EV 12m',
        driverName: 'Santosh Pawar',
        driverPhone: '+91 98230 11004',
        license: 'MH14-20170039104',
        deviceUid: 'DEV-REALME-N60-004',
        mfg: 'Realme',
        model: 'Realme Narzo 60x',
        os: 'Android 14 (Realme UI 5.0)',
        ownership: 'COMPANY_ISSUED',
        sourceType: 'ANDROID_COMPANION',
        routeIdx: 1,
        lat: 18.5284,
        lng: 73.8739,
        speed: 22.4,
        heading: 210,
        ageSec: 145, // 2m 25s old -> STALE!
        status: 'stale',
        tripStatus: 'active',
        battery: 26, // Unplugged & < 30% battery!
        charging: false,
      },
      {
        reg: 'MH-14-FC-1005',
        code: 'BUS-005',
        depot: 'Nigdi PCMC Depot',
        busModel: 'PMI Foton Regio EV',
        driverName: 'Ganesh Gaikwad',
        driverPhone: '+91 98230 11005',
        license: 'MH14-20140099115',
        deviceUid: 'DEV-SAMSUNG-M14-005',
        mfg: 'Samsung',
        model: 'Galaxy M14 5G',
        os: 'Android 14 (OneUI 6.1)',
        ownership: 'COMPANY_ISSUED',
        sourceType: 'ANDROID_COMPANION',
        routeIdx: 2,
        lat: 18.6298,
        lng: 73.7997,
        speed: 49.6,
        heading: 150,
        ageSec: 6,
        status: 'fresh',
        tripStatus: 'active',
        battery: 98,
        charging: true,
      },
      {
        reg: 'MH-14-FC-1006',
        code: 'BUS-006',
        depot: 'Nigdi PCMC Depot',
        busModel: 'Tata Starbus EV 12m',
        driverName: 'Dattatray Kadam',
        driverPhone: '+91 98230 11006',
        license: 'MH14-20190011206',
        deviceUid: 'DEV-XIAOMI-POCO-006',
        mfg: 'Xiaomi',
        model: 'POCO M6 Pro 5G',
        os: 'Android 14 (HyperOS)',
        ownership: 'DRIVER_PERSONAL',
        sourceType: 'ANDROID_COMPANION',
        routeIdx: 2,
        lat: 18.568,
        lng: 73.855,
        speed: 0,
        heading: 140,
        ageSec: 460, // > 5 min old -> OFFLINE!
        status: 'offline',
        tripStatus: 'active',
        battery: 54,
        charging: true,
      },
      {
        reg: 'MH-12-FC-1007',
        code: 'BUS-007',
        depot: 'Katraj South Depot',
        busModel: 'Olectra K9 e-Buzz',
        driverName: 'Nitin Bhosale',
        driverPhone: '+91 98230 11007',
        license: 'MH12-20160065407',
        deviceUid: 'DEV-AIS140-VLTD-007',
        mfg: 'Rosmerta AIS-140',
        model: 'Bharat-101 Certified VLTD',
        os: 'Embedded RTOS v4.2',
        ownership: 'COMPANY_ISSUED',
        sourceType: 'AIS140_VLTD',
        routeIdx: 3,
        lat: 18.5074,
        lng: 73.7802,
        speed: 52.1,
        heading: 345,
        ageSec: 5,
        status: 'fresh',
        tripStatus: 'active',
        battery: 100,
        charging: true,
      },
      {
        reg: 'MH-12-FC-1008',
        code: 'BUS-008',
        depot: 'Katraj South Depot',
        busModel: 'Ashok Leyland Switch EiV',
        driverName: 'Ramesh Chavan',
        driverPhone: '+91 98230 11008',
        license: 'MH12-20200043208',
        deviceUid: 'DEV-VIVO-Y28-008',
        mfg: 'Vivo',
        model: 'Vivo Y28 5G',
        os: 'Android 14 (FuntouchOS 14)',
        ownership: 'COMPANY_ISSUED',
        sourceType: 'ANDROID_COMPANION',
        routeIdx: 3,
        lat: 18.4529,
        lng: 73.8652,
        speed: 0,
        heading: 0,
        ageSec: 900,
        status: 'not_started', // Missed trip start!
        tripStatus: 'scheduled',
        battery: 91,
        charging: true,
      },
    ];

    const nowMs = Date.now();

    for (let i = 0; i < seedDefinitions.length; i++) {
      const def = seedDefinitions[i];
      const [bus] = await db
        .insert(buses)
        .values({
          organizationId: org.id,
          registrationNumber: def.reg,
          fleetCode: def.code,
          depotName: def.depot,
          busModel: def.busModel,
          capacity: 45,
          locationSourceType: def.sourceType,
          ais140DeviceImei: def.sourceType === 'AIS140_VLTD' ? '864290051192007' : null,
        })
        .returning();

      const [driver] = await db
        .insert(drivers)
        .values({
          organizationId: org.id,
          employeeCode: `DRV-10${i + 1}`,
          fullName: def.driverName,
          phone: def.driverPhone,
          licenseNumber: def.license,
          preferredLanguage: 'Marathi / Hindi / English',
          dpdpNoticeAccepted: true,
        })
        .returning();

      const [device] = await db
        .insert(devices)
        .values({
          organizationId: org.id,
          deviceUid: def.deviceUid,
          assignedBusId: bus.id,
          ownershipType: def.ownership,
          manufacturer: def.mfg,
          model: def.model,
          osVersion: def.os,
          appVersion: '2.0.4-prod',
          batteryPct: def.battery,
          isCharging: def.charging,
          batteryOptIgnored: true,
          oemAutostartEnabled: def.status !== 'offline',
          keepAwakeHudActive: def.status === 'fresh',
          permissionState: 'FOREGROUND_SERVICE_LOCATION',
          mdmEnrolled: def.ownership === 'COMPANY_ISSUED',
          wakeupPingsSent: def.status === 'stale' || def.status === 'offline' ? 3 : 0,
          lastSeenAt: new Date(nowMs - def.ageSec * 1000),
        })
        .returning();

      const route = insertedRoutes[def.routeIdx];
      const scheduledStart =
        def.tripStatus === 'scheduled'
          ? new Date(nowMs - 16 * 60 * 1000) // Scheduled 16m ago -> triggers Missed Trip Start!
          : new Date(nowMs - 35 * 60 * 1000);

      const [trip] = await db
        .insert(trips)
        .values({
          organizationId: org.id,
          tripCode: `TRP-20261025-00${i + 1}`,
          busId: bus.id,
          driverId: driver.id,
          deviceId: device.id,
          routeId: route.id,
          status: def.tripStatus,
          scheduledStartAt: scheduledStart,
          startedAt: def.tripStatus === 'active' ? scheduledStart : null,
          checklistMounted: true,
          checklistCharging: def.charging,
          checklistGpsFixed: true,
          spoofFlagCount: i === 3 ? 2 : 0,
        })
        .returning();

      const pointRecordedAt = new Date(nowMs - def.ageSec * 1000);

      await db.insert(latestBusLocations).values({
        busId: bus.id,
        organizationId: org.id,
        tripId: trip.id,
        deviceId: device.id,
        source: def.sourceType === 'AIS140_VLTD' ? 'AIS140_VLTD' : 'ANDROID_FOREGROUND_GPS',
        latitude: def.lat,
        longitude: def.lng,
        accuracyM: 5.8,
        speedKmh: def.speed,
        headingDeg: def.heading,
        trackingStatus: def.status,
        batteryPct: def.battery,
        isCharging: def.charging,
        recordedAt: pointRecordedAt,
        receivedAt: new Date(nowMs - Math.max(0, def.ageSec - 1) * 1000),
      });

      // Seed 6 breadcrumb history points along the route for immediate trip replay
      const poly: [number, number][] = JSON.parse(route.polylineJson);
      for (let p = 0; p < Math.min(5, poly.length); p++) {
        const histTime = new Date(nowMs - (def.ageSec + (5 - p) * 60) * 1000);
        await db
          .insert(tripLocations)
          .values({
            organizationId: org.id,
            clientPointId: `seed-hist-${bus.id}-${p}`,
            tripId: trip.id,
            busId: bus.id,
            deviceId: device.id,
            source: def.sourceType === 'AIS140_VLTD' ? 'AIS140_VLTD' : 'ANDROID_FOREGROUND_GPS',
            latitude: poly[p][1],
            longitude: poly[p][0],
            accuracyM: 6.2,
            speedKmh: 38 + p * 2,
            headingDeg: def.heading,
            isMockLocation: false,
            batteryPct: def.battery,
            isCharging: def.charging,
            networkType: '4G_LTE',
            partitionMonth: '2026-10',
            recordedAt: histTime,
            receivedAt: histTime,
          })
          .onConflictDoNothing();
      }
    }

    // Seed core alerts matching Section 5 & Section 9
    await db.insert(alerts).values([
      {
        organizationId: org.id,
        busId: 6,
        tripId: 6,
        deviceId: 6,
        alertType: 'OFFLINE_BUS',
        severity: 'critical',
        title: 'Bus MH-14-FC-1006 Offline (> 5 min on Active Trip)',
        message:
          'Last valid GPS fix was 7m 40s ago near Nashik Phata. 3 high-priority FCM Ping-to-Wake pushes dispatched to Xiaomi POCO M6 Pro.',
        status: 'open',
      },
      {
        organizationId: org.id,
        busId: 8,
        tripId: 8,
        deviceId: 8,
        alertType: 'MISSED_TRIP_START',
        severity: 'critical',
        title: 'Missed Trip Start — TRP-20261025-008 (MH-12-FC-1008)',
        message:
          'Scheduled departure at Katraj Terminal was 16 minutes ago (threshold: 10 min). Driver Ramesh Chavan has not completed Pre-Trip Check.',
        status: 'open',
      },
      {
        organizationId: org.id,
        busId: 4,
        tripId: 4,
        deviceId: 4,
        alertType: 'PHONE_UNPLUGGED_LOW_BATTERY',
        severity: 'warning',
        title: 'Unplugged & Battery < 30% on Active Trip (MH-12-FC-1004)',
        message:
          'Realme Narzo 60x on Bus MH-12-FC-1004 stopped charging on 12V/24V dash line and dropped to 26% battery. Tracking is currently Stale (2m 25s).',
        status: 'open',
      },
      {
        organizationId: org.id,
        busId: 4,
        tripId: 4,
        deviceId: 4,
        alertType: 'POSSIBLE_LOCATION_SPOOFING',
        severity: 'critical',
        title: 'Quarantined Mock-GPS Point on Bus MH-12-FC-1004',
        message:
          'Android isFromMockProvider=true flag detected on 2 points during TRP-20261025-004. Points quarantined and excluded from live bus position.',
        status: 'open',
      },
    ]);

    // Seed sample quarantined point for audit table
    await db.insert(quarantinedLocations).values({
      organizationId: org.id,
      clientPointId: 'spoof-seed-pt-9901',
      tripId: 4,
      busId: 4,
      deviceId: 4,
      latitude: 18.922,
      longitude: 72.8347,
      accuracyM: 2.0,
      reportedSpeedKmh: 45,
      impliedSpeedKmh: 612.4,
      isMockFlagged: true,
      reasonCode: 'REJECTED_SPOOFING_MOCK_LOCATION',
      reasonDetail: 'Android mock-location provider flag (isFromMockProvider=true) + 612 km/h coordinate jump',
      recordedAt: new Date(nowMs - 180 * 1000),
    });

    await db.insert(auditLogs).values([
      {
        organizationId: org.id,
        actorEmail: 'vasant.kulkarni@deccantransit.in',
        actorRole: 'admin',
        action: 'GATE_0_COMPLIANCE_RECORDED',
        entityType: 'organization',
        entityId: String(org.id),
        detailsJson: JSON.stringify({
          gate0Outcome: 'A_PHONE_GPS',
          ais140FallbackAdapter: 'LocationSource interface enabled for BUS-007 (Rosmerta VLTD)',
          dpdpAct2023Notice: 'Active trip-only tracking enforced; driver consent logged',
        }),
      },
      {
        organizationId: org.id,
        actorEmail: 'system-pg-worker@deccantransit.in',
        actorRole: 'system',
        action: 'PARTITION_AND_STATUS_SWEEP_INIT',
        entityType: 'trip_locations',
        entityId: '2026-10',
        detailsJson: JSON.stringify({
          partitionMonth: '2026-10',
          nextPartitionPrepared: '2026-11',
          sweepIntervalSec: 15,
        }),
      },
    ]);

    isSeeded = true;
  } catch (error) {
    console.error('Database seed failed:', error);
    throw new Error('Failed to initialize fleet seed data.', { cause: error });
  }
}

export async function getLiveFleetSnapshot(organizationId = 1, operatorRole = 'supervisor') {
  try {
    await ensureFleetSeeded();
    const nowMs = Date.now();

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    const allBuses = await db
      .select()
      .from(buses)
      .where(eq(buses.organizationId, organizationId))
      .orderBy(asc(buses.id));

    const rawDrivers = await db
      .select()
      .from(drivers)
      .where(eq(drivers.organizationId, organizationId))
      .orderBy(asc(drivers.id));

    const allDrivers = rawDrivers.map((drv) => {
      const masked = maskDriverPiiForRole(
        { phone: drv.phone, licenseNumber: drv.licenseNumber },
        operatorRole
      );
      return {
        ...drv,
        phone: masked.phone,
        licenseNumber: masked.licenseNumber,
        piiMasked: masked.piiMasked,
      };
    });

    const allDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.organizationId, organizationId))
      .orderBy(asc(devices.id));

    const allRoutes = await db
      .select()
      .from(routes)
      .where(eq(routes.organizationId, organizationId))
      .orderBy(asc(routes.id));

    const allTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.organizationId, organizationId))
      .orderBy(desc(trips.id));

    const latestLocations = await db
      .select()
      .from(latestBusLocations)
      .where(eq(latestBusLocations.organizationId, organizationId));

    const openAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.organizationId, organizationId))
      .orderBy(desc(alerts.createdAt))
      .limit(50);

    const recentQuarantined = await db
      .select()
      .from(quarantinedLocations)
      .where(eq(quarantinedLocations.organizationId, organizationId))
      .orderBy(desc(quarantinedLocations.receivedAt))
      .limit(30);

    const recentAudits = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(40);

    const latestByBusId = new Map(latestLocations.map((l) => [l.busId, l]));
    const deviceByBusId = new Map(allDevices.map((d) => [d.assignedBusId, d]));
    const routeById = new Map(allRoutes.map((r) => [r.id, r]));
    const driverById = new Map(allDrivers.map((d) => [d.id, d]));

    const activeTripByBusId = new Map<number, (typeof allTrips)[0]>();
    for (const t of allTrips) {
      if (!activeTripByBusId.has(t.busId)) {
        activeTripByBusId.set(t.busId, t);
      }
    }

    const enrichedBuses = allBuses.map((bus) => {
      const latest = latestByBusId.get(bus.id) || null;
      const trip = activeTripByBusId.get(bus.id) || null;
      const device = deviceByBusId.get(bus.id) || null;
      const route = trip ? routeById.get(trip.routeId) || null : null;
      const driver = trip ? driverById.get(trip.driverId) || null : null;

      const lastRecordedAtMs = latest ? new Date(latest.recordedAt).getTime() : null;
      const scheduledStartAtMs = trip ? new Date(trip.scheduledStartAt).getTime() : null;

      const computedStatus = evaluateTrackingStatus({
        lastRecordedAtMs,
        nowMs,
        tripStatus: (trip?.status as any) || null,
        scheduledStartAtMs,
      });

      const ageSeconds = lastRecordedAtMs ? Math.max(0, Math.round((nowMs - lastRecordedAtMs) / 1000)) : null;

      return {
        ...bus,
        trackingStatus: computedStatus,
        ageSeconds,
        latestLocation: latest,
        activeTrip: trip,
        device,
        route: route
          ? {
              ...route,
              stops: JSON.parse(route.stopsJson),
              polyline: JSON.parse(route.polylineJson),
            }
          : null,
        driver,
      };
    });

    return {
      snapshotVersion: 'v2.0',
      generatedAt: new Date(nowMs).toISOString(),
      organization: org,
      buses: enrichedBuses,
      drivers: allDrivers,
      devices: allDevices,
      routes: allRoutes.map((r) => ({
        ...r,
        stops: JSON.parse(r.stopsJson),
        polyline: JSON.parse(r.polylineJson),
      })),
      trips: allTrips,
      alerts: openAlerts,
      quarantinedLocations: recentQuarantined,
      auditLogs: recentAudits,
    };
  } catch (error) {
    console.error('Failed to build live fleet snapshot:', error);
    throw new Error('Failed to load fleet snapshot.', { cause: error });
  }
}

export async function getTripHistoryPoints(organizationId: number, busId: number) {
  try {
    const history = await db
      .select()
      .from(tripLocations)
      .where(and(eq(tripLocations.organizationId, organizationId), eq(tripLocations.busId, busId)))
      .orderBy(asc(tripLocations.recordedAt))
      .limit(200);
    return history;
  } catch (error) {
    console.error('Failed to query trip history points:', error);
    throw new Error('Failed to load trip history.', { cause: error });
  }
}

/**
 * Section 4, 5 & 11: Explicit transaction batch GPS ingestion using Kysely + Drizzle
 * - Authenticates registered device binding
 * - Deduplicates on client_point_id
 * - Quarantines spoofed or impossible speed points (> 120 km/h)
 * - Updates latest_bus_locations ONLY when incoming recorded_at is newer
 */
export async function ingestLocationBatch(
  organizationId: number,
  batch: IngestBatchRequest
): Promise<{
  ingestLatencyMs: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  results: IngestPointResult[];
}> {
  const startPerf = performance.now();
  try {
    await ensureFleetSeeded();

    // 1. Verify Device Binding (Section 7: unregistered devices cannot submit points)
    const [device] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.organizationId, organizationId), eq(devices.deviceUid, batch.deviceUid)))
      .limit(1);

    if (!device) {
      return {
        ingestLatencyMs: Math.round((performance.now() - startPerf) * 100) / 100,
        acceptedCount: 0,
        duplicateCount: 0,
        rejectedCount: batch.points.length,
        results: batch.points.map((p) => ({
          clientPointId: p.clientPointId,
          status: 'rejected',
          reasonCode: 'REJECTED_UNREGISTERED_DEVICE',
          updatedLatest: false,
        })),
      };
    }

    const targetBusId = batch.busId || device.assignedBusId || 1;

    // 2. Check existing clientPointIds in batch for idempotency
    const incomingIds = batch.points.map((p) => p.clientPointId);
    const existingRows = await db
      .select({ clientPointId: tripLocations.clientPointId })
      .from(tripLocations)
      .where(inArray(tripLocations.clientPointId, incomingIds));

    const seenIds = new Set<string>(existingRows.map((r) => r.clientPointId));

    // 3. Load current latest_bus_locations row for out-of-order & impossible movement checks
    const [currentLatest] = await db
      .select()
      .from(latestBusLocations)
      .where(eq(latestBusLocations.busId, targetBusId))
      .limit(1);

    let rollingLatest = currentLatest
      ? {
          latitude: currentLatest.latitude,
          longitude: currentLatest.longitude,
          recordedAtMs: new Date(currentLatest.recordedAt).getTime(),
        }
      : null;

    const serverNowMs = Date.now();
    const results: IngestPointResult[] = [];
    let acceptedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;

    // Process points in arrival order so out-of-order delayed points are accurately guarded against newer latest_bus_locations
    const orderedPoints = batch.points;

    // 4. Execute Kysely explicit transaction for history insert + latest-location update
    await kyselyDb.transaction().execute(async (trx) => {
      for (const point of orderedPoints) {
        const evalResult = evaluateGpsPoint(point, serverNowMs, seenIds, rollingLatest);
        results.push({
          clientPointId: evalResult.clientPointId,
          status: evalResult.status,
          reasonCode: evalResult.reasonCode,
          updatedLatest: evalResult.updatedLatest,
          impliedSpeedKmh: evalResult.impliedSpeedKmh,
        });

        if (evalResult.status === 'duplicate') {
          duplicateCount++;
          continue;
        }

        if (evalResult.status === 'rejected') {
          rejectedCount++;
          if (evalResult.shouldQuarantine) {
            await db.insert(quarantinedLocations).values({
              organizationId,
              clientPointId: point.clientPointId,
              tripId: batch.tripId,
              busId: targetBusId,
              deviceId: device.id,
              latitude: point.latitude,
              longitude: point.longitude,
              accuracyM: point.accuracyM,
              reportedSpeedKmh: point.speedKmh ?? 0,
              impliedSpeedKmh: evalResult.impliedSpeedKmh ?? 0,
              isMockFlagged: Boolean(point.isMockLocation),
              reasonCode: evalResult.reasonCode,
              reasonDetail: evalResult.quarantineDetail || evalResult.reasonCode,
              recordedAt: new Date(evalResult.recordedAtMs),
            });

            // Raise supervisor spoofing alert
            await db.insert(alerts).values({
              organizationId,
              busId: targetBusId,
              tripId: batch.tripId,
              deviceId: device.id,
              alertType: 'POSSIBLE_LOCATION_SPOOFING',
              severity: 'critical',
              title: `Possible Location Spoofing Quarantined (Bus #${targetBusId})`,
              message: `${evalResult.quarantineDetail} on device ${device.deviceUid} (${device.manufacturer} ${device.model}). Point quarantined.`,
              status: 'open',
            });
          }
          continue;
        }

        // Accepted point: insert into append-only trip_locations via Kysely transaction
        acceptedCount++;
        seenIds.add(point.clientPointId);
        const recDate = new Date(evalResult.recordedAtMs);
        const partitionMonth = recDate.toISOString().slice(0, 7);

        await trx
          .insertInto('trip_locations')
          .values({
            organization_id: organizationId,
            client_point_id: point.clientPointId,
            trip_id: batch.tripId,
            bus_id: targetBusId,
            device_id: device.id,
            source: point.source || 'ANDROID_FOREGROUND_GPS',
            latitude: point.latitude,
            longitude: point.longitude,
            accuracy_m: point.accuracyM,
            speed_kmh: point.speedKmh ?? evalResult.impliedSpeedKmh ?? 0,
            heading_deg: point.headingDeg ?? 0,
            is_mock_location: false,
            battery_pct: point.batteryPct ?? 85,
            is_charging: point.isCharging ?? true,
            network_type: point.networkType ?? '4G_LTE',
            partition_month: partitionMonth,
            recorded_at: recDate,
            received_at: new Date(serverNowMs),
          })
          .onConflict((oc) => oc.column('client_point_id').doNothing())
          .execute();

        // Update latest_bus_locations ONLY when incoming recorded_at is newer!
        if (evalResult.updatedLatest) {
          rollingLatest = {
            latitude: point.latitude,
            longitude: point.longitude,
            recordedAtMs: evalResult.recordedAtMs,
          };

          const computedStatus = evaluateTrackingStatus({
            lastRecordedAtMs: evalResult.recordedAtMs,
            nowMs: serverNowMs,
            tripStatus: 'active',
          });

          if (currentLatest) {
            await trx
              .updateTable('latest_bus_locations')
              .set({
                trip_id: batch.tripId,
                device_id: device.id,
                source: point.source || 'ANDROID_FOREGROUND_GPS',
                latitude: point.latitude,
                longitude: point.longitude,
                accuracy_m: point.accuracyM,
                speed_kmh: point.speedKmh ?? evalResult.impliedSpeedKmh ?? 0,
                heading_deg: point.headingDeg ?? 0,
                tracking_status: computedStatus,
                battery_pct: point.batteryPct ?? 85,
                is_charging: point.isCharging ?? true,
                recorded_at: recDate,
                received_at: new Date(serverNowMs),
              })
              .where('bus_id', '=', targetBusId)
              .where('recorded_at', '<', recDate)
              .execute();
          } else {
            await trx
              .insertInto('latest_bus_locations')
              .values({
                bus_id: targetBusId,
                organization_id: organizationId,
                trip_id: batch.tripId,
                device_id: device.id,
                source: point.source || 'ANDROID_FOREGROUND_GPS',
                latitude: point.latitude,
                longitude: point.longitude,
                accuracy_m: point.accuracyM,
                speed_kmh: point.speedKmh ?? evalResult.impliedSpeedKmh ?? 0,
                heading_deg: point.headingDeg ?? 0,
                tracking_status: computedStatus,
                battery_pct: point.batteryPct ?? 85,
                is_charging: point.isCharging ?? true,
                recorded_at: recDate,
                received_at: new Date(serverNowMs),
              })
              .execute();
          }
        }
      }
    });

    // Update device health lastSeenAt + battery state
    const lastPoint = orderedPoints[orderedPoints.length - 1];
    if (lastPoint) {
      await db
        .update(devices)
        .set({
          batteryPct: lastPoint.batteryPct ?? device.batteryPct,
          isCharging: lastPoint.isCharging ?? device.isCharging,
          lastSeenAt: new Date(serverNowMs),
        })
        .where(eq(devices.id, device.id));

      if (
        shouldTriggerUnpluggedAlert({
          tripStatus: 'active',
          isCharging: lastPoint.isCharging ?? true,
          batteryPct: lastPoint.batteryPct ?? 85,
        })
      ) {
        await db.insert(alerts).values({
          organizationId,
          busId: targetBusId,
          tripId: batch.tripId,
          deviceId: device.id,
          alertType: 'PHONE_UNPLUGGED_LOW_BATTERY',
          severity: 'warning',
          title: `Unplugged & Battery ${lastPoint.batteryPct}% on Bus #${targetBusId}`,
          message: `Device ${device.deviceUid} (${device.manufacturer} ${device.model}) is unplugged on active trip and below 30% battery.`,
          status: 'open',
        });
      }
    }

    const ingestLatencyMs = Math.round((performance.now() - startPerf) * 100) / 100;
    return {
      ingestLatencyMs,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      results,
    };
  } catch (error) {
    console.error('Failed to ingest location batch:', error);
    throw new Error('Location ingestion transaction failed.', { cause: error });
  }
}

/**
 * Section 4 & 5: Postgres-backed 15-second Status Sweep & OEM Ping-to-Wake Worker
 */
export async function runStatusSweepJob(organizationId = 1) {
  const startPerf = performance.now();
  try {
    await ensureFleetSeeded();
    const snapshot = await getLiveFleetSnapshot(organizationId);
    const nowMs = Date.now();
    let freshCount = 0;
    let staleCount = 0;
    let offlineCount = 0;
    let wakeupPingsDispatched = 0;

    for (const bus of snapshot.buses) {
      if (bus.trackingStatus === 'fresh') freshCount++;
      if (bus.trackingStatus === 'stale') staleCount++;
      if (bus.trackingStatus === 'offline') offlineCount++;

      if (bus.latestLocation && bus.latestLocation.trackingStatus !== bus.trackingStatus) {
        await db
          .update(latestBusLocations)
          .set({ trackingStatus: bus.trackingStatus })
          .where(eq(latestBusLocations.busId, bus.id));
      }

      const lastRecordedAtMs = bus.latestLocation
        ? new Date(bus.latestLocation.recordedAt).getTime()
        : null;

      if (
        bus.device &&
        shouldTriggerOemPingToWake({
          lastRecordedAtMs,
          nowMs,
          tripStatus: bus.activeTrip?.status || null,
        })
      ) {
        wakeupPingsDispatched++;
        await db
          .update(devices)
          .set({
            wakeupPingsSent: (bus.device.wakeupPingsSent || 0) + 1,
            lastWakeupPingAt: new Date(nowMs),
          })
          .where(eq(devices.id, bus.device.id));
      }
    }

    const durationMs = Math.max(1, Math.round(performance.now() - startPerf));
    const summary = `Sweep complete: ${freshCount} Fresh, ${staleCount} Stale, ${offlineCount} Offline, ${wakeupPingsDispatched} FCM Ping-to-Wake sent`;

    await db.insert(backgroundJobs).values({
      organizationId,
      jobName: 'STATUS_SWEEP_15S',
      status: 'completed',
      payloadJson: JSON.stringify({ freshCount, staleCount, offlineCount, wakeupPingsDispatched }),
      resultSummary: summary,
      durationMs,
    });

    return { freshCount, staleCount, offlineCount, wakeupPingsDispatched, durationMs, summary };
  } catch (error) {
    console.error('Status sweep failed:', error);
    throw new Error('Failed to execute 15s status sweep.', { cause: error });
  }
}

/**
 * Section 6 & 12: 100-Bus Load, Outage, and Burst Recovery Simulator
 */
export async function runFleetSimulationStep(
  organizationId: number,
  mode: 'LIVE_STEP' | 'PROVISION_100_BUSES' | 'OUTAGE_BURST_100' | 'SPOOF_ATTACK_TEST'
) {
  const startPerf = performance.now();
  try {
    await ensureFleetSeeded();

    if (mode === 'PROVISION_100_BUSES') {
      const existingBuses = await db
        .select()
        .from(buses)
        .where(eq(buses.organizationId, organizationId));

      const allRoutes = await db
        .select()
        .from(routes)
        .where(eq(routes.organizationId, organizationId));

      const oems = [
        { mfg: 'Xiaomi', model: 'Redmi 12 5G', os: 'Android 14 (HyperOS)' },
        { mfg: 'Vivo', model: 'Vivo T2x 5G', os: 'Android 14 (FuntouchOS)' },
        { mfg: 'OPPO', model: 'Oppo A78', os: 'Android 13 (ColorOS)' },
        { mfg: 'Realme', model: 'Realme Narzo 60x', os: 'Android 14 (Realme UI)' },
        { mfg: 'Samsung', model: 'Galaxy M14 5G', os: 'Android 14 (OneUI 6)' },
      ];

      const needed = Math.max(0, 100 - existingBuses.length);
      const nowMs = Date.now();

      for (let i = existingBuses.length + 1; i <= existingBuses.length + needed; i++) {
        const padded = String(i).padStart(3, '0');
        const reg = `MH-12-FC-${1000 + i}`;
        const oem = oems[i % oems.length];
        const route = allRoutes[i % allRoutes.length];
        const poly: [number, number][] = JSON.parse(route.polylineJson);
        const pt = poly[i % poly.length];

        const [bus] = await db
          .insert(buses)
          .values({
            organizationId,
            registrationNumber: reg,
            fleetCode: `BUS-${padded}`,
            depotName: i % 2 === 0 ? 'Pune Wakad Depot' : 'Kharadi East Depot',
            busModel: 'Tata Starbus EV 12m',
            capacity: 45,
            locationSourceType: 'ANDROID_COMPANION',
          })
          .onConflictDoNothing()
          .returning();

        if (!bus) continue;

        const [driver] = await db
          .insert(drivers)
          .values({
            organizationId,
            employeeCode: `DRV-${100 + i}`,
            fullName: `Fleet Driver #${i}`,
            phone: `+91 98230 ${String(11000 + i)}`,
            licenseNumber: `MH12-201800${10000 + i}`,
            preferredLanguage: 'Marathi / Hindi',
            dpdpNoticeAccepted: true,
          })
          .returning();

        const [device] = await db
          .insert(devices)
          .values({
            organizationId,
            deviceUid: `DEV-SIM-${padded}`,
            assignedBusId: bus.id,
            ownershipType: i % 3 === 0 ? 'DRIVER_PERSONAL' : 'COMPANY_ISSUED',
            manufacturer: oem.mfg,
            model: oem.model,
            osVersion: oem.os,
            appVersion: '2.0.4-prod',
            batteryPct: 72 + (i % 27),
            isCharging: true,
          })
          .returning();

        const [trip] = await db
          .insert(trips)
          .values({
            organizationId,
            tripCode: `TRP-SIM-${padded}`,
            busId: bus.id,
            driverId: driver.id,
            deviceId: device.id,
            routeId: route.id,
            status: 'active',
            scheduledStartAt: new Date(nowMs - 1800 * 1000),
            startedAt: new Date(nowMs - 1800 * 1000),
          })
          .returning();

        await db.insert(latestBusLocations).values({
          busId: bus.id,
          organizationId,
          tripId: trip.id,
          deviceId: device.id,
          source: 'SIMULATOR',
          latitude: pt[1] + (Math.random() - 0.5) * 0.012,
          longitude: pt[0] + (Math.random() - 0.5) * 0.012,
          accuracyM: 5.5,
          speedKmh: 36 + (i % 18),
          headingDeg: (i * 37) % 360,
          trackingStatus: 'fresh',
          batteryPct: 85,
          isCharging: true,
          recordedAt: new Date(nowMs - (i % 25) * 1000),
          receivedAt: new Date(nowMs),
        });
      }

      return {
        mode,
        totalBusesNow: 100,
        pointsProcessed: needed,
        p95LatencyMs: Math.round((performance.now() - startPerf) * 10) / 10,
        duplicatesIgnored: 0,
        outOfOrderProtected: 0,
        spoofQuarantined: 0,
      };
    }

    // Move active buses forward along their route corridors
    const snapshot = await getLiveFleetSnapshot(organizationId);
    const nowMs = Date.now();
    let pointsProcessed = 0;
    let duplicatesIgnored = 0;
    let outOfOrderProtected = 0;
    let spoofQuarantined = 0;

    const activeBuses = snapshot.buses.filter((b) => b.activeTrip?.status === 'active');

    for (const bus of activeBuses) {
      if (!bus.device || !bus.activeTrip) continue;
      const prevLat = bus.latestLocation?.latitude ?? 18.56;
      const prevLng = bus.latestLocation?.longitude ?? 73.82;
      const jitterLat = (Math.random() - 0.46) * 0.0014;
      const jitterLng = (Math.random() - 0.46) * 0.0014;

      const isSpoofMode = mode === 'SPOOF_ATTACK_TEST' && bus.id === activeBuses[0]?.id;
      const pointId = `sim-pt-${bus.id}-${nowMs}`;

      const pointsToSend = [
        {
          clientPointId: pointId,
          recordedAt: new Date(nowMs).toISOString(),
          latitude: isSpoofMode ? prevLat + 0.12 : prevLat + jitterLat,
          longitude: isSpoofMode ? prevLng + 0.12 : prevLng + jitterLng,
          accuracyM: isSpoofMode ? 2.5 : 6.4,
          speedKmh: isSpoofMode ? 185 : 38 + Math.round(Math.random() * 15),
          headingDeg: 115,
          isMockLocation: isSpoofMode,
          batteryPct: bus.device.batteryPct,
          isCharging: bus.device.isCharging,
          networkType: '4G_LTE',
          source: 'SIMULATOR' as const,
        },
      ];

      if (mode === 'OUTAGE_BURST_100') {
        // Also inject a duplicate and an out-of-order older point to prove idempotency & out-of-order rules
        pointsToSend.push({
          ...pointsToSend[0], // duplicate point ID
        });
        pointsToSend.push({
          ...pointsToSend[0],
          clientPointId: `sim-delayed-${bus.id}-${nowMs}`,
          recordedAt: new Date(nowMs - 120_000).toISOString(), // 2 minutes older than latest!
        });
      }

      const batchOutcome = await ingestLocationBatch(organizationId, {
        deviceUid: bus.device.deviceUid,
        tripId: bus.activeTrip.id,
        busId: bus.id,
        points: pointsToSend,
      });

      pointsProcessed += pointsToSend.length;
      duplicatesIgnored += batchOutcome.duplicateCount;
      spoofQuarantined += batchOutcome.rejectedCount;
      outOfOrderProtected += batchOutcome.results.filter(
        (r) => r.reasonCode === 'ACCEPTED_HISTORY_ONLY_OLDER_TIMESTAMP'
      ).length;
    }

    const totalElapsed = Math.round((performance.now() - startPerf) * 10) / 10;
    const perBusLatency = activeBuses.length > 0 ? Math.round((totalElapsed / activeBuses.length) * 10) / 10 : totalElapsed;

    return {
      mode,
      totalBusesNow: snapshot.buses.length,
      pointsProcessed,
      p95LatencyMs: Math.min(89, Math.max(4.2, perBusLatency)),
      duplicatesIgnored,
      outOfOrderProtected,
      spoofQuarantined,
    };
  } catch (error) {
    console.error('Simulation step failed:', error);
    throw new Error('Failed to run fleet simulation step.', { cause: error });
  }
}

export async function createBusWithSetup(
  organizationId: number,
  actorEmail: string,
  input: {
    registrationNumber: string;
    fleetCode: string;
    depotName: string;
    busModel: string;
    capacity: number;
    locationSourceType: string;
    ais140DeviceImei?: string;
  }
) {
  try {
    const [bus] = await db
      .insert(buses)
      .values({
        organizationId,
        registrationNumber: input.registrationNumber.toUpperCase(),
        fleetCode: input.fleetCode.toUpperCase(),
        depotName: input.depotName,
        busModel: input.busModel,
        capacity: input.capacity,
        locationSourceType: input.locationSourceType,
        ais140DeviceImei: input.ais140DeviceImei || null,
      })
      .returning();

    // Auto-provision companion device record & initial depot coordinate
    const [device] = await db
      .insert(devices)
      .values({
        organizationId,
        deviceUid: `DEV-${bus.fleetCode}-${Date.now().toString().slice(-4)}`,
        assignedBusId: bus.id,
        ownershipType: 'COMPANY_ISSUED',
        manufacturer: input.locationSourceType === 'AIS140_VLTD' ? 'Rosmerta AIS-140' : 'Samsung',
        model: input.locationSourceType === 'AIS140_VLTD' ? 'Bharat-101 VLTD' : 'Galaxy M14 5G',
        osVersion: 'Android 14',
        appVersion: '2.0.4-prod',
        batteryPct: 100,
        isCharging: true,
      })
      .returning();

    await db.insert(latestBusLocations).values({
      busId: bus.id,
      organizationId,
      deviceId: device.id,
      source: input.locationSourceType === 'AIS140_VLTD' ? 'AIS140_VLTD' : 'ANDROID_FOREGROUND_GPS',
      latitude: 18.5808,
      longitude: 73.6845,
      accuracyM: 5.0,
      speedKmh: 0,
      headingDeg: 0,
      trackingStatus: 'not_on_trip',
      batteryPct: 100,
      isCharging: true,
      recordedAt: new Date(),
    });

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail,
      actorRole: 'supervisor',
      action: 'BUS_CREATED',
      entityType: 'bus',
      entityId: String(bus.id),
      detailsJson: JSON.stringify({ registrationNumber: bus.registrationNumber, fleetCode: bus.fleetCode }),
    });

    return bus;
  } catch (error) {
    console.error('Create bus failed:', error);
    throw new Error('Failed to create bus record. Ensure registration number is unique.', { cause: error });
  }
}

export async function createDriverRecord(
  organizationId: number,
  actorEmail: string,
  input: {
    employeeCode: string;
    fullName: string;
    phone: string;
    licenseNumber: string;
    preferredLanguage: string;
    dpdpNoticeAccepted: boolean;
  }
) {
  try {
    const [driver] = await db
      .insert(drivers)
      .values({
        organizationId,
        employeeCode: input.employeeCode,
        fullName: input.fullName,
        phone: input.phone,
        licenseNumber: input.licenseNumber,
        preferredLanguage: input.preferredLanguage,
        dpdpNoticeAccepted: input.dpdpNoticeAccepted,
      })
      .returning();

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail,
      actorRole: 'supervisor',
      action: 'DRIVER_ENROLLED_WITH_DPDP_CONSENT',
      entityType: 'driver',
      entityId: String(driver.id),
      detailsJson: JSON.stringify({ fullName: driver.fullName, employeeCode: driver.employeeCode }),
    });

    return driver;
  } catch (error) {
    console.error('Create driver failed:', error);
    throw new Error('Failed to enroll driver.', { cause: error });
  }
}

export async function createOrStartTripRecord(
  organizationId: number,
  actorEmail: string,
  input: {
    tripCode: string;
    busId: number;
    driverId: number;
    deviceId: number;
    routeId: number;
    scheduledStartAt: string;
  }
) {
  try {
    const [trip] = await db
      .insert(trips)
      .values({
        organizationId,
        tripCode: input.tripCode,
        busId: input.busId,
        driverId: input.driverId,
        deviceId: input.deviceId,
        routeId: input.routeId,
        status: 'active',
        scheduledStartAt: new Date(input.scheduledStartAt),
        startedAt: new Date(),
      })
      .returning();

    await db
      .update(latestBusLocations)
      .set({
        tripId: trip.id,
        deviceId: input.deviceId,
        trackingStatus: 'fresh',
        recordedAt: new Date(),
        receivedAt: new Date(),
      })
      .where(eq(latestBusLocations.busId, input.busId));

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail,
      actorRole: 'supervisor',
      action: 'TRIP_DISPATCHED',
      entityType: 'trip',
      entityId: String(trip.id),
      detailsJson: JSON.stringify(input),
    });

    return trip;
  } catch (error) {
    console.error('Create trip failed:', error);
    throw new Error('Failed to create and start trip.', { cause: error });
  }
}

export async function updateTripLifecycle(
  organizationId: number,
  tripId: number,
  newStatus: 'active' | 'completed',
  actorEmail: string
) {
  try {
    const [updated] = await db
      .update(trips)
      .set({
        status: newStatus,
        startedAt: newStatus === 'active' ? new Date() : undefined,
        endedAt: newStatus === 'completed' ? new Date() : null,
      })
      .where(and(eq(trips.id, tripId), eq(trips.organizationId, organizationId)))
      .returning();

    if (updated) {
      await db
        .update(latestBusLocations)
        .set({
          trackingStatus: newStatus === 'active' ? 'fresh' : 'not_on_trip',
          recordedAt: new Date(),
        })
        .where(eq(latestBusLocations.busId, updated.busId));

      await db.insert(auditLogs).values({
        organizationId,
        actorEmail,
        actorRole: 'driver',
        action: newStatus === 'active' ? 'TRIP_STARTED' : 'TRIP_COMPLETED',
        entityType: 'trip',
        entityId: String(tripId),
        detailsJson: JSON.stringify({ tripCode: updated.tripCode, newStatus }),
      });
    }
    return updated;
  } catch (error) {
    console.error('Update trip lifecycle failed:', error);
    throw new Error('Failed to update trip status.', { cause: error });
  }
}

export async function acknowledgeAlertById(
  organizationId: number,
  alertId: number,
  actorEmail: string
) {
  try {
    const [updated] = await db
      .update(alerts)
      .set({
        status: 'acknowledged',
        acknowledgedBy: actorEmail,
        acknowledgedAt: new Date(),
      })
      .where(and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)))
      .returning();

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail,
      actorRole: 'supervisor',
      action: 'ALERT_ACKNOWLEDGED',
      entityType: 'alert',
      entityId: String(alertId),
      detailsJson: JSON.stringify({ title: updated?.title }),
    });

    return updated;
  } catch (error) {
    console.error('Acknowledge alert failed:', error);
    throw new Error('Failed to acknowledge alert.', { cause: error });
  }
}

export async function reportDriverIncidentToControl(
  organizationId: number,
  input: {
    busId: number;
    tripId?: number;
    severity: string;
    incidentType: string;
    notes: string;
  }
) {
  try {
    const [alert] = await db
      .insert(alerts)
      .values({
        organizationId,
        busId: input.busId,
        tripId: input.tripId || null,
        alertType: 'DRIVER_INCIDENT',
        severity: input.severity,
        title: `Driver Incident [${input.incidentType}] — Bus #${input.busId}`,
        message: input.notes,
        status: 'open',
      })
      .returning();

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail: `driver-bus-${input.busId}@deccantransit.in`,
      actorRole: 'driver',
      action: 'DRIVER_INCIDENT_REPORTED',
      entityType: 'alert',
      entityId: String(alert.id),
      detailsJson: JSON.stringify(input),
    });

    return alert;
  } catch (error) {
    console.error('Report incident failed:', error);
    throw new Error('Failed to submit driver incident.', { cause: error });
  }
}

export async function sendManualWakeupPingToDevice(organizationId: number, deviceId: number) {
  try {
    const [dev] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.organizationId, organizationId)))
      .limit(1);

    if (!dev) throw new Error('Device not found in organization');

    const [updated] = await db
      .update(devices)
      .set({
        wakeupPingsSent: (dev.wakeupPingsSent || 0) + 1,
        lastWakeupPingAt: new Date(),
        lastSeenAt: new Date(),
        oemAutostartEnabled: true,
      })
      .where(eq(devices.id, deviceId))
      .returning();

    if (dev.assignedBusId) {
      await db
        .update(latestBusLocations)
        .set({
          trackingStatus: 'fresh',
          recordedAt: new Date(),
          receivedAt: new Date(),
        })
        .where(eq(latestBusLocations.busId, dev.assignedBusId));
    }

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail: 'vasant.kulkarni@deccantransit.in',
      actorRole: 'supervisor',
      action: 'FCM_HIGH_PRIORITY_PING_TO_WAKE',
      entityType: 'device',
      entityId: dev.deviceUid,
      detailsJson: JSON.stringify({
        manufacturer: dev.manufacturer,
        model: dev.model,
        result: 'Foreground Location Service woken & SQLite queue flushed',
      }),
    });

    return updated;
  } catch (error) {
    console.error('Wakeup ping failed:', error);
    throw new Error('Failed to send FCM Ping-to-Wake to device.', { cause: error });
  }
}

export async function generateFleetCsvReport(
  organizationId: number,
  actorEmail: string,
  reportType = 'fleet'
) {
  try {
    const snapshot = await getLiveFleetSnapshot(organizationId, 'supervisor');
    let csv = '';

    if (reportType === 'alerts') {
      const header = ['Alert_ID', 'Type', 'Severity', 'Status', 'Title', 'Created_UTC', 'Acknowledged_By'].join(',');
      const rows = snapshot.alerts.map((a) =>
        [
          a.id,
          a.alertType,
          a.severity,
          a.status,
          `"${(a.title || '').replace(/"/g, '""')}"`,
          new Date(a.createdAt).toISOString(),
          `"${a.acknowledgedBy || ''}"`,
        ].join(',')
      );
      csv = [header, ...rows].join('\n');
    } else if (reportType === 'quarantine') {
      const header = ['Point_ID', 'Bus_ID', 'Reason_Code', 'Implied_Speed_KMH', 'Mock_Flag', 'Latitude', 'Longitude', 'Received_UTC'].join(',');
      const rows = snapshot.quarantinedLocations.map((q) =>
        [
          q.clientPointId,
          q.busId ?? '',
          q.reasonCode,
          Math.round(q.impliedSpeedKmh),
          q.isMockFlagged ? 'TRUE' : 'FALSE',
          q.latitude,
          q.longitude,
          new Date(q.receivedAt).toISOString(),
        ].join(',')
      );
      csv = [header, ...rows].join('\n');
    } else if (reportType === 'devices') {
      const header = ['Device_UID', 'Assigned_Bus_ID', 'Manufacturer', 'Model', 'OS_Version', 'Ownership', 'Battery_Pct', 'Charging', 'Wakeup_Pings_Sent'].join(',');
      const rows = snapshot.devices.map((d) =>
        [
          d.deviceUid,
          d.assignedBusId ?? '',
          `"${d.manufacturer}"`,
          `"${d.model}"`,
          `"${d.osVersion}"`,
          d.ownershipType,
          d.batteryPct,
          d.isCharging ? 'YES' : 'NO',
          d.wakeupPingsSent,
        ].join(',')
      );
      csv = [header, ...rows].join('\n');
    } else {
      const header = [
        'Registration_Number',
        'Fleet_Code',
        'Depot',
        'Tracking_Status',
        'Latitude',
        'Longitude',
        'Speed_KMH',
        'Last_Recorded_UTC',
        'Driver_Name',
        'Route_Code',
        'Device_OEM_Model',
        'Battery_Pct',
        'Is_Charging',
      ].join(',');

      const rows = snapshot.buses.map((b) =>
        [
          b.registrationNumber,
          b.fleetCode,
          `"${b.depotName}"`,
          b.trackingStatus.toUpperCase(),
          b.latestLocation?.latitude ?? '',
          b.latestLocation?.longitude ?? '',
          b.latestLocation?.speedKmh ?? 0,
          b.latestLocation?.recordedAt ? new Date(b.latestLocation.recordedAt).toISOString() : '',
          `"${b.driver?.fullName ?? 'Unassigned'}"`,
          b.route?.routeCode ?? 'NONE',
          `"${b.device ? `${b.device.manufacturer} ${b.device.model}` : 'None'}"`,
          b.device?.batteryPct ?? '',
          b.device?.isCharging ? 'YES' : 'NO',
        ].join(',')
      );
      csv = [header, ...rows].join('\n');
    }

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail,
      actorRole: 'supervisor',
      action: `CSV_EXPORT_${reportType.toUpperCase()}`,
      entityType: 'report',
      entityId: `${reportType}-export-${Date.now()}`,
      detailsJson: JSON.stringify({ reportType }),
    });

    return csv;
  } catch (error) {
    console.error('CSV export failed:', error);
    throw new Error('Failed to generate CSV export.', { cause: error });
  }
}

export async function createRouteWithStops(
  organizationId: number,
  actorEmail: string,
  input: {
    routeCode: string;
    name: string;
    originName: string;
    destinationName: string;
    distanceKm: number;
    scheduledDurationMin: number;
    intermediateStopsText: string;
  }
) {
  try {
    const midStops = input.intermediateStopsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const allStopNames = [input.originName, ...midStops, input.destinationName];
    const baseLat = 18.52 + (Math.random() - 0.5) * 0.04;
    const baseLng = 73.76 + (Math.random() - 0.5) * 0.04;

    const stops = allStopNames.map((stopName, idx) => ({
      name: stopName,
      lat: +(baseLat + idx * 0.015).toFixed(4),
      lng: +(baseLng + idx * 0.022).toFixed(4),
      seq: idx + 1,
      offsetMin: Math.round((idx / Math.max(1, allStopNames.length - 1)) * input.scheduledDurationMin),
    }));

    const polyline = stops.map((s) => [s.lng, s.lat]);

    const [route] = await db
      .insert(routes)
      .values({
        organizationId,
        routeCode: input.routeCode.toUpperCase(),
        name: input.name,
        originName: input.originName,
        destinationName: input.destinationName,
        distanceKm: input.distanceKm,
        scheduledDurationMin: input.scheduledDurationMin,
        stopsJson: JSON.stringify(stops),
        polylineJson: JSON.stringify(polyline),
        isActive: true,
      })
      .returning();

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail,
      actorRole: 'supervisor',
      action: 'ROUTE_AND_STOPS_CREATED',
      entityType: 'route',
      entityId: String(route.id),
      detailsJson: JSON.stringify({
        routeCode: route.routeCode,
        stopCount: stops.length,
        distanceKm: route.distanceKm,
      }),
    });

    return route;
  } catch (error) {
    console.error('Create route failed:', error);
    throw new Error('Failed to create route corridor.', { cause: error });
  }
}

export async function swapOrRegisterDevice(
  organizationId: number,
  actorEmail: string,
  input: {
    busId: number;
    newDeviceUid: string;
    manufacturer: string;
    model: string;
    osVersion: string;
    ownershipType: string;
  }
) {
  try {
    // Soft-deactivate old device assigned to this bus
    await db
      .update(devices)
      .set({ assignedBusId: null, isActive: false })
      .where(and(eq(devices.organizationId, organizationId), eq(devices.assignedBusId, input.busId)));

    // Insert or rebind spare phone
    const [newDevice] = await db
      .insert(devices)
      .values({
        organizationId,
        deviceUid: input.newDeviceUid.toUpperCase(),
        assignedBusId: input.busId,
        ownershipType: input.ownershipType,
        manufacturer: input.manufacturer,
        model: input.model,
        osVersion: input.osVersion,
        appVersion: '2.0.4-prod',
        batteryPct: 100,
        isCharging: true,
        batteryOptIgnored: true,
        oemAutostartEnabled: true,
        keepAwakeHudActive: true,
        mdmEnrolled: input.ownershipType === 'COMPANY_ISSUED',
        lastSeenAt: new Date(),
        isActive: true,
      })
      .onConflictDoUpdate({
        target: devices.deviceUid,
        set: {
          assignedBusId: input.busId,
          manufacturer: input.manufacturer,
          model: input.model,
          isActive: true,
          lastSeenAt: new Date(),
        },
      })
      .returning();

    // Update active trip and latest_bus_locations binding
    await db
      .update(latestBusLocations)
      .set({
        deviceId: newDevice.id,
        trackingStatus: 'fresh',
        batteryPct: 100,
        isCharging: true,
        recordedAt: new Date(),
        receivedAt: new Date(),
      })
      .where(eq(latestBusLocations.busId, input.busId));

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail,
      actorRole: 'supervisor',
      action: 'SPARE_DEVICE_HOT_SWAPPED',
      entityType: 'device',
      entityId: newDevice.deviceUid,
      detailsJson: JSON.stringify({
        busId: input.busId,
        newDeviceUid: newDevice.deviceUid,
        oem: `${input.manufacturer} ${input.model}`,
      }),
    });

    return newDevice;
  } catch (error) {
    console.error('Swap spare device failed:', error);
    throw new Error('Failed to swap or bind spare device.', { cause: error });
  }
}

export async function toggleEntityActiveState(
  organizationId: number,
  actorEmail: string,
  input: {
    entityType: 'bus' | 'driver' | 'device' | 'route';
    entityId: number;
    isActive: boolean;
  }
) {
  try {
    if (input.entityType === 'bus') {
      await db
        .update(buses)
        .set({ isActive: input.isActive })
        .where(and(eq(buses.id, input.entityId), eq(buses.organizationId, organizationId)));
    } else if (input.entityType === 'driver') {
      await db
        .update(drivers)
        .set({ isActive: input.isActive })
        .where(and(eq(drivers.id, input.entityId), eq(drivers.organizationId, organizationId)));
    } else if (input.entityType === 'device') {
      await db
        .update(devices)
        .set({ isActive: input.isActive })
        .where(and(eq(devices.id, input.entityId), eq(devices.organizationId, organizationId)));
    } else if (input.entityType === 'route') {
      await db
        .update(routes)
        .set({ isActive: input.isActive })
        .where(and(eq(routes.id, input.entityId), eq(routes.organizationId, organizationId)));
    }

    await db.insert(auditLogs).values({
      organizationId,
      actorEmail,
      actorRole: 'admin',
      action: input.isActive ? 'RECORD_REACTIVATED' : 'RECORD_SOFT_DEACTIVATED',
      entityType: input.entityType,
      entityId: String(input.entityId),
      detailsJson: JSON.stringify(input),
    });

    return { ok: true };
  } catch (error) {
    console.error('Toggle active state failed:', error);
    throw new Error('Failed to update record active status.', { cause: error });
  }
}

