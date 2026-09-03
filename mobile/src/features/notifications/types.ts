export type NotificationPreferences = {
  timezone: string;
  lockImminent: boolean;
  matchStart: boolean;
  verdict: boolean;
  promotion: boolean;
  mutation: boolean;
  duelReceived: boolean;
  streakRisk: boolean;
  streakProtected: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  retentionAvailable: boolean;
  activeDevices: number;
};

export type PushRegistrationResult =
  | { status: 'registered'; activeDevices: number }
  | { status: 'denied' }
  | { status: 'unconfigured' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  timezone: 'UTC',
  lockImminent: true,
  matchStart: true,
  verdict: true,
  promotion: true,
  mutation: true,
  duelReceived: true,
  streakRisk: true,
  streakProtected: true,
  quietHoursEnabled: false,
  quietHoursStart: 1320,
  quietHoursEnd: 480,
  retentionAvailable: true,
  activeDevices: 0,
};
