import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.dublaj.app',
  appName: 'Dublaj',
  webDir: 'out',
  server: {
    url: 'https://dublaj-oyunu.onrender.com',
    cleartext: true
  }
};

export default config;
