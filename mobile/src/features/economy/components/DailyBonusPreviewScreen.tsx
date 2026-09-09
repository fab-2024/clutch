import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PreviewRoute } from '@/src/components/dev/PreviewRoute';
import DailyBonusSheet from './DailyBonusSheet';

export default function DailyBonusPreviewScreen() {
  const [visible, setVisible] = useState(true);
  return <PreviewRoute><View style={{ flex: 1, backgroundColor: '#071118', alignItems: 'center', justifyContent: 'center' }}>
    <Pressable accessibilityRole="button" onPress={() => setVisible(true)}><Text style={{ color: '#E5EB88' }}>Afficher la récompense quotidienne</Text></Pressable>
    <DailyBonusSheet visible={visible} pending={false} error={null} onClaim={() => setVisible(false)} onClose={() => setVisible(false)} />
  </View></PreviewRoute>;
}
