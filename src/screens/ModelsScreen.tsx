import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { initLlama } from 'llama.rn';
import { useAppStore, ModelInfo } from '../store/useAppStore';
import { colors, spacing, fontSizes, borderRadius } from '../theme';
import { getModelFiles, getMmprojFiles, MODELS_DIR, ensureModelsDir, formatBytes } from '../utils/modelUtils';
import { checkForModelUpdate, fetchLatestManifest, markInstalledVersion, ModelVersionManifest } from '../utils/modelUpdate';

// A small, mobile-friendly vision model + projector pair for image understanding.
// More vision (mmproj) models can be imported manually — look for "mmproj" GGUF
// files paired with a vision-capable base model (e.g. on the ggml-org HF org).
const VISION_MODEL = {
  id: 'smolvlm-500m',
  name: 'SmolVLM 500M Instruct',
  description: 'HuggingFace · Tiny vision-language model for image understanding',
  size: '~0.5 GB',
  filename: 'SmolVLM-500M-Instruct-Q8_0.gguf',
  url: 'https://huggingface.co/ggml-org/SmolVLM-500M-Instruct-GGUF/resolve/main/SmolVLM-500M-Instruct-Q8_0.gguf',
  mmprojFilename: 'mmproj-SmolVLM-500M-Instruct-Q8_0.gguf',
  mmprojUrl: 'https://huggingface.co/ggml-org/SmolVLM-500M-Instruct-GGUF/resolve/main/mmproj-SmolVLM-500M-Instruct-Q8_0.gguf',
};

// Curated list of popular mobile-friendly GGUF models
const DOWNLOADABLE_MODELS = [
  {
    id: 'phi3-mini',
    name: 'Phi-3 Mini 4K Instruct',
    description: 'Microsoft · Best balance of speed & quality',
    size: '2.2 GB',
    tag: 'Recommended',
    filename: 'Phi-3-mini-4k-instruct-q4.gguf',
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
  },
  {
    id: 'llama32-3b',
    name: 'Llama 3.2 3B Instruct',
    description: 'Meta · Fast reasoning, good quality',
    size: '2.0 GB',
    tag: 'Popular',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'llama32-1b',
    name: 'Llama 3.2 1B Instruct',
    description: 'Meta · Lightest & fastest model',
    size: '0.7 GB',
    tag: 'Fastest',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'gemma2-2b',
    name: 'Gemma 2 2B Instruct',
    description: 'Google · Strong instruction following',
    size: '1.6 GB',
    tag: 'Google',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
  },
  {
    id: 'qwen25-3b',
    name: 'Qwen 2.5 3B Instruct',
    description: 'Alibaba · Excellent multilingual support',
    size: '2.0 GB',
    tag: 'Multilingual',
    filename: 'Qwen2.5-3B-Instruct-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'smollm2-1b',
    name: 'SmolLM2 1.7B Instruct',
    description: 'HuggingFace · Very fast, tiny footprint',
    size: '1.0 GB',
    tag: 'Tiny',
    filename: 'SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B Instruct v0.3',
    description: 'Mistral AI · Highest quality (needs 6GB+ RAM)',
    size: '4.1 GB',
    tag: 'High Quality',
    filename: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
  },
  {
    id: 'irx-1',
    name: 'IRx-1',
    description: 'ikppramesh · Personal fine-tuned model, fast & private',
    size: '1.2 GB',
    tag: 'Custom',
    filename: 'irx-1-Q4_K_M.gguf',
    url: 'https://huggingface.co/ikppramesh/irx-1-GGUF/resolve/main/irx-1-Q4_K_M.gguf',
  },
];

const IRX1_MODEL = DOWNLOADABLE_MODELS.find((m) => m.id === 'irx-1')!;

interface DownloadState {
  modelId: string;
  progress: number; // 0–100
  jobId: number | null;
}

export const ModelsScreen: React.FC = () => {
  const {
    llamaContext,
    isModelLoading,
    loadedModelPath,
    settings,
    mmprojPath,
    isVisionEnabled,
    isVisionLoading,
    visionSupport,
    setCurrentModel,
    setLlamaContext,
    setIsModelLoading,
    setLoadedModelPath,
    setMmprojPath,
    setIsVisionEnabled,
    setIsVisionLoading,
    setVisionSupport,
  } = useAppStore();

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [mmprojFiles, setMmprojFiles] = useState<ModelInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
  const [visionDownloading, setVisionDownloading] = useState(false);
  const [visionDownloadProgress, setVisionDownloadProgress] = useState(0);
  const [showCustomUrlModal, setShowCustomUrlModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [irx1Latest, setIrx1Latest] = useState<ModelVersionManifest | null>(null);
  const [irx1HasUpdate, setIrx1HasUpdate] = useState(false);
  const [irx1Checking, setIrx1Checking] = useState(false);

  const loadModelList = useCallback(async () => {
    setRefreshing(true);
    try {
      const [files, mmprojs] = await Promise.all([getModelFiles(), getMmprojFiles()]);
      setModels(files);
      setMmprojFiles(mmprojs);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadModelList();
  }, [loadModelList]);

  // Check for an IRx-1 update as soon as this screen is viewed (a cheap
  // JSON fetch, not a download) so the refresh affordance is already there
  // instead of waiting for a manual "Check for updates" tap.
  useEffect(() => {
    const irx1Installed = models.some((m) => m.path === `${MODELS_DIR}/${IRX1_MODEL.filename}`);
    if (irx1Installed) handleCheckIrx1Update(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  // ─── Import from file ───────────────────────────────────────────────────────
  const handleImportModel = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'documentDirectory',
      });
      const file = result[0];
      if (!file.name?.endsWith('.gguf') && !file.name?.endsWith('.bin')) {
        Alert.alert('Invalid File', 'Please select a .gguf model file.');
        return;
      }
      if (file.fileCopyUri) {
        await loadModelList();
        Alert.alert('Imported', `${file.name} has been imported.`);
      } else {
        Alert.alert('Import failed', 'Could not copy the file.');
      }
    } catch (e: any) {
      if (!DocumentPicker.isCancel(e)) {
        Alert.alert('Error', e.message || 'Failed to import model');
      }
    }
  };

  // ─── Download from HuggingFace ──────────────────────────────────────────────
  const handleDownload = async (model: typeof DOWNLOADABLE_MODELS[0]) => {
    await ensureModelsDir();
    const destPath = `${MODELS_DIR}/${model.filename}`;

    // Check if already downloaded
    const exists = await RNFS.exists(destPath);
    if (exists) {
      Alert.alert('Already Downloaded', `${model.name} is already in your models list.`);
      setShowDownloadModal(false);
      return;
    }

    // Start download
    setDownloads((prev) => ({
      ...prev,
      [model.id]: { modelId: model.id, progress: 0, jobId: null },
    }));

    try {
      const { jobId, promise } = RNFS.downloadFile({
        fromUrl: model.url,
        toFile: destPath,
        progress: (res) => {
          const pct = Math.floor((res.bytesWritten / res.contentLength) * 100);
          setDownloads((prev) => ({
            ...prev,
            [model.id]: { ...prev[model.id], progress: pct, jobId },
          }));
        },
        progressDivider: 1,
        background: false,
      });

      setDownloads((prev) => ({
        ...prev,
        [model.id]: { ...prev[model.id], jobId },
      }));

      const result = await promise;

      if (result.statusCode === 200) {
        setDownloads((prev) => {
          const updated = { ...prev };
          delete updated[model.id];
          return updated;
        });
        if (model.id === 'irx-1') {
          // Record which build this is, so a later "Check for updates"
          // has something to compare the manifest against.
          const manifest = await fetchLatestManifest();
          if (manifest) await markInstalledVersion(manifest);
          setIrx1HasUpdate(false);
        }
        await loadModelList();
        Alert.alert('Download Complete', `${model.name} is ready to use!`);
      } else {
        throw new Error(`HTTP ${result.statusCode}`);
      }
    } catch (e: any) {
      // Clean up partial file
      const exists2 = await RNFS.exists(destPath);
      if (exists2) await RNFS.unlink(destPath);
      setDownloads((prev) => {
        const updated = { ...prev };
        delete updated[model.id];
        return updated;
      });
      if (!e?.message?.includes('cancel')) {
        Alert.alert('Download Failed', e.message || 'Could not download model.');
      }
    }
  };

  // ─── IRx-1 update check (manual only — never downloads on its own) ─────────
  const isModelDownloaded = (model: typeof DOWNLOADABLE_MODELS[0]) =>
    models.some((m) => m.path === `${MODELS_DIR}/${model.filename}`);

  const handleCheckIrx1Update = async (silent = false) => {
    if (!silent) setIrx1Checking(true);
    try {
      const { hasUpdate, latest, error } = await checkForModelUpdate();
      if (error) {
        if (!silent) Alert.alert('Check Failed', error);
        return;
      }
      setIrx1Latest(latest);
      setIrx1HasUpdate(hasUpdate);
      if (!hasUpdate && !silent) {
        Alert.alert('Up to Date', 'You have the latest IRx-1 build.');
      }
    } finally {
      if (!silent) setIrx1Checking(false);
    }
  };

  const handleUpdateIrx1 = (model: typeof DOWNLOADABLE_MODELS[0]) => {
    Alert.alert(
      'Update Available',
      `A newer IRx-1 build is available (${irx1Latest ? formatBytes(irx1Latest.size_bytes) : model.size}). Re-download now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            const destPath = `${MODELS_DIR}/${model.filename}`;
            const exists = await RNFS.exists(destPath);
            if (exists) await RNFS.unlink(destPath);
            setIrx1HasUpdate(false);
            await handleDownload(model);
          },
        },
      ],
    );
  };

  const handleCancelDownload = (model: typeof DOWNLOADABLE_MODELS[0]) => {
    const dl = downloads[model.id];
    if (dl?.jobId != null) {
      RNFS.stopDownload(dl.jobId);
    }
    setDownloads((prev) => {
      const updated = { ...prev };
      delete updated[model.id];
      return updated;
    });
  };

  // ─── Custom URL download ────────────────────────────────────────────────────
  const handleCustomUrlDownload = async () => {
    const url = customUrl.trim();

    if (!url.match(/^https?:\/\/.+/i)) {
      Alert.alert('Invalid URL', 'Please enter a valid http:// or https:// URL.');
      return;
    }
    const cleanPath = url.split('?')[0].split('#')[0];
    if (!cleanPath.endsWith('.gguf') && !cleanPath.endsWith('.bin')) {
      Alert.alert('Invalid File Type', 'URL must point to a .gguf or .bin model file.');
      return;
    }

    const filename = cleanPath.split('/').pop() ?? `custom-${Date.now()}.gguf`;
    const destPath = `${MODELS_DIR}/${filename}`;

    await ensureModelsDir();
    const exists = await RNFS.exists(destPath);
    if (exists) {
      Alert.alert('Already Downloaded', `"${filename}" is already in your models list.`);
      setShowCustomUrlModal(false);
      setCustomUrl('');
      return;
    }

    const downloadId = `custom-${Date.now()}`;
    setDownloads((prev) => ({
      ...prev,
      [downloadId]: { modelId: downloadId, progress: 0, jobId: null },
    }));

    setShowCustomUrlModal(false);
    setCustomUrl('');

    try {
      const { jobId, promise } = RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
        progress: (res) => {
          const pct = Math.floor((res.bytesWritten / res.contentLength) * 100);
          setDownloads((prev) => ({
            ...prev,
            [downloadId]: { ...prev[downloadId], progress: pct, jobId },
          }));
        },
        progressDivider: 1,
        background: false,
      });

      setDownloads((prev) => ({
        ...prev,
        [downloadId]: { ...prev[downloadId], jobId },
      }));

      const result = await promise;

      if (result.statusCode === 200) {
        setDownloads((prev) => {
          const updated = { ...prev };
          delete updated[downloadId];
          return updated;
        });
        await loadModelList();
        Alert.alert('Download Complete', `"${filename}" is ready to use!`);
      } else {
        throw new Error(`HTTP ${result.statusCode}`);
      }
    } catch (e: any) {
      const partialExists = await RNFS.exists(destPath);
      if (partialExists) await RNFS.unlink(destPath);
      setDownloads((prev) => {
        const updated = { ...prev };
        delete updated[downloadId];
        return updated;
      });
      if (!e?.message?.includes('cancel')) {
        Alert.alert('Download Failed', e.message || 'Could not download the model. Check the URL and try again.');
      }
    }
  };

  // ─── Load model into memory ─────────────────────────────────────────────────
  const handleLoadModel = async (model: ModelInfo) => {
    if (loadedModelPath === model.path) {
      Alert.alert('Already Loaded', `${model.name} is already loaded.`);
      return;
    }
    if (llamaContext) {
      try { await llamaContext.release(); } catch (_) {}
      setLlamaContext(null);
      setCurrentModel(null);
      setLoadedModelPath(null);
    }
    // A fresh context has no multimodal projector attached yet.
    setIsVisionEnabled(false);
    setVisionSupport(null);
    setIsModelLoading(true);
    try {
      const ctx = await initLlama({
        model: model.path,
        use_mlock: true,
        n_ctx: settings.contextLength,
        n_gpu_layers: 1,
        n_threads: 4,
      });
      setLlamaContext(ctx);
      setCurrentModel(model);
      setLoadedModelPath(model.path);
      Alert.alert('Model Loaded', `${model.name} is ready!`);
    } catch (e: any) {
      Alert.alert('Load Failed', e.message || 'Model may be too large for available RAM.');
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleUnloadModel = async () => {
    if (llamaContext) {
      try { await llamaContext.release(); } catch (_) {}
    }
    setLlamaContext(null);
    setCurrentModel(null);
    setLoadedModelPath(null);
    setIsVisionEnabled(false);
    setVisionSupport(null);
    Alert.alert('Unloaded', 'Model removed from memory.');
  };

  // ─── Vision (mmproj) ─────────────────────────────────────────────────────────
  const handleImportMmproj = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'documentDirectory',
      });
      const file = result[0];
      if (!file.name?.endsWith('.gguf')) {
        Alert.alert('Invalid File', 'Please select a .gguf mmproj (vision projector) file.');
        return;
      }
      if (!/mmproj/i.test(file.name)) {
        Alert.alert(
          'Rename Recommended',
          'For irai to recognize this as a vision projector, its filename should contain "mmproj". It was imported, but you may need to rename it.',
        );
      }
      if (file.fileCopyUri) {
        await loadModelList();
        Alert.alert('Imported', `${file.name} has been imported.`);
      }
    } catch (e: any) {
      if (!DocumentPicker.isCancel(e)) {
        Alert.alert('Error', e.message || 'Failed to import vision projector');
      }
    }
  };

  const handleDownloadVisionPair = async () => {
    await ensureModelsDir();
    const modelDest = `${MODELS_DIR}/${VISION_MODEL.filename}`;
    const mmprojDest = `${MODELS_DIR}/${VISION_MODEL.mmprojFilename}`;

    if ((await RNFS.exists(modelDest)) && (await RNFS.exists(mmprojDest))) {
      Alert.alert('Already Downloaded', `${VISION_MODEL.name} is already in your models list.`);
      return;
    }

    setVisionDownloading(true);
    setVisionDownloadProgress(0);
    try {
      for (const [from, to] of [
        [VISION_MODEL.url, modelDest],
        [VISION_MODEL.mmprojUrl, mmprojDest],
      ]) {
        if (await RNFS.exists(to)) continue;
        const { promise } = RNFS.downloadFile({
          fromUrl: from,
          toFile: to,
          progress: (res) => {
            setVisionDownloadProgress(Math.floor((res.bytesWritten / res.contentLength) * 100));
          },
          progressDivider: 1,
          background: false,
        });
        const result = await promise;
        if (result.statusCode !== 200) throw new Error(`HTTP ${result.statusCode}`);
      }
      await loadModelList();
      Alert.alert(
        'Vision Model Ready',
        `${VISION_MODEL.name} and its vision projector were downloaded. Load the model, then tap "Enable Vision".`,
      );
    } catch (e: any) {
      for (const path of [modelDest, mmprojDest]) {
        if (await RNFS.exists(path)) await RNFS.unlink(path);
      }
      Alert.alert('Download Failed', e.message || 'Could not download the vision model.');
    } finally {
      setVisionDownloading(false);
    }
  };

  const handleEnableVision = async (mmproj: ModelInfo) => {
    if (!llamaContext) {
      Alert.alert('No Model Loaded', 'Load a vision-capable model first, then enable vision.');
      return;
    }
    setIsVisionLoading(true);
    try {
      const ok = await llamaContext.initMultimodal({ path: mmproj.path, use_gpu: true });
      if (!ok) throw new Error('The loaded model may not be compatible with this vision projector.');
      const support = await llamaContext.getMultimodalSupport();
      setMmprojPath(mmproj.path);
      setIsVisionEnabled(true);
      setVisionSupport(support);
      Alert.alert('Vision Enabled', 'You can now attach images in the Chat tab.');
    } catch (e: any) {
      setIsVisionEnabled(false);
      setVisionSupport(null);
      Alert.alert('Vision Setup Failed', e.message || 'Could not initialize the vision projector.');
    } finally {
      setIsVisionLoading(false);
    }
  };

  const handleDisableVision = async () => {
    if (llamaContext) {
      try { await llamaContext.releaseMultimodal(); } catch (_) {}
    }
    setIsVisionEnabled(false);
    setVisionSupport(null);
  };

  const handleDeleteMmproj = (mmproj: ModelInfo) => {
    Alert.alert('Delete Vision Projector', `Delete "${mmproj.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (mmprojPath === mmproj.path) await handleDisableVision();
          await RNFS.unlink(mmproj.path);
          loadModelList();
        },
      },
    ]);
  };

  const handleDeleteModel = (model: ModelInfo) => {
    Alert.alert('Delete Model', `Delete "${model.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (loadedModelPath === model.path) await handleUnloadModel();
          await RNFS.unlink(model.path);
          loadModelList();
        },
      },
    ]);
  };

  // ─── Render downloaded model card ───────────────────────────────────────────
  const renderModel = ({ item }: { item: ModelInfo }) => {
    const isLoaded = loadedModelPath === item.path;
    const isIrx1 = item.path === `${MODELS_DIR}/${IRX1_MODEL.filename}`;
    const showRefresh = isIrx1 && irx1HasUpdate && !isLoaded;
    return (
      <View style={[styles.modelCard, isLoaded && styles.modelCardActive]}>
        <View style={styles.modelInfo}>
          {isLoaded && <View style={styles.loadedDot} />}
          <View style={styles.modelTexts}>
            <Text style={styles.modelName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.modelSize}>{item.displaySize}</Text>
            {showRefresh && <Text style={styles.dlCheckUpdateText}>New build available</Text>}
          </View>
        </View>
        <View style={styles.modelActions}>
          {isLoaded ? (
            <TouchableOpacity style={[styles.btn, styles.unloadBtn]} onPress={handleUnloadModel}>
              <Text style={styles.btnText}>Unload</Text>
            </TouchableOpacity>
          ) : showRefresh ? (
            <TouchableOpacity
              style={[styles.btn, styles.refreshModelBtn]}
              onPress={() => handleUpdateIrx1(IRX1_MODEL)}>
              <Text style={styles.btnText}>↻ Refresh</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.loadBtn]}
              onPress={() => handleLoadModel(item)}
              disabled={isModelLoading}>
              <Text style={styles.btnText}>Load</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.deleteBtn]} onPress={() => handleDeleteModel(item)}>
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Render downloadable model row in modal ─────────────────────────────────
  const renderDownloadRow = (item: typeof DOWNLOADABLE_MODELS[0]) => {
    const dl = downloads[item.id];
    const isDownloading = !!dl;
    const isIrx1Installed = item.id === 'irx-1' && isModelDownloaded(item);

    return (
      <View key={item.id} style={styles.dlRow}>
        <View style={styles.dlInfo}>
          <View style={styles.dlTitleRow}>
            <Text style={styles.dlName}>{item.name}</Text>
            <View style={[styles.tag, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
          </View>
          <Text style={styles.dlDesc}>{item.description}</Text>
          <Text style={styles.dlSize}>{item.size}</Text>
          {isDownloading && (
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${dl.progress}%` as any }]} />
              <Text style={styles.progressText}>{dl.progress}%</Text>
            </View>
          )}
          {isIrx1Installed && !isDownloading && (
            <TouchableOpacity onPress={() => handleCheckIrx1Update()} disabled={irx1Checking}>
              <Text style={styles.dlCheckUpdateText}>
                {irx1Checking ? 'Checking…' : 'Check for updates'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {isDownloading ? (
          <TouchableOpacity style={[styles.dlBtn, styles.cancelBtn]} onPress={() => handleCancelDownload(item)}>
            <Text style={styles.dlBtnText}>Cancel</Text>
          </TouchableOpacity>
        ) : isIrx1Installed && irx1HasUpdate ? (
          <TouchableOpacity style={[styles.dlBtn, styles.downloadBtn]} onPress={() => handleUpdateIrx1(item)}>
            <Text style={styles.dlBtnText}>↻ Update</Text>
          </TouchableOpacity>
        ) : !isIrx1Installed ? (
          <TouchableOpacity style={[styles.dlBtn, styles.downloadBtn]} onPress={() => handleDownload(item)}>
            <Text style={styles.dlBtnText}>↓ Get</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Models</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.refreshHeaderBtn}
            onPress={loadModelList}
            disabled={refreshing}>
            {refreshing
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.refreshBtnText}>⟳</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadHeaderBtn} onPress={() => setShowDownloadModal(true)}>
            <Text style={styles.headerBtnText}>↓ Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importHeaderBtn} onPress={handleImportModel}>
            <Text style={styles.headerBtnText}>+ Import</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active downloads banner */}
      {Object.keys(downloads).length > 0 && (
        <View style={styles.downloadBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.downloadBannerText}>
            Downloading {Object.keys(downloads).length} model(s)...
          </Text>
          <TouchableOpacity onPress={() => setShowDownloadModal(true)}>
            <Text style={styles.downloadBannerLink}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Model loading indicator */}
      {isModelLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.loadingText}>Loading model into memory...</Text>
        </View>
      )}

      {/* Vision (image understanding) section */}
      <View style={styles.visionSection}>
        <View style={styles.visionHeaderRow}>
          <Text style={styles.visionTitle}>🖼 Vision (image understanding)</Text>
          <View
            style={[
              styles.visionStatusPill,
              { backgroundColor: isVisionEnabled ? colors.success : colors.surfaceVariant },
            ]}>
            <Text style={[styles.visionStatusText, { color: isVisionEnabled ? '#000' : colors.textSecondary }]}>
              {isVisionEnabled ? 'ENABLED' : 'DISABLED'}
            </Text>
          </View>
        </View>
        <Text style={styles.visionSubtitle}>
          Load a vision-capable model + its mmproj projector to let irai understand images you attach in Chat.
        </Text>

        {mmprojFiles.length === 0 ? (
          <View style={styles.visionActionsRow}>
            <TouchableOpacity
              style={[styles.dlBtn, styles.downloadBtn, visionDownloading && styles.actionBtnDisabled]}
              onPress={handleDownloadVisionPair}
              disabled={visionDownloading}>
              <Text style={styles.dlBtnText}>
                {visionDownloading ? `↓ ${visionDownloadProgress}%` : `↓ Get ${VISION_MODEL.name}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dlBtn, styles.importVisionBtn]} onPress={handleImportMmproj}>
              <Text style={styles.dlBtnText}>+ Import mmproj</Text>
            </TouchableOpacity>
          </View>
        ) : (
          mmprojFiles.map((mmproj) => {
            const isActive = mmprojPath === mmproj.path && isVisionEnabled;
            return (
              <View key={mmproj.path} style={styles.mmprojCard}>
                <View style={styles.modelTexts}>
                  <Text style={styles.modelName} numberOfLines={1}>{mmproj.name}</Text>
                  <Text style={styles.modelSize}>
                    {mmproj.displaySize}
                    {isActive && visionSupport
                      ? `  ·  vision:${visionSupport.vision ? '✓' : '✗'} audio:${visionSupport.audio ? '✓' : '✗'}`
                      : ''}
                  </Text>
                </View>
                <View style={styles.modelActions}>
                  {isActive ? (
                    <TouchableOpacity style={[styles.btn, styles.unloadBtn]} onPress={handleDisableVision}>
                      <Text style={styles.btnText}>Disable</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btn, styles.loadBtn]}
                      onPress={() => handleEnableVision(mmproj)}
                      disabled={isVisionLoading}>
                      <Text style={styles.btnText}>{isVisionLoading ? '...' : 'Enable'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.btn, styles.deleteBtn]} onPress={() => handleDeleteMmproj(mmproj)}>
                    <Text style={styles.btnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Downloaded models list */}
      <FlatList
        data={models}
        keyExtractor={(item) => item.path}
        renderItem={renderModel}
        refreshing={refreshing}
        onRefresh={loadModelList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Models Yet</Text>
            <Text style={styles.emptyText}>
              Download a model directly or import a .gguf file.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowDownloadModal(true)}>
              <Text style={styles.emptyBtnText}>↓ Download a Model</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.emptyBtn, styles.emptyBtnSecondary]} onPress={handleImportModel}>
              <Text style={[styles.emptyBtnText, { color: colors.textSecondary }]}>+ Import from Storage</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={models.length === 0 ? styles.emptyList : styles.list}
      />

      {/* Custom URL Modal */}
      <Modal
        visible={showCustomUrlModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCustomUrlModal(false);
          setCustomUrl('');
        }}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Custom URL</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCustomUrlModal(false);
                setCustomUrl('');
              }}
              style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}>
            <View style={styles.customUrlBody}>
              <Text style={styles.customUrlLabel}>DIRECT DOWNLOAD URL</Text>
              <TextInput
                style={styles.customUrlInput}
                value={customUrl}
                onChangeText={setCustomUrl}
                placeholder="https://huggingface.co/.../model.gguf"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleCustomUrlDownload}
                autoFocus
              />
              <Text style={styles.customUrlHint}>
                Paste any direct link to a .gguf or .bin file. HuggingFace "resolve/main" URLs work perfectly.
              </Text>
              <TouchableOpacity
                style={[styles.customUrlBtn, !customUrl.trim() && styles.customUrlBtnDisabled]}
                onPress={handleCustomUrlDownload}
                disabled={!customUrl.trim()}>
                <Text style={styles.customUrlBtnText}>↓ Start Download</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Download Modal */}
      <Modal
        visible={showDownloadModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDownloadModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Download Model</Text>
            <TouchableOpacity onPress={() => setShowDownloadModal(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Select a model to download directly to your device. Larger models produce better responses but need more RAM.
          </Text>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {DOWNLOADABLE_MODELS.map(renderDownloadRow)}

            {/* Active custom downloads */}
            {Object.entries(downloads)
              .filter(([id]) => id.startsWith('custom-'))
              .map(([id, dl]) => (
                <View key={id} style={styles.dlRow}>
                  <View style={styles.dlInfo}>
                    <Text style={styles.dlName}>Custom Download</Text>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${dl.progress}%` as any }]} />
                      <Text style={styles.progressText}>{dl.progress}%</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.dlBtn, styles.cancelBtn]}
                    onPress={() => {
                      if (dl.jobId != null) RNFS.stopDownload(dl.jobId);
                      setDownloads((prev) => {
                        const updated = { ...prev };
                        delete updated[id];
                        return updated;
                      });
                    }}>
                    <Text style={styles.dlBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))}

            {/* Custom URL footer */}
            <View style={styles.customUrlFooter}>
              <View style={styles.customUrlDivider} />
              <Text style={styles.customUrlFooterLabel}>NOT IN THE LIST?</Text>
              <TouchableOpacity
                style={styles.customUrlFooterBtn}
                onPress={() => {
                  setShowDownloadModal(false);
                  setTimeout(() => setShowCustomUrlModal(true), 350);
                }}>
                <Text style={styles.customUrlFooterBtnText}>+ Paste Custom URL</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text },
  headerBtns: { flexDirection: 'row', gap: spacing.sm },
  refreshHeaderBtn: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  downloadHeaderBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  importHeaderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  headerBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },

  // Banners
  downloadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  downloadBannerText: { flex: 1, color: colors.text, fontSize: fontSizes.sm },
  downloadBannerLink: { color: colors.primary, fontWeight: '700', fontSize: fontSizes.sm },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  loadingText: { color: colors.text, fontSize: fontSizes.sm },

  // Vision section
  visionSection: {
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  visionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  visionTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  visionStatusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  visionStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  visionSubtitle: {
    fontSize: fontSizes.xs, color: colors.textSecondary,
    marginTop: 4, marginBottom: spacing.sm, lineHeight: 18,
  },
  visionActionsRow: { flexDirection: 'row', gap: spacing.sm },
  importVisionBtn: { backgroundColor: colors.secondary, flex: 1 },
  mmprojCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  actionBtnDisabled: { opacity: 0.6 },

  // Model list
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: {
    fontSize: fontSizes.sm, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    minWidth: 200,
    alignItems: 'center',
  },
  emptyBtnSecondary: { backgroundColor: colors.surfaceVariant },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },

  // Model card
  modelCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modelCardActive: { borderColor: colors.primary, backgroundColor: colors.surfaceVariant },
  modelInfo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  loadedDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: spacing.sm, marginTop: 4,
  },
  modelTexts: { flex: 1 },
  modelName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modelSize: { fontSize: fontSizes.xs, color: colors.textSecondary },
  modelActions: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  loadBtn: { backgroundColor: colors.primary },
  refreshModelBtn: { backgroundColor: colors.success },
  unloadBtn: { backgroundColor: colors.warning },
  deleteBtn: { backgroundColor: colors.error },
  btnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },

  // Download modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text },
  modalClose: { padding: spacing.sm },
  modalCloseText: { fontSize: fontSizes.lg, color: colors.textSecondary },
  modalSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    lineHeight: 20,
  },
  modalScroll: { flex: 1, paddingHorizontal: spacing.md },

  // Download row
  dlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
  },
  dlInfo: { flex: 1 },
  dlTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: spacing.sm },
  dlName: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.text, flex: 1 },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '700' },
  dlDesc: { fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: 4 },
  dlSize: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '600' },
  dlCheckUpdateText: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '600', marginTop: 4 },
  progressBarBg: {
    marginTop: spacing.sm,
    height: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  dlBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 72,
    alignItems: 'center',
  },
  downloadBtn: { backgroundColor: colors.primary },
  cancelBtn: { backgroundColor: colors.error },
  dlBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.xs },

  // Custom URL modal
  customUrlBody: {
    padding: spacing.md,
    flex: 1,
  },
  customUrlLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  customUrlInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: fontSizes.md,
    padding: spacing.md,
    minHeight: 56,
    textAlignVertical: 'center',
  },
  customUrlHint: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  customUrlBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  customUrlBtnDisabled: {
    opacity: 0.4,
  },
  customUrlBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: fontSizes.md,
  },

  // Custom URL footer inside Download Modal
  customUrlFooter: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  customUrlDivider: {
    height: 1,
    backgroundColor: colors.divider,
    width: '100%',
    marginBottom: spacing.md,
  },
  customUrlFooterLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  customUrlFooterBtn: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  customUrlFooterBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: fontSizes.sm,
  },
});
