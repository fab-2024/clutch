import { router } from 'expo-router';

import {
  SegmentedControl,
  type SegmentedControlItem,
} from '@/src/components/ui/SegmentedControl';

export type CircleSection = 'activity' | 'league';

type CircleViewSwitchProps = {
  pendingCount?: number;
  value: CircleSection;
};

export default function CircleViewSwitch({ pendingCount = 0, value }: CircleViewSwitchProps) {
  const items: readonly SegmentedControlItem<CircleSection>[] = [
    { value: 'activity', label: 'ACTIVITÉ', badge: pendingCount || undefined },
    { value: 'league', label: 'LIGUE PRIVÉE' },
  ];

  function openSection(section: CircleSection) {
    if (section === value) return;
    router.replace(section === 'league'
      ? '/(tabs)/social/leagues'
      : '/(tabs)/social/friends');
  }

  return (
    <SegmentedControl
      accessibilityLabel="Vue du Cercle"
      items={items}
      onChange={openSection}
      testID="circle-view-switch"
      value={value}
    />
  );
}
