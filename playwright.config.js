import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',timeout:30000,workers:1,
  use:{baseURL:'http://127.0.0.1:4173',headless:true,channel:'chrome',launchOptions:{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']},permissions:['microphone'],viewport:{width:1280,height:1000}},
  webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
  reporter:'list',
});
