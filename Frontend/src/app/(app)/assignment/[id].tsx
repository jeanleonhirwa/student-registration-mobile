import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, FormError, Input, Loading, Row, Screen, SectionTitle } from '@/components/ui/kit';
import { useAuth } from '@/context/auth';
import { useFetch } from '@/hooks/use-fetch';
import { api, ApiError, type AssignmentDetail, type Submission } from '@/lib/api';
import { dueLabel, formatDateTime } from '@/lib/format';
import { appendFile } from '@/lib/upload';

function SubmissionView({ s, showStudent }: { s: Submission; showStudent?: boolean }) {
  return (
    <Card>
      {showStudent ? <ThemedText type="smallBold">{s.student_name}</ThemedText> : null}
      <ThemedText type="small" themeColor="textSecondary">
        Submitted {formatDateTime(s.submitted_at)}
      </ThemedText>
      {s.is_late ? <Badge label="Submitted late" tone="warning" /> : null}
      {s.link_url ? (
        <ThemedText type="linkPrimary" onPress={() => Linking.openURL(s.link_url!)}>
          Link: {s.link_url}
        </ThemedText>
      ) : null}
      {s.file_url ? (
        <ThemedText type="linkPrimary" onPress={() => Linking.openURL(s.file_url!)}>
          File: {s.file_name}
        </ThemedText>
      ) : null}
    </Card>
  );
}

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: a, error, loading, reload } = useFetch<AssignmentDetail>(`/assignments/${id}`);

  const [link, setLink] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Screen padTop={false}><Loading /></Screen>;
  if (error || !a) return <Screen padTop={false}><ErrorState message={error ?? 'Assignment not found'} onRetry={reload} /></Screen>;

  const isTeacher = user?.role === 'teacher';

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled) setFile(result.assets[0]);
  };

  const submit = async () => {
    setErrors({});
    setFormError(null);
    if (!link.trim() && !file) {
      setErrors({ submission: 'Provide a link or choose a document' });
      return;
    }

    const form = new FormData();
    if (link.trim()) form.append('link_url', link.trim());
    if (file) await appendFile(form, file);

    setSubmitting(true);
    try {
      await api.post(`/assignments/${a.id}/submit`, form);
      setLink('');
      setFile(null);
      await reload();
      Alert.alert('Submitted', 'Your work has been submitted.');
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.errors ?? {});
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete assignment', `Delete "${a.title}" and all its submissions?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/assignments/${a.id}`);
            router.back();
          } catch (e: any) {
            Alert.alert('Could not delete', e.message);
          }
        },
      },
    ]);

  return (
    <Screen padTop={false} onRefresh={reload}>
      <ThemedText type="subtitle">{a.title}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {a.course_code} · {a.course_title}
      </ThemedText>
      {a.description ? <ThemedText>{a.description}</ThemedText> : null}

      {a.link_url || a.file_url ? (
        <Card>
          <ThemedText type="smallBold">Assignment material</ThemedText>
          {a.link_url ? (
            <ThemedText type="linkPrimary" onPress={() => Linking.openURL(a.link_url!)}>
              Link: {a.link_url}
            </ThemedText>
          ) : null}
          {a.file_url ? (
            <ThemedText type="linkPrimary" onPress={() => Linking.openURL(a.file_url!)}>
              Document: {a.file_name}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Row label="Deadline" value={formatDateTime(a.due_date)} />
        <ThemedText type="smallBold" themeColor={a.is_overdue ? 'danger' : 'warning'}>
          {a.is_overdue ? `Deadline passed · ${dueLabel(a.due_date)}` : dueLabel(a.due_date)}
        </ThemedText>
      </Card>

      {isTeacher ? (
        <>
          <Button title="Edit assignment" variant="secondary" onPress={() => router.push(`/assignment-form?id=${a.id}`)} />
          <Button title="Delete assignment" variant="danger" onPress={confirmDelete} />
          <SectionTitle>{`Submissions (${a.submissions?.length ?? 0})`}</SectionTitle>
          {(a.submissions ?? []).length === 0 ? (
            <ThemedText themeColor="textSecondary">No submissions yet.</ThemedText>
          ) : (
            a.submissions!.map((s) => <SubmissionView key={s.id} s={s} showStudent />)
          )}
        </>
      ) : (
        <>
          {a.submission ? (
            <>
              <SectionTitle>Your submission</SectionTitle>
              <SubmissionView s={a.submission} />
            </>
          ) : a.is_overdue ? (
            <Badge label="Not submitted — deadline passed" tone="danger" />
          ) : null}

          <SectionTitle>{a.submission ? 'Resubmit' : 'Submit your work'}</SectionTitle>
          <Card>
            <FormError message={formError ?? errors.submission} />
            <Input
              label="Link (Google Drive, GitHub, …)"
              value={link}
              onChangeText={setLink}
              error={errors.link_url}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://"
            />
            <ThemedText type="small" themeColor="textSecondary">
              and/or upload a document (PDF, Word, PowerPoint, text, zip, image · max 10 MB)
            </ThemedText>
            <Button title={file ? `Selected: ${file.name}` : 'Choose document'} variant="secondary" onPress={pickFile} />
            <Button title={a.submission ? 'Resubmit' : 'Submit'} onPress={submit} loading={submitting} />
            {a.is_overdue ? (
              <ThemedText type="small" themeColor="warning">
                The deadline has passed. Late submissions are marked as late.
              </ThemedText>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}
