import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, fontSizes, borderRadius } from '../theme';

export const ModelBar: React.FC = () => {
  const navigation = useNavigation<any>();
  const { currentModel, isModelLoading } = useAppStore();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('Models')}>
      <View style={styles.dot} />
      {isModelLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.sm }} />
      ) : null}
      <Text style={styles.modelName} numberOfLines={1}>
        {isModelLoading
          ? 'Loading model...'
          : currentModel
          ? currentModel.name
          : 'Tap to load a model'}
      </Text>
      {currentModel && !isModelLoading && (
        <Text style={styles.modelSize}>{currentModel.displaySize}</Text>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  modelName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  modelSize: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    marginRight: spacing.xs,
  },
  chevron: { color: colors.textSecondary, fontSize: fontSizes.lg },
});
