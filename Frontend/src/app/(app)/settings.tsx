import { useState } from 'react';
import { Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chips, FormError, Input, Screen } from '@/components/ui/kit';
import { useThemePreference, type ThemePreference } from '@/context/theme';
import { api, ApiError } from '@/lib/api';

export default function SettingsScreen() {
  const { preference, setPreference } = useThemePreference();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    const found: Record<string, string> = {};
    if (!current) found.currentPassword = 'Current password is required';
    if (next.length < 8) found.newPassword = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
      found.newPassword = 'Password must contain at least one letter and one number';
    }
    if (confirm !== next) found.confirm = 'Passwords do not match';
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await api.put('/profile/password', { currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      Alert.alert('Password changed', 'Your password has been updated.');
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
      <Card>
        <ThemedText type="smallBold">Appearance</ThemedText>
        <Chips<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Dark mode is remembered on this device.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">Change password</ThemedText>
        <FormError message={formError} />
        <Input
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          error={errors.currentPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <Input
          label="New password"
          value={next}
          onChangeText={setNext}
          error={errors.newPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="At least 8 characters, letters + numbers"
        />
        <Input
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          secureTextEntry
          autoCapitalize="none"
        />
        <Button title="Update password" onPress={changePassword} loading={saving} />
      </Card>
    </Screen>
  );
}
