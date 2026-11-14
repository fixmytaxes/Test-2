package de.thekenkasse.app;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Thekenkasse für Android.
 *
 * Die Oberfläche ist die erprobte Web-App (assets/index.html) und läuft komplett
 * offline in einer WebView. Diese Klasse übernimmt, was nur eine echte App kann:
 * dauerhaftes Speichern, Dateien sichern, Drucken und den Bildschirm anlassen.
 */
public class MainActivity extends Activity {

    private static final int REQUEST_EXPORT = 1;
    private static final int REQUEST_IMPORT = 2;
    private static final String STATE_FILE = "thekenkasse.json";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingExport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(isDarkMode() ? Color.rgb(14, 19, 17) : Color.rgb(241, 244, 242));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.addJavascriptInterface(new Bridge(), "ThekenkasseAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Nur die App selbst anzeigen, keine fremden Seiten.
                return url == null || !url.startsWith("file:");
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try {
                    startActivityForResult(intent, REQUEST_IMPORT);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
            }
        });

        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript("window.__thekenkasseBack ? window.__thekenkasseBack() : false", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"true".equals(value)) {
                    MainActivity.super.onBackPressed();
                }
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_EXPORT) {
            byte[] bytes = pendingExport;
            pendingExport = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                try {
                    OutputStream out = getContentResolver().openOutputStream(data.getData());
                    if (out == null) {
                        throw new IllegalStateException("Kein Zugriff auf das Ziel");
                    }
                    try {
                        out.write(bytes);
                    } finally {
                        out.close();
                    }
                    Toast.makeText(this, "Datei gespeichert", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Speichern fehlgeschlagen", Toast.LENGTH_LONG).show();
                }
            }
        } else if (requestCode == REQUEST_IMPORT) {
            if (fileCallback != null) {
                Uri[] result = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    result = new Uri[] { data.getData() };
                }
                fileCallback.onReceiveValue(result);
                fileCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    // ------------------------------------------------------------------
    // Aktionen, die die Oberfläche auslöst
    // ------------------------------------------------------------------

    private boolean isDarkMode() {
        int mode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return mode == Configuration.UI_MODE_NIGHT_YES;
    }

    private File stateFile() {
        return new File(getFilesDir(), STATE_FILE);
    }

    private synchronized String readState() {
        File file = stateFile();
        if (!file.exists()) {
            return null;
        }
        try {
            InputStream in = new FileInputStream(file);
            try {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] chunk = new byte[16384];
                int n;
                while ((n = in.read(chunk)) != -1) {
                    buffer.write(chunk, 0, n);
                }
                return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
            } finally {
                in.close();
            }
        } catch (Exception e) {
            return null;
        }
    }

    /** Schreibt zuerst in eine Zwischendatei und ersetzt dann die alte – so geht bei einem Absturz nichts verloren. */
    private synchronized void writeState(String json) {
        if (json == null || json.isEmpty()) {
            return;
        }
        File tmp = new File(getFilesDir(), STATE_FILE + ".tmp");
        try {
            FileOutputStream out = new FileOutputStream(tmp);
            try {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            } finally {
                out.close();
            }
            if (!tmp.renameTo(stateFile())) {
                tmp.delete();
            }
        } catch (Exception e) {
            tmp.delete();
        }
    }

    private void startExport(String filename, String text) {
        pendingExport = text.getBytes(StandardCharsets.UTF_8);
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(filename.endsWith(".csv") ? "text/csv" : "application/json");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(intent, REQUEST_EXPORT);
        } catch (Exception e) {
            pendingExport = null;
            Toast.makeText(this, "Speichern ist auf diesem Gerät nicht möglich. Nutze „In Zwischenablage kopieren“.", Toast.LENGTH_LONG).show();
        }
    }

    private void printPage() {
        PrintManager printManager = (PrintManager) getSystemService(PRINT_SERVICE);
        if (printManager == null) {
            return;
        }
        printManager.print("Thekenkasse", webView.createPrintDocumentAdapter("Thekenkasse"), new PrintAttributes.Builder().build());
    }

    private void keepScreenOn(boolean on) {
        if (on) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }

    /** Wird in der Oberfläche als window.ThekenkasseAndroid angeboten. */
    public final class Bridge {

        @JavascriptInterface
        public String loadState() {
            return readState();
        }

        @JavascriptInterface
        public boolean isDarkMode() {
            return MainActivity.this.isDarkMode();
        }

        @JavascriptInterface
        public void postMessage(String json) {
            final JSONObject message;
            try {
                message = new JSONObject(json);
            } catch (Exception e) {
                return;
            }
            String type = message.optString("type");
            if ("save".equals(type)) {
                writeState(message.optString("data", null));
            } else if ("export".equals(type)) {
                final String filename = message.optString("filename", "Thekenkasse.txt").replace('/', '-');
                final String data = message.optString("data", "");
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        startExport(filename, data);
                    }
                });
            } else if ("print".equals(type)) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        printPage();
                    }
                });
            } else if ("idle".equals(type)) {
                final boolean on = message.optBoolean("on", false);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        keepScreenOn(on);
                    }
                });
            }
        }
    }
}
