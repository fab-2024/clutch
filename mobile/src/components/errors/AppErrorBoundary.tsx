import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // This is intentionally structured so a consented crash reporter can be
    // connected here without leaking arbitrary component state or user data.
    console.error('clutch_app_crash', {
      name: error.name,
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View accessibilityRole="alert" style={styles.root}>
        <Text style={styles.eyebrow}>GRIFF // INCIDENT</Text>
        <Text style={styles.title}>LE MATCH EST INTERROMPU.</Text>
        <Text style={styles.copy}>Une erreur inattendue a été interceptée. Réessaie ; si elle revient, contacte le support depuis l’écran de connexion.</Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ error: null })} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>RÉESSAYER</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  eyebrow: { ...typography.eyebrow, color: colors.volt },
  title: { ...typography.displayMedium, maxWidth: 430, color: colors.text, textAlign: 'center' },
  copy: { ...typography.body, maxWidth: 430, color: colors.textMuted, textAlign: 'center' },
  button: { minWidth: 180, minHeight: 50, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.volt },
  buttonText: { ...typography.action, color: '#080B0F' },
  pressed: { opacity: 0.75 },
});
