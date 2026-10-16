import { Link } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button, FormError, Input, Screen } from '@/components/ui/kit';
import { useAuth } from '@/context/auth';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Email is required';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      // On success the root layout swaps to the dashboard automatically.
      await login(email.trim(), password);
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.errors ?? {});
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={{ justifyContent: 'center', flexGrow: 1 }}>
      <ThemedText type="subtitle">Welcome back</ThemedText>
      <ThemedText themeColor="textSecondary">Log in to see your courses and assignments.</ThemedText>

      <FormError message={formError} />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        placeholder="Your password"
        onSubmitEditing={submit}
      />
      <Button title="Log in" onPress={submit} loading={loading} />

      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        New here?{' '}
        <Link href="/register">
          <ThemedText type="linkPrimary">Create an account</ThemedText>
        </Link>
      </ThemedText>
    </Screen>
  );
}
