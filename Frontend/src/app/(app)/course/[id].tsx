import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, Loading, Row, Screen, SectionTitle } from '@/components/ui/kit';
import { useAuth } from '@/context/auth';
import { useFetch } from '@/hooks/use-fetch';
import { api, type CourseDetail } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: course, error, loading, reload } = useFetch<CourseDetail>(`/courses/${id}`);
  const [busy, setBusy] = useState(false);

  if (loading) return <Screen padTop={false}><Loading /></Screen>;
  if (error || !course) return <Screen padTop={false}><ErrorState message={error ?? 'Course not found'} onRetry={reload} /></Screen>;

  const run = async (action: () => Promise<unknown>, failTitle: string) => {
    setBusy(true);
    try {
      await action();
      await reload();
    } catch (e: any) {
      Alert.alert(failTitle, e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmUnenroll = () =>
    Alert.alert('Unenroll', `Leave ${course.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unenroll',
        style: 'destructive',
        onPress: () => run(() => api.del(`/courses/${course.id}/enroll`), 'Could not unenroll'),
      },
    ]);

  return (
    <Screen padTop={false} onRefresh={reload}>
      <ThemedText type="subtitle">{course.title}</ThemedText>
      <Badge label={course.code} tone="primary" />
      {course.description ? <ThemedText>{course.description}</ThemedText> : null}

      <Card>
        <Row label="Instructor" value={course.instructor ?? 'TBA'} />
        <Row label="Category" value={course.category} />
        <Row label="Starts" value={formatDate(course.start_date)} />
        <Row label="Ends" value={formatDate(course.end_date)} />
        <Row label="Students enrolled" value={String(course.enrolled_count)} />
        <Row label="Assignments" value={String(course.assignment_count)} />
        <Row label="Status" value={course.ended ? 'Ended' : course.started ? 'In progress' : 'Not started yet'} />
      </Card>

      {user?.role === 'student' ? (
        course.enrolled ? (
          course.can_unenroll ? (
            <Button title="Unenroll" variant="danger" loading={busy} onPress={confirmUnenroll} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              You are enrolled. Unenrolling is only possible before the course starts.
            </ThemedText>
          )
        ) : course.ended ? (
          <Badge label="Course ended" />
        ) : (
          <Button
            title="Enroll in this course"
            loading={busy}
            onPress={() => run(() => api.post(`/courses/${course.id}/enroll`), 'Could not enroll')}
          />
        )
      ) : null}

      {course.enrolled || user?.role === 'teacher' ? (
        <>
          <SectionTitle>Assignments</SectionTitle>
          {course.assignments.length === 0 ? (
            <ThemedText themeColor="textSecondary">No assignments yet.</ThemedText>
          ) : (
            course.assignments.map((a) => (
              <Card key={a.id} onPress={() => router.push(`/assignment/${a.id}`)}>
                <ThemedText type="smallBold">{a.title}</ThemedText>
                <ThemedText type="small" themeColor={a.is_overdue && !a.submitted ? 'danger' : 'textSecondary'}>
                  {a.is_overdue ? 'Deadline passed' : 'Due'} · {formatDateTime(a.due_date)}
                  {user?.role === 'student' && a.submitted ? ' · Submitted' : ''}
                </ThemedText>
              </Card>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
