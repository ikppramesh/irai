import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Message } from '../store/useAppStore';
import { colors, spacing, fontSizes, borderRadius } from '../theme';

interface Props {
  message: Message;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const isTyping = message.role === 'assistant' && message.content === '';
  const [expanded, setExpanded] = useState(true);

  const agentColor = message.agentColor || colors.primary;
  const agentIcon = message.agentIcon || '🤖';
  const agentName = message.agentName || 'irai';
  const isPipelineStep = message.isPipelineStep;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: agentColor + '33' }]}>
          <Text style={styles.avatarIcon}>{agentIcon}</Text>
        </View>
      )}

      <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
        {!isUser && (
          <View style={styles.agentRow}>
            <Text style={[styles.agentName, { color: agentColor }]}>{agentName}</Text>
            {isPipelineStep && <Text style={styles.pipelineTag}>agent step</Text>}
          </View>
        )}

        {isPipelineStep ? (
          // Collapsible pipeline step
          <TouchableOpacity
            style={[styles.bubble, styles.pipelineBubble, { borderColor: agentColor + '44' }]}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.9}>
            {!expanded ? (
              <Text style={[styles.collapsedText, { color: agentColor }]}>
                {agentIcon} {agentName}: {message.content.slice(0, 80)}… (tap to expand)
              </Text>
            ) : (
              <>
                <Text style={[styles.text, styles.aiText]}>{message.content}</Text>
                <Text style={[styles.collapseHint, { color: agentColor }]}>tap to collapse</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
            {isTyping ? (
              <View style={styles.typingRow}>
                <Text style={styles.typingDots}>●●●</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
                  {message.content}
                </Text>
                {!isUser && message.tokensPerSec && message.tokensPerSec > 0 && (
                  <Text style={styles.meta}>
                    {message.tokensPerSec.toFixed(1)} t/s · {message.tokens} tokens
                  </Text>
                )}
              </>
            )}
          </View>
        )}
      </View>

      {isUser && (
        <View style={[styles.avatar, styles.userAvatar]}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    alignItems: 'flex-end',
  },
  userContainer: { justifyContent: 'flex-end' },
  aiContainer: { justifyContent: 'flex-start' },
  bubbleWrapper: { maxWidth: '80%' },
  userWrapper: { alignItems: 'flex-end' },
  aiWrapper: { alignItems: 'flex-start' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 6,
  },
  userAvatar: { backgroundColor: colors.textMuted + '33' },
  avatarIcon: { fontSize: 16 },
  agentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: spacing.xs },
  agentName: { fontSize: fontSizes.xs, fontWeight: '800' },
  pipelineTag: {
    fontSize: 9, fontWeight: '700', color: colors.textMuted,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.aiBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pipelineBubble: {
    backgroundColor: colors.surfaceVariant,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  text: { fontSize: fontSizes.md, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: colors.text },
  collapsedText: { fontSize: fontSizes.xs, lineHeight: 18, fontStyle: 'italic' },
  collapseHint: { fontSize: 10, marginTop: spacing.xs, opacity: 0.6 },
  meta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.xs },
  typingRow: { paddingVertical: 4 },
  typingDots: { color: colors.textSecondary, fontSize: 12, letterSpacing: 4 },
});
