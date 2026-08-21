import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { colors, spacing, typography } from '@/src/theme';

type Props = {
  bottomInset?: number;
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderScreen({ bottomInset = 0, eyebrow, title, description }: Props) {
  return (
    <Screen>
      <View style={[styles.content, bottomInset ? { paddingBottom: bottomInset } : null]}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  eyebrow: {
    ...typography.eyebrow,
    marginBottom: spacing.sm,
    color: colors.volt,
    letterSpacing: 2,
  },
  title: {
    ...typography.displayMedium,
    color: colors.text,
  },
  description: {
    ...typography.body,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
});
