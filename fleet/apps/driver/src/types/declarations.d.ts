declare module 'expo-sqlite' {
  export interface SQLiteDatabase {
    execSync(sql: string): void;
    runSync(sql: string, params?: any[]): { changes: number; lastInsertRowId: number };
    getFirstSync<T>(sql: string, params?: any[]): T | null;
    getAllSync<T>(sql: string, params?: any[]): T[];
  }
  export function openDatabaseSync(dbName: string): SQLiteDatabase;
}

declare module 'expo-speech' {
  export interface SpeechOptions {
    language?: string;
    pitch?: number;
    rate?: number;
    onDone?: () => void;
    onError?: (error: any) => void;
  }
  export function speak(text: string, options?: SpeechOptions): void;
  export function stop(): void;
  export function isSpeakingAsync(): Promise<boolean>;
}

declare module 'react-native-webview' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';
  export interface WebViewProps extends ViewProps {
    source?: { uri?: string; html?: string; baseUrl?: string };
    originWhitelist?: string[];
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    onMessage?: (event: any) => void;
    onLoadEnd?: (event?: any) => void;
    onLoadStart?: (event?: any) => void;
    onError?: (event?: any) => void;
    scalesPageToFit?: boolean;
    scrollEnabled?: boolean;
    bounces?: boolean;
    overScrollMode?: 'always' | 'content' | 'never' | string;
    injectedJavaScript?: string;
    style?: any;
    ref?: any;
    [key: string]: any;
  }
  export class WebView extends Component<WebViewProps> {
    postMessage(data: string): void;
    reload(): void;
    injectJavaScript(script: string): void;
  }
  export default WebView;
}

declare module 'expo-updates' {
  export const isEnabled: boolean;
  export function checkForUpdateAsync(): Promise<{ isAvailable: boolean }>;
  export function fetchUpdateAsync(): Promise<{ isNew: boolean }>;
  export function reloadAsync(): Promise<void>;
}

