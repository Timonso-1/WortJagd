import type { CapacitorConfig } from "@capacitor/cli";

// Adresse des Online-Spiels, zur Build-Zeit über WORTJAGD_ONLINE_URL gesetzt
const online = process.env.WORTJAGD_ONLINE_URL ?? process.env.VITE_ONLINE_URL ?? "";
let host = "";
try {
  host = online ? new URL(online).host : "";
} catch {
  host = "";
}

const config: CapacitorConfig = {
  appId: "de.timonso.wortjagd",
  appName: "Wortjagd",
  webDir: "dist",
  backgroundColor: "#000000",
  server: {
    androidScheme: "https",
    ...(host ? { allowNavigation: [host] } : {}),
  },
  android: {
    backgroundColor: "#000000",
  },
};

export default config;
