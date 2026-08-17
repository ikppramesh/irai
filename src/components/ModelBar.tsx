import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { getAgent } from '../utils/agents';
import { colors, spacing, fontSizes, borderRadius } from '../theme';

export const ModelBar: React.FC = () => {
  const navigation = useNavigation<any>();
  const { currentModel, isModelLoading, activeAgentId, isMultiAgentMode } = useAppStore();
  const agent = getAgent(activeAgentId);

  return (
    <View style={styles.row}>
      {/* Agent indicator */}
      <TouchableOpacity
        style={[styles.agentChip, { borderColor: isMultiAgentMode ? colors.primary : agent.color + '66' }]}
        onPress={() => navigation.navigate('Agents')}>
        <Text style={styles.agentIcon}>{isMultiAgentMode ? '🔮' : agent.icon}</Text>
        <Text style={[styles.agentName, { color: isMultiAgentMode ? colors.primary : agent.color }]}>
          {isMultiAgentMode ? 'Multi-Agent' : agent.name}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Model indicator */}
      <TouchableOpacity
        style={styles.modelChip}
        onPress={() => navigation.navigate('Models')}>
        {isModelLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={[styles.modelDot, { backgroundColor: currentModel ? colors.success : colors.textMuted }]} />
        )}
        <Text style={styles.modelName} numberOfLines={1}>
          {isModelLoading ? 'Loading...' : currentModel ? currentModel.name : 'No model'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  agentChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full, borderWidth: 1,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    gap: 4,
  },
  agentIcon: { fontSize: 14 },
  agentName: { fontSize: fontSizes.xs, fontWeight: '700' },
  modelChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full, borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    gap: 6,
  },
  modelDot: { width: 7, height: 7, borderRadius: 4 },
  modelName: { flex: 1, fontSize: fontSizes.xs, color: colors.text, fontWeight: '600' },
  chevron: { color: colors.textMuted, fontSize: 14 },
});
