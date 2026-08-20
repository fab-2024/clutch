import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { colors, spacing } from '@/src/theme';

type Props = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderScreen({ eyebrow, title, description }: Props) {
  return (
    <Screen>
      <View style={styles.content}>
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
    marginBottom: spacing.sm,
    color: colors.volt,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  description: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
});
