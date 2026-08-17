import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../theme';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export const ChatInput: React.FC<Props> = ({ onSend, onStop, isGenerating, disabled }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Load a model first...' : 'Message irai...'}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4000}
          editable={!disabled && !isGenerating}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={Platform.OS === 'android' ? undefined : handleSend}
        />
        {isGenerating ? (
          <TouchableOpacity style={[styles.sendBtn, styles.stopBtn]} onPress={onStop}>
            <Text style={styles.stopIcon}>■</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || disabled}>
            <Text style={styles.sendIcon}>▲</Text>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.md,
    maxHeight: 120,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: colors.textMuted, opacity: 0.5 },
  stopBtn: { backgroundColor: colors.error },
  sendIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  stopIcon: { color: '#fff', fontSize: 14 },
});
