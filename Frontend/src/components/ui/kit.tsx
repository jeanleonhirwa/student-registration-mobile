import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── Screen ──────────────────────────────────────────────────
type ScreenProps = {
  children: ReactNode;
  /** Pull-to-refresh handler */
  onRefresh?: () => Promise<unknown> | void;
  /** Set false for screens with their own bottom bar / tabs. */
  scroll?: boolean;
  /** Add top safe-area padding (screens without a native header). */
  padTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, onRefresh, scroll = true, padTop = true, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const padding = {
    paddingTop: (padTop ? insets.top : 0) + Spacing.three,
    paddingBottom: Spacing.five,
  };

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={[styles.content, padding, styles.flex, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, padding, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              tintColor={theme.primary}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await onRefresh();
                } finally {
                  setRefreshing(false);
                }
              }}
            />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Card ────────────────────────────────────────────────────
export function Card({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const base = [styles.card, { backgroundColor: theme.backgroundElement }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

// ─── Button ──────────────────────────────────────────────────
type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const theme = useTheme();
  const bg =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.backgroundSelected
          : 'transparent';
  const color: ThemeColor =
    variant === 'primary' || variant === 'danger' ? 'onPrimary' : variant === 'ghost' ? 'primary' : 'text';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme[color]} />
      ) : (
        <ThemedText type="smallBold" themeColor={color} style={styles.buttonText}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

// ─── Input ───────────────────────────────────────────────────
export function Input({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label ? <ThemedText type="smallBold">{label}</ThemedText> : null}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...props}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.danger : theme.border,
          },
          props.multiline && styles.multiline,
          style,
        ]}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

// ─── Chips / segmented control ───────────────────────────────
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              { backgroundColor: active ? theme.primary : theme.backgroundElement },
            ]}>
            <ThemedText type="small" themeColor={active ? 'onPrimary' : 'text'}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Badge ───────────────────────────────────────────────────
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'primary' }) {
  const theme = useTheme();
  const color = tone === 'neutral' ? theme.textSecondary : theme[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <ThemedText type="small" style={{ color, fontSize: 12, lineHeight: 16 }}>
        {label}
      </ThemedText>
    </View>
  );
}

// ─── States ──────────────────────────────────────────────────
export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <ThemedText themeColor="textSecondary" style={styles.centerText}>
        {message}
      </ThemedText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <ThemedText themeColor="danger" style={styles.centerText}>
        {message}
      </ThemedText>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function FormError({ message }: { message?: string | null }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <View style={[styles.formError, { borderColor: theme.danger }]}>
      <ThemedText type="small" themeColor="danger">
        {message}
      </ThemedText>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.upper}>
        {children}
      </ThemedText>
      {action}
    </View>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.toggleRow}>
      <ThemedText>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.primary }}
      />
    </View>
  );
}

export function Icon({ ios, android, web, color = 'text', size = 22 }: { ios: string; android: string; web?: string; color?: ThemeColor; size?: number }) {
  const theme = useTheme();
  return (
    <SymbolView
      tintColor={theme[color]}
      size={size}
      name={{ ios: ios as never, android: android as never, web: (web ?? android) as never }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  button: {
    minHeight: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16 },
  field: { gap: Spacing.one },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  chips: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  center: { padding: Spacing.five, alignItems: 'center', gap: Spacing.three },
  centerText: { textAlign: 'center' },
  formError: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upper: { textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  infoValue: { flexShrink: 1, textAlign: 'right' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
