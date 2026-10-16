import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omni.fleetfuel',
  appName: 'Omni Fleet Fuel',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#10213D",
      launchAutoHide: true,
    },
  },
};

export default config;
