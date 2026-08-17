import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../store/useAppStore';
import { colors, spacing, fontSizes, borderRadius } from '../theme';

interface Props {
  message: Message;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const isTyping = message.role === 'assistant' && message.content === '';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>i</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {isTyping ? (
          <View style={styles.typingRow}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
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
      {isUser && (
        <View style={[styles.avatar, styles.userAvatar]}>
          <Text style={styles.avatarText}>Y</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  userContainer: { justifyContent: 'flex-end' },
  aiContainer: { justifyContent: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
  userAvatar: { backgroundColor: colors.textSecondary },
  avatarText: { color: '#fff', fontSize: fontSizes.sm, fontWeight: '700' },
  bubble: {
    maxWidth: '78%',
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
  text: { fontSize: fontSizes.md, lineHeight: 22 },
  userText: { color: colors.userBubbleText },
  aiText: { color: colors.aiBubbleText },
  meta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  typingRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
    marginHorizontal: 3,
  },
  dot1: {}, dot2: {}, dot3: {},
});
