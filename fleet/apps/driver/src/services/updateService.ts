import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export interface UpdateStatusState {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdateReadyToApply: boolean;
  lastCheckedTime: string | null;
  statusMessage: string;
}

class SilentUpdateManager {
  private isChecking = false;
  private isDownloading = false;
  private isReady = false;
  private listeners: ((status: UpdateStatusState) => void)[] = [];

  public getStatus(): UpdateStatusState {
    return {
      isChecking: this.isChecking,
      isDownloading: this.isDownloading,
      isUpdateAvailable: false,
      isUpdateReadyToApply: this.isReady,
      lastCheckedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      statusMessage: this.isReady
        ? 'Update downloaded & ready'
        : Updates.isEnabled
        ? 'Up to date'
        : 'Development Mode',
    };
  }

  public subscribe(listener: (status: UpdateStatusState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(message?: string) {
    const status: UpdateStatusState = {
      isChecking: this.isChecking,
      isDownloading: this.isDownloading,
      isUpdateAvailable: this.isReady,
      isUpdateReadyToApply: this.isReady,
      lastCheckedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      statusMessage: message || (this.isReady ? 'New update ready' : 'Up to date'),
    };
    this.listeners.forEach((l) => l(status));
  }

  /**
   * Check and silently download OTA updates in the background.
   * Safe to call on app start or periodically.
   */
  public async checkAndDownloadSilentUpdate(options?: { isTripActive?: boolean; manual?: boolean }): Promise<boolean> {
    if (__DEV__ || !Updates.isEnabled) {
      if (options?.manual) {
        Alert.alert(
          'Silent Update Info',
          'Silent updates are active in standalone APK builds. In local development / Expo Go, live code changes sync directly via Metro server.'
        );
      }
      return false;
    }

    if (this.isChecking || this.isDownloading) {
      return false;
    }

    try {
      this.isChecking = true;
      this.notify('Checking for update...');

      const update = await Updates.checkForUpdateAsync();
      this.isChecking = false;

      if (update.isAvailable) {
        this.isDownloading = true;
        this.notify('Downloading update silently...');

        // Fetch the new bundle in background
        await Updates.fetchUpdateAsync();
        this.isDownloading = false;
        this.isReady = true;
        this.notify('Update ready to apply');

        // If not in active trip, can prompt or let next restart apply it
        if (options?.manual) {
          Alert.alert(
            'नवीन अपडेट उपलब्ध (Update Ready)',
            'नवीन आवृत्ती यशस्वीरित्या डाऊनलोड झाली आहे. आता रीस्टार्ट करायचे का? (New version downloaded. Restart now to apply?)',
            [
              { text: 'नंतर (Later)', style: 'cancel' },
              {
                text: 'रीस्टार्ट करा (Restart)',
                style: 'default',
                onPress: async () => {
                  await this.applyUpdate();
                },
              },
            ]
          );
        }

        return true;
      } else {
        this.notify('Already on latest version');
        if (options?.manual) {
          Alert.alert('अद्ययावत (Up to Date)', 'तुमचे अ‍ॅप सर्वात नवीन आवृत्तीवर आहे. (Your app is on the latest version).');
        }
        return false;
      }
    } catch (err: any) {
      this.isChecking = false;
      this.isDownloading = false;
      this.notify('Update check complete');
      return false;
    }
  }

  /**
   * Apply the downloaded update by reloading the runtime.
   */
  public async applyUpdate() {
    if (!Updates.isEnabled) return;
    try {
      await Updates.reloadAsync();
    } catch {}
  }
}

export const silentUpdateManager = new SilentUpdateManager();
