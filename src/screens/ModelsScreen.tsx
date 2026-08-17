import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { initLlama } from 'llama.rn';
import { useAppStore, ModelInfo } from '../store/useAppStore';
import { colors, spacing, fontSizes, borderRadius } from '../theme';
import { getModelFiles, MODELS_DIR, ensureModelsDir, formatBytes } from '../utils/modelUtils';

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
];

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
    setCurrentModel,
    setLlamaContext,
    setIsModelLoading,
    setLoadedModelPath,
  } = useAppStore();

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});

  const loadModelList = useCallback(async () => {
    setRefreshing(true);
    try {
      const files = await getModelFiles();
      setModels(files);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadModelList();
  }, [loadModelList]);

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
    Alert.alert('Unloaded', 'Model removed from memory.');
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
    return (
      <View style={[styles.modelCard, isLoaded && styles.modelCardActive]}>
        <View style={styles.modelInfo}>
          {isLoaded && <View style={styles.loadedDot} />}
          <View style={styles.modelTexts}>
            <Text style={styles.modelName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.modelSize}>{item.displaySize}</Text>
          </View>
        </View>
        <View style={styles.modelActions}>
          {isLoaded ? (
            <TouchableOpacity style={[styles.btn, styles.unloadBtn]} onPress={handleUnloadModel}>
              <Text style={styles.btnText}>Unload</Text>
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
        </View>
        {isDownloading ? (
          <TouchableOpacity style={[styles.dlBtn, styles.cancelBtn]} onPress={() => handleCancelDownload(item)}>
            <Text style={styles.dlBtnText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.dlBtn, styles.downloadBtn]} onPress={() => handleDownload(item)}>
            <Text style={styles.dlBtnText}>↓ Get</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Models</Text>
        <View style={styles.headerBtns}>
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
});
