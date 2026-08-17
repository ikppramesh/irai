import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import {
  Memory, MemoryCategory,
  loadMemories, addMemory, deleteMemory, clearAllMemories,
  CATEGORY_COLORS, CATEGORY_ICONS,
} from '../utils/memory';
import { colors, spacing, fontSizes, borderRadius } from '../theme';

const CATEGORIES: MemoryCategory[] = ['fact', 'preference', 'skill', 'context', 'custom'];

export const MemoryScreen: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<MemoryCategory | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('custom');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setMemories(await loadMemories());
    setRefreshing(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = filter === 'all' ? memories : memories.filter((m) => m.category === filter);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await addMemory({ content: newText.trim(), category: newCategory, source: 'manual', tags: [] });
    setNewText('');
    setNewCategory('custom');
    setShowAdd(false);
    refresh();
  };

  const handleDelete = (id: string, content: string) => {
    Alert.alert('Delete Memory', `"${content.slice(0, 60)}..."`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteMemory(id); refresh(); } },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Memories', 'Delete all stored memories? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => { await clearAllMemories(); refresh(); },
      },
    ]);
  };

  const renderMemory = ({ item }: { item: Memory }) => (
    <View style={styles.memCard}>
      <View style={styles.memHeader}>
        <View style={[styles.catBadge, { backgroundColor: CATEGORY_COLORS[item.category] + '22' }]}>
          <Text style={styles.catIcon}>{CATEGORY_ICONS[item.category]}</Text>
          <Text style={[styles.catLabel, { color: CATEGORY_COLORS[item.category] }]}>
            {item.category}
          </Text>
        </View>
        <Text style={styles.memSource}>{item.source === 'auto' ? '🤖 auto' : '✏️ manual'}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.content)} style={styles.delBtn}>
          <Text style={styles.delBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.memContent}>{item.content}</Text>
      <Text style={styles.memTime}>
        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Memory</Text>
          <Text style={styles.subtitle}>{memories.length} stored · used across all models</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
          {memories.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {(['all', ...CATEGORIES] as const).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, filter === cat && styles.filterChipActive]}
            onPress={() => setFilter(cat)}>
            <Text style={[styles.filterText, filter === cat && styles.filterTextActive]}>
              {cat === 'all' ? 'All' : `${CATEGORY_ICONS[cat]} ${cat}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderMemory}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Memories Yet</Text>
            <Text style={styles.emptyText}>
              irai automatically remembers things you share — like your name, job, preferences — and uses them across all conversations and models.
              {'\n\n'}You can also add memories manually.
            </Text>
            <TouchableOpacity style={styles.addBtnLarge} onPress={() => setShowAdd(true)}>
              <Text style={styles.addBtnText}>+ Add Memory</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add Memory Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Memory</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>What should irai remember?</Text>
            <TextInput
              style={styles.modalInput}
              value={newText}
              onChangeText={setNewText}
              placeholder="e.g. I prefer TypeScript over JavaScript"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
            />

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catOption, newCategory === cat && { borderColor: CATEGORY_COLORS[cat], backgroundColor: CATEGORY_COLORS[cat] + '22' }]}
                  onPress={() => setNewCategory(cat)}>
                  <Text style={styles.catOptionIcon}>{CATEGORY_ICONS[cat]}</Text>
                  <Text style={[styles.catOptionLabel, newCategory === cat && { color: CATEGORY_COLORS[cat] }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, !newText.trim() && styles.saveBtnDisabled]}
              onPress={handleAdd}
              disabled={!newText.trim()}>
              <Text style={styles.saveBtnText}>Save Memory</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: spacing.sm },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  addBtnLarge: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full, marginTop: spacing.lg },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },
  clearBtn: { backgroundColor: colors.error + '22', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  clearBtnText: { color: colors.error, fontWeight: '700', fontSize: fontSizes.sm },

  filterRow: { maxHeight: 48 },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.full, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  filterChipActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  filterText: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.primary },

  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  memCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  memHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.sm },
  catBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full, gap: 4 },
  catIcon: { fontSize: 11 },
  catLabel: { fontSize: fontSizes.xs, fontWeight: '700' },
  memSource: { fontSize: fontSizes.xs, color: colors.textMuted, flex: 1 },
  delBtn: { padding: spacing.xs },
  delBtnText: { color: colors.error, fontSize: fontSizes.sm, fontWeight: '700' },
  memContent: { fontSize: fontSizes.sm, color: colors.text, lineHeight: 20, marginBottom: spacing.xs },
  memTime: { fontSize: fontSizes.xs, color: colors.textMuted },

  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text },
  modalClose: { fontSize: fontSizes.lg, color: colors.textSecondary, padding: spacing.sm },
  modalBody: { padding: spacing.md },
  modalLabel: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md },
  modalInput: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.cardBorder,
    color: colors.text, fontSize: fontSizes.md,
    padding: spacing.md, minHeight: 100, textAlignVertical: 'top', lineHeight: 22,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  catOptionIcon: { fontSize: 14 },
  catOptionLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.full, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: fontSizes.md },
});
