import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Chips, EmptyState, ErrorState, Input, Loading, Screen } from '@/components/ui/kit';
import { useAuth } from '@/context/auth';
import { useFetch } from '@/hooks/use-fetch';
import { api, type Course } from '@/lib/api';
import { formatDate } from '@/lib/format';

type Status = 'all' | 'enrolled' | 'available' | 'mine' | 'unassigned';

export default function CoursesScreen() {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<Status>('all');
  const [busyId, setBusyId] = useState<number | null>(null);

  // Wait for the user to pause typing before hitting the server.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = new URLSearchParams({ search: debounced, category, status });
  const { data: courses, error, loading, reload } = useFetch<Course[]>(`/courses?${query}`);
  const { data: categories } = useFetch<string[]>('/courses/categories');

  const enroll = async (c: Course) => {
    setBusyId(c.id);
    try {
      await api.post(`/courses/${c.id}/enroll`);
      await reload();
    } catch (e: any) {
      Alert.alert('Could not enroll', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const claim = async (c: Course) => {
    setBusyId(c.id);
    try {
      await api.post(`/courses/${c.id}/claim`);
      await reload();
    } catch (e: any) {
      Alert.alert('Could not assign course', e.message);
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const release = (c: Course) => {
    Alert.alert('Stop teaching', `Release ${c.title}? It becomes available to other teachers.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Release',
        style: 'destructive',
        onPress: async () => {
          setBusyId(c.id);
          try {
            await api.del(`/courses/${c.id}/claim`);
            await reload();
          } catch (e: any) {
            Alert.alert('Could not release course', e.message);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const unenroll = (c: Course) => {
    Alert.alert('Unenroll', `Leave ${c.title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unenroll',
        style: 'destructive',
        onPress: async () => {
          setBusyId(c.id);
          try {
            await api.del(`/courses/${c.id}/enroll`);
            await reload();
          } catch (e: any) {
            Alert.alert('Could not unenroll', e.message);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const enrolled = (courses ?? []).filter((c) => c.enrolled);
  const others = (courses ?? []).filter((c) => !c.enrolled);

  const renderCourse = (c: Course) => (
    <Card key={c.id} onPress={() => router.push(`/course/${c.id}`)}>
      <ThemedText type="smallBold">
        {c.code} · {c.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {c.instructor ?? 'TBA'} · {c.category}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {c.ended ? `Ended ${formatDate(c.end_date)}` : `${c.started ? 'Started' : 'Starts'} ${formatDate(c.start_date)}`}
      </ThemedText>
      {isStudent ? (
        c.enrolled ? (
          c.started ? (
            <Badge label="Enrolled · in progress" tone="success" />
          ) : (
            <Button title="Unenroll" variant="secondary" loading={busyId === c.id} onPress={() => unenroll(c)} />
          )
        ) : c.ended ? (
          <Badge label="Course ended" />
        ) : (
          <Button title="Enroll" loading={busyId === c.id} onPress={() => enroll(c)} />
        )
      ) : c.mine ? (
        <>
          <Badge label="You teach this course" tone="success" />
          <Button title="Stop teaching" variant="secondary" loading={busyId === c.id} onPress={() => release(c)} />
        </>
      ) : c.teacher_id ? (
        <Badge label="Taught by another teacher" />
      ) : (
        <Button title="Teach this course" loading={busyId === c.id} onPress={() => claim(c)} />
      )}
    </Card>
  );

  return (
    <Screen onRefresh={reload}>
      <ThemedText type="subtitle">Courses</ThemedText>
      {!isStudent ? <Button title="+ Create a course" onPress={() => router.push('/course-form')} /> : null}
      <Input value={search} onChangeText={setSearch} placeholder="Search by title, code or instructor" clearButtonMode="while-editing" />
      <Chips
        value={category}
        onChange={setCategory}
        options={[{ label: 'All categories', value: 'all' }, ...(categories ?? []).map((c) => ({ label: c, value: c }))]}
      />
      <Chips
        value={status}
        onChange={setStatus}
        options={
          isStudent
            ? [
                { label: 'All', value: 'all' },
                { label: 'My courses', value: 'enrolled' },
                { label: 'Available', value: 'available' },
              ]
            : [
                { label: 'All', value: 'all' },
                { label: 'I teach', value: 'mine' },
                { label: 'Unassigned', value: 'unassigned' },
              ]
        }
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (courses ?? []).length === 0 ? (
        <EmptyState message="No courses match your search." />
      ) : isStudent && status === 'all' ? (
        <>
          {enrolled.length > 0 && <ThemedText type="smallBold">Enrolled ({enrolled.length})</ThemedText>}
          {enrolled.map(renderCourse)}
          {others.length > 0 && <ThemedText type="smallBold">Available to enroll ({others.length})</ThemedText>}
          {others.map(renderCourse)}
        </>
      ) : (
        (courses ?? []).map(renderCourse)
      )}
    </Screen>
  );
}
