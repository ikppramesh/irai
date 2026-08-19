import RNFS from 'react-native-fs';

export const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models`;

export const ensureModelsDir = async () => {
  const exists = await RNFS.exists(MODELS_DIR);
  if (!exists) {
    await RNFS.mkdir(MODELS_DIR);
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const isGgufFile = (name: string) => name.endsWith('.gguf') || name.endsWith('.bin');
const isMmprojFile = (name: string) => /mmproj/i.test(name);

export const getModelFiles = async () => {
  await ensureModelsDir();
  const files = await RNFS.readDir(MODELS_DIR);
  return files
    .filter((f) => isGgufFile(f.name) && !isMmprojFile(f.name))
    .map((f) => ({
      name: f.name.replace(/\.(gguf|bin)$/, ''),
      path: f.path,
      size: f.size,
      displaySize: formatBytes(f.size),
    }));
};

// Multimodal projector (mmproj) files — paired with a vision-capable model
// to enable image (and sometimes audio) understanding via llama.rn's mtmd support.
export const getMmprojFiles = async () => {
  await ensureModelsDir();
  const files = await RNFS.readDir(MODELS_DIR);
  return files
    .filter((f) => isGgufFile(f.name) && isMmprojFile(f.name))
    .map((f) => ({
      name: f.name.replace(/\.(gguf|bin)$/, ''),
      path: f.path,
      size: f.size,
      displaySize: formatBytes(f.size),
    }));
};

export const buildPrompt = (
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
): string => {
  let prompt = '';
  // ChatML format (works with most models)
  prompt += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
  for (const msg of messages) {
    if (msg.role === 'user') {
      prompt += `<|im_start|>user\n${msg.content}<|im_end|>\n<|im_start|>assistant\n`;
    } else if (msg.role === 'assistant') {
      prompt += `${msg.content}<|im_end|>\n`;
    }
  }
  return prompt;
};
