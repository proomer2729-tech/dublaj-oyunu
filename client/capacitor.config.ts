import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.dublaj.app',
  appName: 'Dublaj',
  webDir: 'out',
  server: {
    url: 'https://07b6716aabcbf0.lhr.life',
    cleartext: true
  }
};

export default config;
