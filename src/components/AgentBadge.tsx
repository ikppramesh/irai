import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Agent } from '../utils/agents';
import { fontSizes, spacing, borderRadius } from '../theme';

interface Props {
  agent: Agent;
  size?: 'sm' | 'md';
}

export const AgentBadge: React.FC<Props> = ({ agent, size = 'md' }) => {
  const isSm = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: agent.color + '22', borderColor: agent.color + '55' }]}>
      <Text style={[styles.icon, isSm && styles.iconSm]}>{agent.icon}</Text>
      <Text style={[styles.name, { color: agent.color }, isSm && styles.nameSm]}>{agent.name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  icon: { fontSize: 13 },
  iconSm: { fontSize: 11 },
  name: { fontSize: fontSizes.xs, fontWeight: '700' },
  nameSm: { fontSize: 10 },
});
