import ExpoModulesCore
import SwiftUI

struct GriffPrimaryButtonView: ExpoSwiftUI.View {
  @ObservedObject var props: GriffPrimaryButtonProps

  var body: some View {
    Button {
      props.onButtonPress()
    } label: {
      ZStack {
        LinearGradient(
          colors: colors,
          startPoint: .leading,
          endPoint: .trailing
        )

        VStack {
          Capsule()
            .fill(.white.opacity(0.16))
            .frame(height: 18)
            .padding(.horizontal, 12)
            .offset(y: -8)
          Spacer()
        }

        RoundedRectangle(cornerRadius: 21, style: .continuous)
          .stroke(.white.opacity(0.24), lineWidth: 1)
          .padding(1)

        HStack(spacing: 14) {
          Text(props.label)
            .font(.custom("BarlowCondensed-Bold", size: 21))

          Image(systemName: "arrow.right")
            .font(.system(size: 19, weight: .bold))
            .frame(width: 29, height: 29)
            .background(.black.opacity(0.08), in: Circle())
        }
        .foregroundStyle(Color(hex: "050A0D"))
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
      .shadow(color: glow, radius: 15, y: 9)
      .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
    .buttonStyle(GriffPressFeedbackStyle())
    .disabled(props.disabled)
    .accessibilityLabel(props.label)
    .accessibilityIdentifier("onboarding-primary-button-native")
  }

  private var colors: [Color] {
    switch props.tone {
    case "coral": [Color(hex: "FF934D"), Color(hex: "FF6045"), Color(hex: "FF7A4E")]
    case "lime": [Color(hex: "F4FF75"), Color(hex: "DCFF28"), Color(hex: "B8D91A")]
    case "purple": [Color(hex: "774AFF"), Color(hex: "C954FF"), Color(hex: "A93DFF")]
    default: [Color(hex: "14D4F4"), Color(hex: "087CFF"), Color(hex: "245CFF")]
    }
  }

  private var glow: Color {
    switch props.tone {
    case "coral": Color(hex: "FF6045", opacity: 0.42)
    case "lime": Color(hex: "DCFF28", opacity: 0.32)
    case "purple": Color(hex: "B748FF", opacity: 0.54)
    default: Color(hex: "147CFF", opacity: 0.46)
    }
  }
}

private struct GriffPressFeedbackStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? 0.76 : 1)
      .scaleEffect(configuration.isPressed ? 0.985 : 1)
      .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

private extension Color {
  init(hex: String, opacity: Double = 1) {
    let clean = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var value: UInt64 = 0
    Scanner(string: clean).scanHexInt64(&value)
    self.init(
      .sRGB,
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255,
      opacity: opacity
    )
  }
}

#if DEBUG
@available(iOS 17.0, *)
#Preview("GRIFF primary action") {
  let props = GriffPrimaryButtonProps()
  props.label = "Continuer"
  props.tone = "coral"
  return GriffPrimaryButtonView(props: props)
    .frame(width: 361, height: 56)
    .padding(24)
    .background(Color(hex: "020509"))
}
#endif
