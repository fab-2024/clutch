import { G } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
import type { Cavity } from './artwork';
import { ModuleElixir } from './ModuleElixir';

type Props = { cavity: Cavity; id: string; fill: SharedValue<number>; reaction: SharedValue<number>; mutation: SharedValue<number>; reduced: boolean };

// Reuse the approved optical material, not the Module's mechanical silhouette.
// Each source cavity was measured separately; metal collars stay outside it.
export function VesselElixir({ cavity: c, ...props }: Props) {
  const sx = c.width / 288, sy = c.height / 441;
  return <G transform={`matrix(${sx} 0 0 ${sy} ${c.x - 355 * sx} ${c.y - 246 * sy})`}>
    <ModuleElixir {...props} />
  </G>;
}
