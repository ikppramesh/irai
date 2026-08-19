import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Image,
  Platform,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { colors, spacing, fontSizes, fonts } from '../theme';

export interface AttachedImage {
  uri: string;
  base64: string;
  mime: string;
}

interface Props {
  onSend: (text: string, image?: AttachedImage) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled: boolean;
  visionEnabled: boolean;
}

const PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  includeBase64: true,
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8 as const,
};

export const ChatInput: React.FC<Props> = ({ onSend, onStop, isGenerating, disabled, visionEnabled }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<AttachedImage | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !image) || disabled) return;
    onSend(trimmed, image ?? undefined);
    setText('');
    setImage(null);
  };

  const applyAsset = (asset?: Asset) => {
    if (!asset?.uri || !asset?.base64) return;
    setImage({ uri: asset.uri, base64: asset.base64, mime: asset.type || 'image/jpeg' });
  };

  const pickFromCamera = () => {
    launchCamera(PICKER_OPTIONS, (res) => {
      if (res.didCancel || res.errorCode) return;
      applyAsset(res.assets?.[0]);
    });
  };

  const pickFromGallery = () => {
    launchImageLibrary(PICKER_OPTIONS, (res) => {
      if (res.didCancel || res.errorCode) return;
      applyAsset(res.assets?.[0]);
    });
  };

  const handleAttachPress = () => {
    if (!visionEnabled) {
      Alert.alert(
        'Vision Not Enabled',
        'Load a vision-capable model and its mmproj projector from the Models tab, then tap "Enable Vision" to attach images.',
      );
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) pickFromCamera();
          if (index === 2) pickFromGallery();
        },
      );
    } else {
      Alert.alert('Attach Image', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: pickFromCamera },
        { text: 'Choose from Gallery', onPress: pickFromGallery },
      ]);
    }
  };

  const canSend = (!!text.trim() || !!image) && !disabled && !isGenerating;

  return (
    <View style={styles.container}>
      {/* Terminal prompt row */}
      <View style={styles.promptRow}>
        <Text style={styles.promptLabel}>
          {disabled ? 'NO_MODEL' : isGenerating ? 'GENERATING' : 'INPUT'}
        </Text>
        <Text style={styles.promptSeparator}> ══ </Text>
      </View>

      {image && (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setImage(null)}>
            <Text style={styles.imageRemoveText}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.attachBtn, !visionEnabled && styles.attachBtnDim]}
          onPress={handleAttachPress}
          disabled={disabled || isGenerating}>
          <Text style={styles.attachBtnText}>{'📷'}</Text>
        </TouchableOpacity>
        <Text style={styles.promptSymbol}>{'>'}</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'load a model first...' : image ? 'describe what to look for...' : 'enter command...'}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4000}
          editable={!disabled && !isGenerating}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={Platform.OS === 'android' ? undefined : handleSend}
          selectionColor={colors.primary}
        />
        {isGenerating ? (
          <TouchableOpacity style={[styles.actionBtn, styles.stopBtn]} onPress={onStop}>
            <Text style={styles.actionBtnText}>{'[STOP]'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, !canSend && styles.actionBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}>
            <Text style={[styles.actionBtnText, !canSend && styles.actionBtnTextDisabled]}>
              {'[RUN]'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primaryDark,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  promptLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  promptSeparator: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.primaryDark,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  imagePreview: {
    width: 56,
    height: 56,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  imageRemoveBtn: {
    marginLeft: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 2,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  attachBtn: {
    paddingHorizontal: 6,
    paddingBottom: Platform.OS === 'android' ? 8 : 6,
    marginRight: spacing.xs,
  },
  attachBtnDim: { opacity: 0.4 },
  attachBtnText: { fontSize: fontSizes.lg },
  promptSymbol: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.lg,
    color: colors.primary,
    fontWeight: 'bold',
    paddingBottom: Platform.OS === 'android' ? 8 : 6,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: fonts.mono,
    color: colors.text,
    fontSize: fontSizes.md,
    maxHeight: 120,
    paddingVertical: spacing.sm,
    lineHeight: 20,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 2,
    marginLeft: spacing.xs,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  actionBtnDisabled: {
    borderColor: colors.primaryDark,
  },
  stopBtn: {
    borderColor: colors.error,
  },
  actionBtnText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  actionBtnTextDisabled: {
    color: colors.textMuted,
  },
});
