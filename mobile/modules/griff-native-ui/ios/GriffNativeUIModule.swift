import ExpoModulesCore

public final class GriffNativeUIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GriffNativeUI")
    View(GriffPrimaryButtonView.self)
  }
}
