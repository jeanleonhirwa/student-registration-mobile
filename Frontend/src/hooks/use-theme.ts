/**
 * Returns the color palette for the active scheme. The scheme follows the user's
 * choice in Settings (system / light / dark).
 */

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/context/theme';

export function useTheme() {
  const { scheme } = useThemePreference();
  return Colors[scheme];
}
