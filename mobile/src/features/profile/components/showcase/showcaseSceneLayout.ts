export type ShowcaseSceneFrame = {
  width: number;
  height: number;
  top: number;
  bottom: number;
};

export const LEGACY_SHOWCASE_SCENE_FRAME: ShowcaseSceneFrame = {
  width: 1844,
  height: 853,
  top: 87,
  bottom: 676,
};

/** The backdrop and its hit targets must always use the same, uncropped canvas. */
export function showcaseSceneLayout(
  viewport: { width: number; height: number },
  frame: ShowcaseSceneFrame = LEGACY_SHOWCASE_SCENE_FRAME,
) {
  const contentHeight = frame.bottom - frame.top;
  const aspectRatio = frame.width / contentHeight;
  const heightForWidth = viewport.width / aspectRatio;
  const fitsWidth = heightForWidth <= viewport.height;
  const width = fitsWidth ? viewport.width : viewport.height * aspectRatio;
  const height = fitsWidth ? heightForWidth : viewport.height;

  return {
    canvas: {
      width,
      height,
      left: (viewport.width - width) / 2,
      top: (viewport.height - height) / 2,
    },
    image: {
      width,
      height: height * (frame.height / contentHeight),
      left: 0,
      top: frame.top === 0 ? 0 : -height * (frame.top / contentHeight),
    },
  };
}
