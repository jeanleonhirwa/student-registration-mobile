import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Chips, EmptyState, ErrorState, Loading, Screen } from '@/components/ui/kit';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useFetch } from '@/hooks/use-fetch';
import type { Assignment } from '@/lib/api';
import { dueLabel, formatDateTime } from '@/lib/format';

type Filter = 'all' | 'pending' | 'overdue' | 'submitted';

function StatusBadge({ a }: { a: Assignment }) {
  if (a.submitted) return <Badge label="Submitted" tone="success" />;
  if (a.is_overdue) return <Badge label="Overdue" tone="danger" />;
  return <Badge label="Pending" tone="warning" />;
}

export default function AssignmentsScreen() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [filter, setFilter] = useState<Filter>('all');

  const { data, error, loading, reload } = useFetch<Assignment[]>(
    `/assignments?status=${isTeacher ? 'all' : filter}`
  );

  return (
    <Screen onRefresh={reload}>
      <ThemedText type="subtitle">{isTeacher ? 'My assignments' : 'Classwork'}</ThemedText>

      {isTeacher ? (
        <Button title="+ New assignment" onPress={() => router.push('/assignment-form')} />
      ) : (
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Pending', value: 'pending' },
            { label: 'Overdue', value: 'overdue' },
            { label: 'Submitted', value: 'submitted' },
          ]}
        />
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          message={
            isTeacher
              ? 'You have not created any assignments yet.'
              : filter === 'all'
                ? 'No assignments yet. Enroll in a course to see its classwork.'
                : 'No assignments in this category.'
          }
        />
      ) : (
        (data ?? []).map((a) => (
          <Card key={a.id} onPress={() => router.push(`/assignment/${a.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
              <ThemedText type="smallBold" style={{ flex: 1 }}>
                {a.title}
              </ThemedText>
              {isTeacher ? <Badge label={`${a.submission_count} submitted`} tone="primary" /> : <StatusBadge a={a} />}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {a.course_code} · {a.course_title}
            </ThemedText>
            <ThemedText type="small" themeColor={a.is_overdue && !a.submitted ? 'danger' : 'textSecondary'}>
              {a.is_overdue ? 'Deadline passed' : dueLabel(a.due_date)} · {formatDateTime(a.due_date)}
            </ThemedText>
          </Card>
        ))
      )}
    </Screen>
  );
}
