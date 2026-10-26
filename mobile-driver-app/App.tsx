import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

export default function DriverApp() {
  useKeepAwake(); // Keeps screen awake while plugged into the bus charger

  const [dpdpAccepted] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [charging, setCharging] = useState(true);
  const [gpsFixed, setGpsFixed] = useState(true);
  const [oemUncapped, setOemUncapped] = useState(true);
  const [tripActive, setTripActive] = useState(false);

  const canStart = dpdpAccepted && mounted && charging && gpsFixed && oemUncapped;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>FleetCommand Driver App</Text>
      <Text style={styles.subtitle}>Location is shared only while your bus trip is active</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Check Before Starting Trip</Text>
        <View style={styles.row}>
          <Text style={styles.label}>1. Phone fixed in dashboard holder</Text>
          <Switch value={mounted} onValueChange={setMounted} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>2. Charger cable plugged in and charging</Text>
          <Switch value={charging} onValueChange={setCharging} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>3. Phone GPS location is turned ON</Text>
          <Switch value={gpsFixed} onValueChange={setGpsFixed} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>4. Battery saver turned OFF for this app</Text>
          <Switch value={oemUncapped} onValueChange={setOemUncapped} />
        </View>
      </View>

      <TouchableOpacity
        disabled={!canStart}
        onPress={() => setTripActive(!tripActive)}
        style={[styles.button, !canStart && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {tripActive ? 'STOP TRIP' : 'START TRIP NOW'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 20 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginTop: 24 },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 20 },
  sectionTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  label: { color: '#cbd5e1', fontSize: 12, flex: 1, paddingRight: 10 },
  button: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
