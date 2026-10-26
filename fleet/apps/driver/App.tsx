import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { SQLiteQueueUploader } from './src/services/sqliteQueue';

type AppScreen = 'login' | 'consent' | 'permissions' | 'hud' | 'diagnostics';

const uploader = new SQLiteQueueUploader();

export default function DriverApp() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [driverPhone, setDriverPhone] = useState('9876543210');
  const [driverPin, setDriverPin] = useState('123456');
  const [tripActive, setTripActive] = useState(false);
  const [queueDepth, setQueueDepth] = useState(0);
  const [lastUploadTime, setLastUploadTime] = useState('Never');
  const [simulatedIntervalId, setSimulatedIntervalId] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setQueueDepth(uploader.getQueueDepth());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Section 9.4 & 9.6: Start Trip
  const startTrip = () => {
    setTripActive(true);
    // Simulate background GPS points written to SQLite every 5 seconds
    let heading = 90;
    let lat = 18.5204;
    let lng = 73.8567;

    const interval = setInterval(() => {
      lat += (Math.random() - 0.5) * 0.001;
      lng += 0.0008;
      uploader.enqueuePoint({
        id: '0192f0a1-8a01-7d22-8b31-' + Math.random().toString(36).substring(2, 14),
        trip_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10',
        recorded_at: uploader.getCorrectedNow(),
        lat,
        lng,
        accuracy: 8.5,
        speed: 36.2,
        heading: (heading = (heading + 2) % 360),
      });

      // Flush queue to API
      uploader.flush('http://localhost:3000', 'demo-token', {
        battery_pct: 85,
        charging: true,
        network: '4g',
        permission: 'always',
        app_version: '1.0.0',
      }).then(() => {
        setLastUploadTime(new Date().toLocaleTimeString());
      });
    }, 5000);

    setSimulatedIntervalId(interval);
  };

  const endTrip = () => {
    if (simulatedIntervalId) {
      clearInterval(simulatedIntervalId);
      setSimulatedIntervalId(null);
    }
    setTripActive(false);
  };

  // Screen 1: Login Screen (Section 9.9)
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.card}>
          <Text style={styles.title}>FleetCommand Driver</Text>
          <Text style={styles.subtitle}>Enter assigned mobile phone & 6-digit PIN</Text>

          <Text style={styles.label}>Mobile Phone Number</Text>
          <TextInput
            style={styles.input}
            value={driverPhone}
            onChangeText={setDriverPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>6-Digit Security PIN</Text>
          <TextInput
            style={styles.input}
            value={driverPin}
            onChangeText={setDriverPin}
            keyboardType="number-pad"
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => setCurrentScreen('consent')}
          >
            <Text style={styles.buttonText}>LOGIN TO SHIFT</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Screen 2: DPDP Act 2023 Consent Screen (Section 9.9)
  if (currentScreen === 'consent') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.title}>Data Privacy & Tracking Consent</Text>
          <Text style={styles.subtitle}>Compliance with Digital Personal Data Protection Act 2023</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              • Location tracking is activated ONLY while your assigned bus trip is in progress.
            </Text>
            <Text style={styles.infoText}>
              • Tracking stops immediately when you tap 'End Trip'.
            </Text>
            <Text style={styles.infoText}>
              • Data is used strictly for fleet dispatch, passenger arrival estimation, and safety.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => setCurrentScreen('permissions')}
          >
            <Text style={styles.buttonText}>I AGREE & ACCEPT</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Screen 3: Guided 4-Step Permissions (Section 9.3)
  if (currentScreen === 'permissions') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.title}>Required Permissions</Text>
          <Text style={styles.subtitle}>Mandatory settings for reliable GPS capture</Text>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>Step 1</Text>
            <Text style={styles.stepTitle}>Notifications: Enable foreground dispatch notification</Text>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>Step 2</Text>
            <Text style={styles.stepTitle}>Precise Location: Set to 'Allow all the time'</Text>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepNumber}>Step 3</Text>
            <Text style={styles.stepTitle}>OEM Battery Saver: Set to 'No restrictions' for this app</Text>
          </View>

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => setCurrentScreen('hud')}
          >
            <Text style={styles.buttonText}>ALL PERMISSIONS GRANTED</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Screen 4: Active Trip HUD & Diagnostics (Section 9.8 & 9.9)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>Trip Console — Route 505</Text>
        <TouchableOpacity
          onPress={() => setCurrentScreen('diagnostics')}
          style={styles.badgeBtn}
        >
          <Text style={styles.badgeText}>Diagnostics</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hudCard}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, tripActive ? styles.dotActive : styles.dotIdle]} />
          <Text style={styles.statusLabel}>
            {tripActive ? 'SHARING LOCATION WITH DISPATCH' : 'TRIP NOT STARTED'}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{queueDepth}</Text>
            <Text style={styles.metricSub}>Points in Queue</Text>
          </View>
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{lastUploadTime}</Text>
            <Text style={styles.metricSub}>Last Server Upload</Text>
          </View>
        </View>

        <TouchableOpacity
          style={tripActive ? styles.buttonStop : styles.buttonPrimary}
          onPress={tripActive ? endTrip : startTrip}
        >
          <Text style={styles.buttonText}>{tripActive ? 'END TRIP' : 'START TRIP NOW'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 20 },
  scrollContent: { padding: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brandTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#0f172a', padding: 24, borderRadius: 12, marginTop: 40 },
  hudCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 12 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20 },
  label: { color: '#cbd5e1', fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#020617', color: '#ffffff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  buttonPrimary: { backgroundColor: '#10b981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  buttonStop: { backgroundColor: '#ef4444', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  infoBox: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, marginVertical: 16 },
  infoText: { color: '#cbd5e1', fontSize: 13, lineHeight: 22, marginBottom: 8 },
  stepCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 12 },
  stepNumber: { color: '#10b981', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  stepTitle: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginTop: 4 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotActive: { backgroundColor: '#10b981' },
  dotIdle: { backgroundColor: '#64748b' },
  statusLabel: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 },
  metricCol: { backgroundColor: '#020617', padding: 14, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  metricVal: { color: '#10b981', fontSize: 16, fontWeight: '800' },
  metricSub: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
  badgeBtn: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});
