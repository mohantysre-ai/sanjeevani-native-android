import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ayush.sanjeevani',
  appName: 'Sanjeevani',
  webDir: 'www',
  android: {
    // offline-first: the whole SPA + data bundles ship in the APK
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
