import { router } from 'expo-router';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card, EmptyState, ErrorState, Loading, Screen, SectionTitle } from '@/components/ui/kit';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useFetch } from '@/hooks/use-fetch';
import type { Dashboard, UpcomingAssignment } from '@/lib/api';
import { dueLabel, formatDate, formatDateTime } from '@/lib/format';

function Stat({ value, label, color = 'text' }: { value: number; label: string; color?: ThemeColor }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: '45%', gap: 0 }}>
      <ThemedText type="subtitle" themeColor={color}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

function UpcomingList({ items, teacher }: { items: UpcomingAssignment[]; teacher: boolean }) {
  if (items.length === 0) {
    return <EmptyState message={teacher ? 'No upcoming deadlines.' : 'Nothing due in the next 7 days 🎉'} />;
  }
  return (
    <>
      {items.map((a) => (
        <Card key={a.id} onPress={() => router.push(`/assignment/${a.id}`)}>
          <ThemedText type="smallBold">{a.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {a.course_code} · {a.course_title}
          </ThemedText>
          <ThemedText type="small" themeColor="warning">
            {dueLabel(a.due_date)} · {formatDateTime(a.due_date)}
            {teacher && a.submission_count !== undefined ? ` · ${a.submission_count} submitted` : ''}
          </ThemedText>
        </Card>
      ))}
    </>
  );
}

export default function DashboardScreen() {
  const { data, error, loading, reload } = useFetch<Dashboard>('/dashboard');

  if (loading) return <Screen><Loading /></Screen>;
  if (error || !data) return <Screen><ErrorState message={error ?? 'Could not load dashboard'} onRetry={reload} /></Screen>;

  const firstName = data.profile.name.split(' ')[0];

  return (
    <Screen onRefresh={reload}>
      <View style={{ gap: Spacing.one }}>
        <ThemedText themeColor="textSecondary">Hello,</ThemedText>
        <ThemedText type="subtitle">{firstName} 👋</ThemedText>
        <Badge label={data.role === 'teacher' ? 'Teacher' : 'Student'} tone="primary" />
      </View>

      {data.role === 'student' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            <Stat value={data.stats.enrolled_courses} label="Courses enrolled" />
            <Stat value={data.stats.pending_assignments} label="Pending assignments" color="warning" />
            <Stat value={data.stats.overdue_assignments} label="Overdue" color="danger" />
            <Stat value={data.stats.submitted_assignments} label="Assignments submitted" color="success" />
            <Stat value={data.stats.completed_tasks} label="Tasks completed" color="success" />
            <Stat value={data.stats.open_tasks} label="Tasks to do" />
          </View>

          <SectionTitle>Due in the next 7 days</SectionTitle>
          <UpcomingList items={data.upcoming_assignments} teacher={false} />

          <SectionTitle>My courses</SectionTitle>
          {data.my_courses.length === 0 ? (
            <Card onPress={() => router.push('/courses')}>
              <ThemedText>You haven&apos;t enrolled in any course yet. Tap to browse courses.</ThemedText>
            </Card>
          ) : (
            data.my_courses.map((c) => (
              <Card key={c.id} onPress={() => router.push(`/course/${c.id}`)}>
                <ThemedText type="smallBold">
                  {c.code} · {c.title}
                </ThemedText>
                <ThemedText type="small" themeColor={c.started ? 'success' : 'textSecondary'}>
                  {c.started ? 'In progress' : `Starts ${formatDate(c.start_date)}`}
                </ThemedText>
              </Card>
            ))
          )}
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            <Stat value={data.stats.courses_taught} label="Courses I teach" />
            <Stat value={data.stats.assignments_created} label="Assignments created" />
            <Stat value={data.stats.submissions_received} label="Submissions received" color="success" />
          </View>
          <SectionTitle>Upcoming deadlines</SectionTitle>
          <UpcomingList items={data.upcoming_assignments} teacher />
        </>
      )}
    </Screen>
  );
}
