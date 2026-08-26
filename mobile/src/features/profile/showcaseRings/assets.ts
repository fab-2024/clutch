import type { ShowcaseRingAssets, ShowcaseRingFamily, ShowcaseRingStage } from './types';

type StageAssetMap = Record<ShowcaseRingStage, ShowcaseRingAssets>;

export const SHOWCASE_RING_ASSETS: Record<ShowcaseRingFamily, StageAssetMap> = {
  rank: {
    1: { full: require('../../../../assets/showcase/rings/ring-rank-01.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-rank-01-thumb.webp') },
    2: { full: require('../../../../assets/showcase/rings/ring-rank-02.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-rank-02-thumb.webp') },
    3: { full: require('../../../../assets/showcase/rings/ring-rank-03.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-rank-03-thumb.webp') },
    4: { full: require('../../../../assets/showcase/rings/ring-rank-04.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-rank-04-thumb.webp') },
    5: { full: require('../../../../assets/showcase/rings/ring-rank-05.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-rank-05-thumb.webp') },
  },
  streak: {
    1: { full: require('../../../../assets/showcase/rings/ring-streak-01.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-streak-01-thumb.webp') },
    2: { full: require('../../../../assets/showcase/rings/ring-streak-02.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-streak-02-thumb.webp') },
    3: { full: require('../../../../assets/showcase/rings/ring-streak-03.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-streak-03-thumb.webp') },
    4: { full: require('../../../../assets/showcase/rings/ring-streak-04.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-streak-04-thumb.webp') },
    5: { full: require('../../../../assets/showcase/rings/ring-streak-05.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-streak-05-thumb.webp') },
  },
  faction: {
    1: { full: require('../../../../assets/showcase/rings/ring-faction-01.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-faction-01-thumb.webp') },
    2: { full: require('../../../../assets/showcase/rings/ring-faction-02.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-faction-02-thumb.webp') },
    3: { full: require('../../../../assets/showcase/rings/ring-faction-03.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-faction-03-thumb.webp') },
    4: { full: require('../../../../assets/showcase/rings/ring-faction-04.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-faction-04-thumb.webp') },
    5: { full: require('../../../../assets/showcase/rings/ring-faction-05.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-faction-05-thumb.webp') },
  },
  major: {
    1: { full: require('../../../../assets/showcase/rings/ring-major-01.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-major-01-thumb.webp') },
    2: { full: require('../../../../assets/showcase/rings/ring-major-02.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-major-02-thumb.webp') },
    3: { full: require('../../../../assets/showcase/rings/ring-major-03.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-major-03-thumb.webp') },
    4: { full: require('../../../../assets/showcase/rings/ring-major-04.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-major-04-thumb.webp') },
    5: { full: require('../../../../assets/showcase/rings/ring-major-05.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-major-05-thumb.webp') },
  },
  seniority: {
    1: { full: require('../../../../assets/showcase/rings/ring-seniority-01.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-seniority-01-thumb.webp') },
    2: { full: require('../../../../assets/showcase/rings/ring-seniority-02.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-seniority-02-thumb.webp') },
    3: { full: require('../../../../assets/showcase/rings/ring-seniority-03.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-seniority-03-thumb.webp') },
    4: { full: require('../../../../assets/showcase/rings/ring-seniority-04.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-seniority-04-thumb.webp') },
    5: { full: require('../../../../assets/showcase/rings/ring-seniority-05.webp'), thumbnail: require('../../../../assets/showcase/rings/thumbs/ring-seniority-05-thumb.webp') },
  },
};
