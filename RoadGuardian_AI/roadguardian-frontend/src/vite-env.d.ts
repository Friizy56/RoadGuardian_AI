/// <reference types="vite/client" />

declare module 'virtual:pwa-register';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
