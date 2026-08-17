import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';
import { colors, spacing, fontSizes, fonts } from '../theme';

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

  const canSend = !!text.trim() && !disabled && !isGenerating;

  return (
    <View style={styles.container}>
      {/* Terminal prompt row */}
      <View style={styles.promptRow}>
        <Text style={styles.promptLabel}>
          {disabled ? 'NO_MODEL' : isGenerating ? 'GENERATING' : 'INPUT'}
        </Text>
        <Text style={styles.promptSeparator}> ══ </Text>
      </View>

      <View style={styles.inputRow}>
        <Text style={styles.promptSymbol}>{'>'}</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'load a model first...' : 'enter command...'}
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
