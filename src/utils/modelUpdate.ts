import AsyncStorage from '@react-native-async-storage/async-storage';

// Lets the app check whether a newer IRx-1 GGUF build exists on Hugging
// Face without downloading the 1.2GB file just to find out -- fetches a
// small manifest instead (published by IRx-1's scripts/publish_to_hf.py
// alongside every GGUF upload). Manual only: this never downloads anything
// on its own, it only answers "is there something newer than what I have".

const VERSION_URL = 'https://huggingface.co/ikppramesh/irx-1-GGUF/resolve/main/version.json';
const INSTALLED_KEY = 'irx1_installed_version';
const FETCH_TIMEOUT_MS = 10000;

export interface ModelVersionManifest {
  version: string;
  filename: string;
  size_bytes: number;
  sha256: string;
}

export const fetchLatestManifest = async (): Promise<ModelVersionManifest | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(VERSION_URL, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as ModelVersionManifest;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const getInstalledVersion = async (): Promise<ModelVersionManifest | null> => {
  try {
    const raw = await AsyncStorage.getItem(INSTALLED_KEY);
    return raw ? (JSON.parse(raw) as ModelVersionManifest) : null;
  } catch {
    return null;
  }
};

export const markInstalledVersion = async (manifest: ModelVersionManifest): Promise<void> => {
  try {
    await AsyncStorage.setItem(INSTALLED_KEY, JSON.stringify(manifest));
  } catch {
    // Non-fatal: worst case, the next "Check for updates" tap re-offers
    // an update that's already installed.
  }
};

export const checkForModelUpdate = async (): Promise<{
  hasUpdate: boolean;
  latest: ModelVersionManifest | null;
  installed: ModelVersionManifest | null;
  error: string | null;
}> => {
  const [latest, installed] = await Promise.all([fetchLatestManifest(), getInstalledVersion()]);
  if (!latest) {
    return { hasUpdate: false, latest: null, installed, error: 'Could not reach Hugging Face.' };
  }
  const hasUpdate = !installed || installed.sha256 !== latest.sha256;
  return { hasUpdate, latest, installed, error: null };
};
