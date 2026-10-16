import { Link } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button, Chips, FormError, Input, Screen } from '@/components/ui/kit';
import { useAuth } from '@/context/auth';
import { ApiError, type Role } from '@/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    if (!EMAIL_REGEX.test(email.trim())) next.email = 'Please enter a valid email address';
    if (password.length < 8) next.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      next.password = 'Password must contain at least one letter and one number';
    }
    if (confirm !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      // On success the user is logged in and the root layout opens the dashboard.
      await register({ name: name.trim(), email: email.trim(), password, role });
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.errors ?? {});
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ThemedText type="subtitle">Create account</ThemedText>
      <ThemedText themeColor="textSecondary">Register to enroll in courses and track your work.</ThemedText>

      <FormError message={formError} />
      <Input label="Full name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" placeholder="Jane Doe" />
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
        placeholder="At least 8 characters, letters + numbers"
      />
      <Input
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Repeat your password"
      />

      <ThemedText type="smallBold">I am a</ThemedText>
      <Chips
        value={role}
        onChange={setRole}
        options={[
          { label: 'Student', value: 'student' },
          { label: 'Teacher', value: 'teacher' },
        ]}
      />

      <Button title="Register" onPress={submit} loading={loading} />

      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/login">
          <ThemedText type="linkPrimary">Log in</ThemedText>
        </Link>
      </ThemedText>
    </Screen>
  );
}
