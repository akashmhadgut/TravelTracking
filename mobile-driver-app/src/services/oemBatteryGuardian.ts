import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Device from 'expo-device';

export interface OemSurvivalProfile {
  manufacturer: string;
  requiresAutostartToggle: boolean;
  autostartPackage?: string;
  autostartClass?: string;
  driverInstructions: string[];
}

export function detectOemSurvivalProfile(): OemSurvivalProfile {
  const brand = (Device.manufacturer || Device.brand || 'Generic').toLowerCase();

  if (brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco')) {
    return {
      manufacturer: 'Xiaomi / Redmi (MIUI / HyperOS)',
      requiresAutostartToggle: true,
      autostartPackage: 'com.miui.securitycenter',
      autostartClass: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
      driverInstructions: [
        '1. Tap "Enable Background Autostart" below and switch FleetCommand ON.',
        '2. Set Battery Saver to "No restrictions".',
        '3. Keep phone plugged into 12V/24V dash charger with Night-HUD active.',
      ],
    };
  }

  if (brand.includes('vivo') || brand.includes('iqoo')) {
    return {
      manufacturer: 'Vivo (FuntouchOS)',
      requiresAutostartToggle: true,
      autostartPackage: 'com.vivo.permissionmanager',
      autostartClass: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity',
      driverInstructions: [
        '1. Enable "Allow High Background Power Consumption" for FleetCommand.',
        '2. Turn ON Autostart in Vivo Permission Manager.',
      ],
    };
  }

  if (brand.includes('oppo') || brand.includes('realme') || brand.includes('oneplus')) {
    return {
      manufacturer: 'Oppo / Realme (ColorOS)',
      requiresAutostartToggle: true,
      autostartPackage: 'com.coloros.safecenter',
      autostartClass: 'com.coloros.safecenter.permission.startup.StartupAppListActivity',
      driverInstructions: [
        '1. Allow "Auto-launch" and "Allow Background Activity" in Battery settings.',
        '2. Lock FleetCommand in Recent Apps tray.',
      ],
    };
  }

  return {
    manufacturer: Device.manufacturer || 'Samsung / Standard Android',
    requiresAutostartToggle: false,
    driverInstructions: [
      '1. Tap "Allow Unrestricted Battery" in the 1-tap system dialog.',
      '2. Set Location Permission to "Allow while using the app" (Foreground Service).',
    ],
  };
}

export async function requestIgnoreBatteryOptimizations(packageName: string) {
  if (Platform.OS !== 'android') return;
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
    { data: `package:${packageName}` }
  );
}

export async function openOemAutostartScreen(profile: OemSurvivalProfile) {
  if (Platform.OS !== 'android') return;
  try {
    if (profile.autostartPackage && profile.autostartClass) {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        className: profile.autostartClass,
        packageName: profile.autostartPackage,
      });
      return;
    }
  } catch {
    await Linking.openSettings();
  }
}
