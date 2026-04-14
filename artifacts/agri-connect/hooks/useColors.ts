import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

/**
 * Returns design tokens for the current color scheme.
 * Uses the user's explicit dark-mode preference from ThemeContext.
 */
export function useColors() {
  const { isDark } = useTheme();
  const palette =
    isDark && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
