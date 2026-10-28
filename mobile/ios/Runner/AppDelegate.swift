import Flutter
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let launched = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    // Set before launch finishes, so a tap that cold-starts the app still reaches us.
    UNUserNotificationCenter.current().delegate = PushBridge.shared
    return launched
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    PushBridge.shared.attach(messenger: engineBridge.applicationRegistrar.messenger())
  }

  override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    PushBridge.shared.didRegister(deviceToken)
  }

  override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
    NSLog("Push: registration failed: %@", error.localizedDescription)
  }
}

/// Native push without Firebase, as the method channel "jakob/push":
///   Dart → iOS: status, request, register, environment, openSettings, ready (returns a link tapped before Dart listened),
///               setActive (the deep link on screen; its pushes are not shown as banners)
///   iOS → Dart: token {token, environment}, open {url}
final class PushBridge: NSObject, UNUserNotificationCenterDelegate {
  static let shared = PushBridge()

  private var channel: FlutterMethodChannel?
  private var dartReady = false
  private var pendingUrl: String?
  private var activeUrl: String?

  func attach(messenger: FlutterBinaryMessenger) {
    let channel = FlutterMethodChannel(name: "jakob/push", binaryMessenger: messenger)
    channel.setMethodCallHandler { [weak self] call, result in self?.handle(call, result) }
    self.channel = channel
  }

  private func handle(_ call: FlutterMethodCall, _ result: @escaping FlutterResult) {
    switch call.method {
    case "status":
      UNUserNotificationCenter.current().getNotificationSettings { settings in
        DispatchQueue.main.async { result(Self.describe(settings.authorizationStatus)) }
      }
    case "request":
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
        DispatchQueue.main.async {
          if granted { UIApplication.shared.registerForRemoteNotifications() }
          result(granted)
        }
      }
    case "register":
      UNUserNotificationCenter.current().getNotificationSettings { settings in
        DispatchQueue.main.async {
          let allowed = [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus)
          if allowed { UIApplication.shared.registerForRemoteNotifications() }
          result(allowed)
        }
      }
    case "environment":
      result(Self.apnsEnvironment())
    case "openSettings":
      if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
      result(nil)
    case "ready":
      dartReady = true
      result(pendingUrl)
      pendingUrl = nil
    case "setActive":
      activeUrl = call.arguments as? String
      result(nil)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  func didRegister(_ deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02x", $0) }.joined()
    channel?.invokeMethod("token", arguments: ["token": token, "environment": Self.apnsEnvironment()])
  }

  private func open(_ url: String) {
    if dartReady, let channel {
      channel.invokeMethod("open", arguments: ["url": url])
    } else {
      pendingUrl = url
    }
  }

  // Tapped a notification (also when the tap launched the app).
  func userNotificationCenter(
    _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    if response.actionIdentifier == UNNotificationDefaultActionIdentifier, let url = response.notification.request.content.userInfo["url"] as? String {
      DispatchQueue.main.async { self.open(url) }
    }
    completionHandler()
  }

  // In the foreground: show it, unless it is about the table that is open right now.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter, willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let url = notification.request.content.userInfo["url"] as? String
    DispatchQueue.main.async {
      if let url, url == self.activeUrl { completionHandler([]) } else { completionHandler([.banner, .list, .sound]) }
    }
  }

  private static func describe(_ status: UNAuthorizationStatus) -> String {
    switch status {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .provisional: return "provisional"
    case .ephemeral: return "ephemeral"
    case .notDetermined: return "notDetermined"
    @unknown default: return "notDetermined"
    }
  }

  /// Which APNs server knows our token: the signing decides, not debug/release. Development-signed builds
  /// (also `flutter run --release`) carry aps-environment "development" in their embedded profile;
  /// ad hoc builds "production"; App Store/TestFlight builds have no embedded profile and use production.
  static func apnsEnvironment() -> String {
    #if targetEnvironment(simulator)
    return "sandbox"
    #else
    guard
      let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
      let raw = try? Data(contentsOf: url),
      let text = String(data: raw, encoding: .isoLatin1),
      let start = text.range(of: "<?xml"),
      let end = text.range(of: "</plist>"),
      let xml = String(text[start.lowerBound..<end.upperBound]).data(using: .isoLatin1),
      let plist = try? PropertyListSerialization.propertyList(from: xml, format: nil) as? [String: Any],
      let entitlements = plist["Entitlements"] as? [String: Any],
      let aps = entitlements["aps-environment"] as? String
    else { return "production" }
    return aps == "development" ? "sandbox" : "production"
    #endif
  }
}
