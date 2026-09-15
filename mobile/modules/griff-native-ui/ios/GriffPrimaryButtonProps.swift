import ExpoModulesCore

final class GriffPrimaryButtonProps: ExpoSwiftUI.ViewProps {
  @Field var disabled = false
  @Field var label = "Continuer"
  @Field var tone = "blue"

  let onButtonPress = EventDispatcher()
}
