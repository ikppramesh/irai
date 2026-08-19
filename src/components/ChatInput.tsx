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
import { colors, spacing, fontSizes, fonts, borderRadius } from '../theme';

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
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Load a model to get started' : image ? 'Ask about this image…' : 'Message irai…'}
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
          <TouchableOpacity style={[styles.sendBtn, styles.stopBtn]} onPress={onStop}>
            <View style={styles.stopIcon} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}>
            <Text style={[styles.sendBtnText, !canSend && styles.sendBtnTextDisabled]}>{'↑'}</Text>
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
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  imagePreview: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  imageRemoveBtn: {
    marginLeft: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.xl + 10,
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  attachBtnDim: { opacity: 0.35 },
  attachBtnText: { fontSize: fontSizes.lg },
  input: {
    flex: 1,
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fontSizes.md,
    maxHeight: 120,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  stopBtn: {
    backgroundColor: colors.primary,
  },
  stopIcon: {
    width: 11,
    height: 11,
    borderRadius: 2,
    backgroundColor: colors.background,
  },
  sendBtnText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.background,
  },
  sendBtnTextDisabled: {
    color: colors.textMuted,
  },
});
