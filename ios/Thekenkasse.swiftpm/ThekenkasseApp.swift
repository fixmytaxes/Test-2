import SwiftUI
import UIKit
import WebKit

// Thekenkasse – iPad-App für Swift Playgrounds.
//
// Die Oberfläche ist die erprobte Web-App aus WebApp.swift. Sie läuft komplett
// offline in einer WKWebView. Diese Datei übernimmt, was nur eine echte App kann:
// dauerhaftes Speichern, Teilen und Sichern von Dateien, Drucken und das
// Wachhalten des Bildschirms.

@main
struct ThekenkasseApp: App {
    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(uiColor: .thekeBackground)
                    .ignoresSafeArea()
                KasseView()
            }
        }
    }
}

// MARK: - Web-Oberfläche

struct KasseView: UIViewRepresentable {
    func makeCoordinator() -> KasseBridge {
        KasseBridge()
    }

    func makeUIView(context: Context) -> WKWebView {
        let bridge = context.coordinator
        let contents = WKUserContentController()
        let bootstrap = WKUserScript(source: KasseStore.bootstrapScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true)
        contents.addUserScript(bootstrap)
        contents.add(bridge, name: "thekenkasse")

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contents
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .thekeBackground
        webView.scrollView.backgroundColor = .thekeBackground
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        bridge.webView = webView
        webView.loadHTMLString(WebApp.html, baseURL: URL(string: "https://thekenkasse.local/"))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}

// MARK: - Verbindung zwischen Oberfläche und App

final class KasseBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "save":
            if let json = body["data"] as? String {
                KasseStore.save(json)
            }
        case "export":
            if let name = body["filename"] as? String, let text = body["data"] as? String {
                share(filename: name, text: text)
            }
        case "print":
            printPage()
        case "idle":
            UIApplication.shared.isIdleTimerDisabled = (body["on"] as? Bool) ?? false
        default:
            break
        }
    }

    /// Öffnet das Teilen-Menü (Sichern in „Dateien“, AirDrop, Mail …) für eine exportierte Datei.
    private func share(filename: String, text: String) {
        guard let webView = webView, let presenter = webView.window?.rootViewController?.topMost else { return }
        let safeName = filename.replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(safeName)
        do {
            try Data(text.utf8).write(to: url, options: .atomic)
        } catch {
            return
        }
        let activity = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let popover = activity.popoverPresentationController {
            popover.sourceView = webView
            popover.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        presenter.present(activity, animated: true, completion: nil)
    }

    /// Druckt die aktuelle Ansicht (z. B. die Abrechnung) über AirPrint oder als PDF.
    private func printPage() {
        guard let webView = webView else { return }
        let info = UIPrintInfo(dictionary: nil)
        info.jobName = "Thekenkasse"
        info.outputType = .general
        let controller = UIPrintInteractionController.shared
        controller.printInfo = info
        controller.printFormatter = webView.viewPrintFormatter()
        if UIDevice.current.userInterfaceIdiom == .pad {
            let anchor = CGRect(x: webView.bounds.midX, y: 40, width: 1, height: 1)
            _ = controller.present(from: anchor, in: webView, animated: true, completionHandler: nil)
        } else {
            _ = controller.present(animated: true, completionHandler: nil)
        }
    }
}

// MARK: - Dauerhafte Speicherung auf dem iPad

enum KasseStore {
    private static let defaultsKey = "thekenkasse.state"

    private static var fileURL: URL? {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?
            .appendingPathComponent("thekenkasse.json")
    }

    /// Liefert den zuletzt gespeicherten Stand (Datei oder App-Einstellungen, der neuere gewinnt).
    static func load() -> String? {
        var candidates: [String] = []
        if let url = fileURL, let text = try? String(contentsOf: url, encoding: .utf8), !text.isEmpty {
            candidates.append(text)
        }
        if let text = UserDefaults.standard.string(forKey: defaultsKey), !text.isEmpty {
            candidates.append(text)
        }
        return candidates.max { updatedAt($0) < updatedAt($1) }
    }

    /// Speichert doppelt: als Datei im Dokumente-Ordner der App und in den App-Einstellungen.
    static func save(_ json: String) {
        UserDefaults.standard.set(json, forKey: defaultsKey)
        if let url = fileURL {
            try? Data(json.utf8).write(to: url, options: .atomic)
        }
    }

    private static func updatedAt(_ json: String) -> Double {
        guard let object = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any],
              let meta = object["meta"] as? [String: Any],
              let updated = meta["updated"] as? Double else { return 0 }
        return updated
    }

    /// Wird vor dem Start der Oberfläche ausgeführt und übergibt den gespeicherten Stand.
    static func bootstrapScript() -> String {
        var script = "window.__thekenkasseNative = true;"
        if let saved = load(),
           let data = try? JSONEncoder().encode(saved),
           let literal = String(data: data, encoding: .utf8) {
            script += "\nwindow.__thekenkasseSaved = \(literal);"
        }
        return script
    }
}

// MARK: - Hilfen

extension UIColor {
    /// Hintergrund passend zur Oberfläche, hell und dunkel.
    static var thekeBackground: UIColor {
        UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 14.0 / 255.0, green: 19.0 / 255.0, blue: 17.0 / 255.0, alpha: 1)
                : UIColor(red: 241.0 / 255.0, green: 244.0 / 255.0, blue: 242.0 / 255.0, alpha: 1)
        }
    }
}

private extension UIViewController {
    var topMost: UIViewController {
        presentedViewController?.topMost ?? self
    }
}
