import * as Haptics from 'expo-haptics';

function safely(play: () => Promise<void>) {
  void play().catch(() => undefined);
}

export function selectionFeedback() {
  safely(() => Haptics.selectionAsync());
}

export function impactFeedback(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) {
  safely(() => Haptics.impactAsync(style));
}

export function successFeedback() {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function errorFeedback() {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
