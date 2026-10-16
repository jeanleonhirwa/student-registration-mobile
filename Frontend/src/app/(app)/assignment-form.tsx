import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button, Chips, ErrorState, FormError, Input, Loading, Screen } from '@/components/ui/kit';
import { useFetch } from '@/hooks/use-fetch';
import { api, ApiError, type AssignmentDetail, type Course } from '@/lib/api';
import { parseInputDate, toInputString } from '@/lib/format';
import { appendFile, fileProblem } from '@/lib/upload';

/** Teacher screen: create a new assignment, or edit one when `?id=` is given. */
export default function AssignmentFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const { data: courses, error: coursesError, loading: loadingCourses } = useFetch<Course[]>(editing ? null : '/courses');
  const { data: existing, error: existingError, loading: loadingExisting } = useFetch<AssignmentDetail>(
    editing ? `/assignments/${id}` : null
  );

  if (editing ? loadingExisting : loadingCourses) return <Screen padTop={false}><Loading /></Screen>;
  const error = coursesError ?? existingError;
  if (error) return <Screen padTop={false}><ErrorState message={error} /></Screen>;

  return <AssignmentForm id={id} existing={existing} courses={courses ?? []} />;
}

function AssignmentForm({ id, existing, courses }: { id?: string; existing: AssignmentDetail | null; courses: Course[] }) {
  const editing = !!id;
  const [courseId, setCourseId] = useState<number | null>(null);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [due, setDue] = useState(existing ? toInputString(existing.due_date) : '');
  const [link, setLink] = useState(existing?.link_url ?? '');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const problem = fileProblem(result.assets[0]);
    if (problem) {
      setErrors((e) => ({ ...e, file: problem }));
      return;
    }
    setErrors(({ file: _ignored, ...rest }) => rest);
    setFile(result.assets[0]);
    setRemoveExisting(false);
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (!editing && !courseId) next.course_id = 'Choose a course';
    if (title.trim().length < 3) next.title = 'Title must be at least 3 characters';
    const dueDate = parseInputDate(due);
    if (!dueDate) next.due_date = 'Use the format YYYY-MM-DD HH:mm (e.g. 2026-11-30 17:00)';
    else if (!editing && dueDate <= new Date()) next.due_date = 'Due date must be in the future';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      // multipart so an optional document can travel with the text fields
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('due_date', dueDate!.toISOString());
      form.append('link_url', link.trim());
      if (file) await appendFile(form, file);
      if (editing) {
        if (removeExisting) form.append('remove_file', 'true');
        await api.put(`/assignments/${id}`, form);
      } else {
        form.append('course_id', String(courseId));
        await api.post('/assignments', form);
      }
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
      <ThemedText type="subtitle">{editing ? 'Edit assignment' : 'New assignment'}</ThemedText>
      <FormError message={formError} />

      {!editing ? (
        <>
          <ThemedText type="smallBold">Course</ThemedText>
          <Chips<string>
            value={courseId ? String(courseId) : ''}
            onChange={(v) => setCourseId(Number(v))}
            options={courses.map((c) => ({ label: c.code, value: String(c.id) }))}
          />
          {errors.course_id ? (
            <ThemedText type="small" themeColor="danger">
              {errors.course_id}
            </ThemedText>
          ) : null}
        </>
      ) : (
        <ThemedText themeColor="textSecondary">
          {existing?.course_code} · {existing?.course_title}
        </ThemedText>
      )}

      <Input label="Title" value={title} onChangeText={setTitle} error={errors.title} placeholder="e.g. Build a landing page" />
      <Input
        label="Instructions"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        multiline
        placeholder="What should students do?"
      />
      <Input
        label="Deadline (YYYY-MM-DD HH:mm)"
        value={due}
        onChangeText={setDue}
        error={errors.due_date}
        autoCapitalize="none"
        placeholder="2026-11-30 17:00"
      />
      <Input
        label="Link (optional)"
        value={link}
        onChangeText={setLink}
        error={errors.link_url}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https:// (Google Drive, article, …)"
      />
      <ThemedText type="smallBold">Document (optional)</ThemedText>
      {existing?.file_url && !removeExisting && !file ? (
        <ThemedText type="small" themeColor="textSecondary">
          Current document: {existing.file_name}
        </ThemedText>
      ) : null}
      <Button title={file ? `Selected: ${file.name}` : 'Choose document'} variant="secondary" onPress={pickFile} />
      {errors.file ? (
        <ThemedText type="small" themeColor="danger">
          {errors.file}
        </ThemedText>
      ) : null}
      {file ? <Button title="Remove selected document" variant="ghost" onPress={() => setFile(null)} /> : null}
      {existing?.file_url && !file ? (
        <Button
          title={removeExisting ? 'Keep current document' : 'Remove current document'}
          variant="ghost"
          onPress={() => setRemoveExisting((v) => !v)}
        />
      ) : null}
      <Button title={editing ? 'Save changes' : 'Create assignment'} onPress={save} loading={saving} />
      <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
