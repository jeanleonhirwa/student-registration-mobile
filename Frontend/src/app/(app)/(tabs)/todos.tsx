import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chips, EmptyState, ErrorState, FormError, Icon, Input, Loading, Screen } from '@/components/ui/kit';
import { Spacing } from '@/constants/theme';
import { useFetch } from '@/hooks/use-fetch';
import { api, ApiError, type Todo } from '@/lib/api';
import { formatDateTime, parseInputDate, toInputString } from '@/lib/format';

type Filter = 'all' | 'active' | 'completed';

export default function TodosScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, error, loading, reload } = useFetch<Todo[]>(`/todos?status=${filter}`);

  // Add / edit form state (editingId === null → adding)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [due, setDue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setNotes('');
    setDue('');
    setErrors({});
    setFormError(null);
  };

  const startEdit = (t: Todo) => {
    setEditingId(t.id);
    setTitle(t.title);
    setNotes(t.notes ?? '');
    setDue(t.due_date ? toInputString(t.due_date) : '');
    setErrors({});
    setFormError(null);
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required';
    const dueDate = due.trim() ? parseInputDate(due) : null;
    if (due.trim() && !dueDate) next.due_date = 'Use the format YYYY-MM-DD or YYYY-MM-DD HH:mm';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const body = { title: title.trim(), notes: notes.trim(), due_date: dueDate ? dueDate.toISOString() : null };
      if (editingId) await api.put(`/todos/${editingId}`, body);
      else await api.post('/todos', body);
      resetForm();
      await reload();
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.errors ?? {});
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (t: Todo) => {
    try {
      await api.patch(`/todos/${t.id}`, { completed: !t.completed });
      await reload();
    } catch (e: any) {
      Alert.alert('Could not update task', e.message);
    }
  };

  const remove = (t: Todo) => {
    Alert.alert('Delete task', `Delete "${t.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/todos/${t.id}`);
            if (editingId === t.id) resetForm();
            await reload();
          } catch (e: any) {
            Alert.alert('Could not delete task', e.message);
          }
        },
      },
    ]);
  };

  return (
    <Screen onRefresh={reload}>
      <ThemedText type="subtitle">My tasks</ThemedText>

      <Card>
        <ThemedText type="smallBold">{editingId ? 'Edit task' : 'New task'}</ThemedText>
        <FormError message={formError} />
        <Input value={title} onChangeText={setTitle} error={errors.title} placeholder="What do you need to do?" />
        <Input value={notes} onChangeText={setNotes} placeholder="Notes (optional)" multiline />
        <Input
          value={due}
          onChangeText={setDue}
          error={errors.due_date}
          placeholder="Reminder / due: YYYY-MM-DD HH:mm (optional)"
          autoCapitalize="none"
        />
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title={editingId ? 'Save changes' : 'Add task'} onPress={save} loading={saving} style={{ flex: 1 }} />
          {editingId ? <Button title="Cancel" variant="secondary" onPress={resetForm} /> : null}
        </View>
      </Card>

      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'All', value: 'all' },
          { label: 'To do', value: 'active' },
          { label: 'Completed', value: 'completed' },
        ]}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState message="No tasks here. Add one above." />
      ) : (
        (data ?? []).map((t) => {
          const overdue = !t.completed && t.due_date && new Date(t.due_date) < new Date();
          return (
            <Card key={t.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: t.completed }}
                  accessibilityLabel={t.completed ? 'Mark as not done' : 'Mark as done'}
                  hitSlop={8}
                  onPress={() => toggle(t)}>
                  <Icon
                    ios={t.completed ? 'checkmark.circle.fill' : 'circle'}
                    android={t.completed ? 'check_circle' : 'radio_button_unchecked'}
                    color={t.completed ? 'success' : 'textSecondary'}
                    size={26}
                  />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={t.completed && { textDecorationLine: 'line-through', opacity: 0.6 }}>
                    {t.title}
                  </ThemedText>
                  {t.notes ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t.notes}
                    </ThemedText>
                  ) : null}
                  {t.due_date ? (
                    <ThemedText type="small" themeColor={overdue ? 'danger' : 'textSecondary'}>
                      {overdue ? 'Overdue · ' : 'Due '}
                      {formatDateTime(t.due_date)}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <Button title="Edit" variant="secondary" onPress={() => startEdit(t)} style={{ flex: 1, minHeight: 40 }} />
                <Button title="Delete" variant="ghost" onPress={() => remove(t)} style={{ flex: 1, minHeight: 40 }} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
