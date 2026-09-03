import { router } from 'expo-router';
import UserRoundPlus from 'lucide-react-native/icons/user-round-plus';

import { Button } from '@/src/components/ui/Button';
import { t } from '@/src/lib/i18n';
import { colors } from '@/src/theme';

export function InvitationEntry({ preview = false }: { preview?: boolean }) {
  return <Button fullWidth variant="secondary" label={t('invite.entry')} testID="open-invitations"
    leading={<UserRoundPlus size={20} color={colors.volt} />}
    onPress={() => router.push((preview ? '/growth-preview?section=invitations' : '/invitations') as never)} />;
}
