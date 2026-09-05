import type { CapacitorConfig } from '@capacitor/cli';

// appId ist der Paketname im Play Store / App Store. Er lässt sich bis zum
// ersten Upload frei ändern, danach nicht mehr.
const config: CapacitorConfig = {
  appId: 'de.cloudplay.hundeapp',
  appName: 'Hundeapp',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  }
};

export default config;
