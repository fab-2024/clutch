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

/** The visible scene frame and its hit targets always fill the available viewport together. */
export function showcaseSceneLayout(
  viewport: { width: number; height: number },
  frame: ShowcaseSceneFrame = LEGACY_SHOWCASE_SCENE_FRAME,
) {
  const contentHeight = frame.bottom - frame.top;

  return {
    canvas: {
      width: viewport.width,
      height: viewport.height,
      left: 0,
      top: 0,
    },
    image: {
      width: viewport.width,
      height: viewport.height * (frame.height / contentHeight),
      left: 0,
      top: frame.top === 0 ? 0 : -viewport.height * (frame.top / contentHeight),
    },
  };
}
