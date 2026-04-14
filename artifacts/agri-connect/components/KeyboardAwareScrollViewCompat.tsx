import { Platform, ScrollView, ScrollViewProps } from "react-native";

type Props = ScrollViewProps & { children: React.ReactNode };

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  return (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...(Platform.OS !== "web" ? { automaticallyAdjustKeyboardInsets: true } : {})}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
