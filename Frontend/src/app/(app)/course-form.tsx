import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button, FormError, Input, Screen } from '@/components/ui/kit';
import { api, ApiError } from '@/lib/api';
import { parseInputDate } from '@/lib/format';

/** Teacher screen: create a course. The creator automatically becomes its teacher. */
export default function CourseFormScreen() {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!/^[A-Za-z0-9-]{2,20}$/.test(code.trim())) next.code = 'Code: 2-20 letters, numbers or dashes (e.g. CS101)';
    if (title.trim().length < 3) next.title = 'Title must be at least 3 characters';
    const startDate = parseInputDate(start);
    if (!startDate) next.start_date = 'Use the format YYYY-MM-DD';
    const endDate = end.trim() ? parseInputDate(end) : null;
    if (end.trim() && !endDate) next.end_date = 'Use the format YYYY-MM-DD';
    else if (startDate && endDate && endDate < startDate) next.end_date = 'End date must be after the start date';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post('/courses', {
        code: code.trim(),
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        start_date: start.trim().slice(0, 10),
        end_date: end.trim() ? end.trim().slice(0, 10) : null,
      });
      router.back();
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.errors ?? {});
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padTop={false}>
      <ThemedText type="subtitle">New course</ThemedText>
      <FormError message={formError} />
      <Input label="Course code" value={code} onChangeText={setCode} error={errors.code} autoCapitalize="characters" placeholder="CS101" />
      <Input label="Title" value={title} onChangeText={setTitle} error={errors.title} placeholder="Introduction to Programming" />
      <Input label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Computer Science (default: General)" />
      <Input label="Description" value={description} onChangeText={setDescription} multiline placeholder="What will students learn?" />
      <Input label="Start date (YYYY-MM-DD)" value={start} onChangeText={setStart} error={errors.start_date} autoCapitalize="none" placeholder="2026-11-30" />
      <Input label="End date (optional)" value={end} onChangeText={setEnd} error={errors.end_date} autoCapitalize="none" placeholder="2027-03-30" />
      <Button title="Create course" onPress={save} loading={saving} />
      <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
