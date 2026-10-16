import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, FormError, Input, Loading, Row, Screen } from '@/components/ui/kit';
import { useAuth } from '@/context/auth';
import { useFetch } from '@/hooks/use-fetch';
import { api, ApiError, type User } from '@/lib/api';
import { formatDate } from '@/lib/format';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;

export default function ProfileScreen() {
  const { setUser, logout } = useAuth();
  const { data: profile, error, loading, reload } = useFetch<User>('/profile');

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <Screen><Loading /></Screen>;
  if (error || !profile) return <Screen><ErrorState message={error ?? 'Could not load profile'} onRetry={reload} /></Screen>;

  const save = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    if (!EMAIL_REGEX.test(email.trim())) next.email = 'Please enter a valid email address';
    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) next.phone = 'Please enter a valid phone number';
    if (bio.length > 300) next.bio = 'Bio must be 300 characters or fewer';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const updated = await api.put<User>('/profile', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });
      setUser(updated);
      setEditing(false);
      await reload();
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.errors ?? {});
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone ?? '');
    setBio(profile.bio ?? '');
    setErrors({});
    setFormError(null);
    setEditing(true);
  };

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);

  return (
    <Screen onRefresh={reload}>
      <ThemedText type="subtitle">Profile</ThemedText>

      {editing ? (
        <Card>
          <FormError message={formError} />
          <Input label="Full name" value={name} onChangeText={setName} error={errors.name} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input label="Phone" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" placeholder="+250 7XX XXX XXX" />
          <Input label="Bio" value={bio} onChangeText={setBio} error={errors.bio} multiline placeholder="Tell us about yourself" />
          <Button title="Save changes" onPress={save} loading={saving} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              setEditing(false);
              setErrors({});
              setFormError(null);
            }}
          />
        </Card>
      ) : (
        <Card>
          <ThemedText type="subtitle">{profile.name}</ThemedText>
          <Badge label={profile.role === 'teacher' ? 'Teacher' : 'Student'} tone="primary" />
          <Row label="Email" value={profile.email} />
          <Row label="Phone" value={profile.phone ?? 'Not set'} />
          <Row label="Member since" value={formatDate(profile.created_at)} />
          {profile.bio ? <ThemedText type="small">{profile.bio}</ThemedText> : null}
          <Button title="Edit profile" onPress={startEditing} />
        </Card>
      )}

      <Button title="Settings" variant="secondary" onPress={() => router.push('/settings')} />
      <Button title="Log out" variant="danger" onPress={confirmLogout} />
    </Screen>
  );
}
