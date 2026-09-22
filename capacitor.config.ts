import type { CapacitorConfig } from '@capacitor/cli';

// appId ist der Paketname im Play Store / App Store. Er lässt sich bis zum
// ersten Upload frei ändern, danach nicht mehr.
const config: CapacitorConfig = {
  appId: 'de.cloudplay.hundeapp',
  appName: 'Hundeapp',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  },
  plugins: {
    LocalNotifications: {
      // Eigenes Statussymbol in der Akzentfarbe; auf iOS ohne Badge.
      smallIcon: 'ic_stat_hundeapp',
      iconColor: '#ea7c3a',
      presentationOptions: ['banner', 'list', 'sound']
    }
  }
};

export default config;
