package de.reisekosten.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reisekosten für Android.
 *
 * Die Oberfläche ist die Web-App (assets/index.html, eine Datei) und läuft offline in einer WebView.
 * Sie wird unter https://appassets.androidplatform.net/ ausgeliefert (sichere Herkunft), damit
 * IndexedDB und Web-Crypto zuverlässig funktionieren. Diese Klasse ergänzt, was nur eine App kann:
 * Belege mit der Kamera fotografieren, Dateien speichern, PDFs öffnen und per E-Mail-App teilen.
 */
public class MainActivity extends Activity {

    static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/index.html";
    private static final int REQ_DATEI = 1;
    private static final int REQ_SPEICHERN = 2;

    private WebView webView;
    private ValueCallback<Uri[]> dateiCallback;
    private Uri kameraUri;
    private File kameraDatei;
    private byte[] zuSpeichern;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(dunkel() ? Color.rgb(12, 18, 23) : Color.rgb(243, 245, 247));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.addJavascriptInterface(new Bruecke(), "ReisekostenAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) {
                    return asset(u.getPath());
                }
                return null;
            }

            // Variante mit String: wird auf allen Android-Versionen aufgerufen (SDK 23 als Basis)
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri u = Uri.parse(url);
                if (HOST.equals(u.getHost())) {
                    return false;
                }
                // Links (Karten, E-Mail) in der passenden App öffnen, nie in der App-WebView
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Keine App zum Öffnen gefunden", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                return dateiAuswahl(callback, params);
            }
        });

        setContentView(webView);
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(START);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript("window.__reisekostenBack ? window.__reisekostenBack() : false", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"true".equals(value)) {
                    MainActivity.super.onBackPressed();
                }
            }
        });
    }

    private boolean dunkel() {
        int mode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return mode == Configuration.UI_MODE_NIGHT_YES;
    }

    // ------------------------------------------------------------------
    // App-Dateien (Oberfläche) aus den Assets liefern
    // ------------------------------------------------------------------

    private WebResourceResponse asset(String pfad) {
        String name = pfad == null || pfad.equals("/") || pfad.isEmpty() ? "index.html" : pfad.substring(1);
        if (!name.contains("..")) {
            try {
                InputStream in = getAssets().open(name);
                WebResourceResponse r = new WebResourceResponse(mimeFuer(name), "UTF-8", in);
                Map<String, String> h = new HashMap<String, String>();
                h.put("Cache-Control", "no-cache");
                r.setResponseHeaders(h);
                return r;
            } catch (Exception ignored) {
                // nicht vorhanden → 404
            }
        }
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<String, String>(),
                new ByteArrayInputStream(new byte[0]));
    }

    static String mimeFuer(String name) {
        String n = name == null ? "" : name.toLowerCase();
        if (n.endsWith(".html")) return "text/html";
        if (n.endsWith(".js")) return "application/javascript";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".xml")) return "application/xml";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    // ------------------------------------------------------------------
    // Belege auswählen oder fotografieren
    // ------------------------------------------------------------------

    private boolean dateiAuswahl(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        if (dateiCallback != null) {
            dateiCallback.onReceiveValue(null);
        }
        dateiCallback = callback;

        List<String> mimes = new ArrayList<String>();
        if (params.getAcceptTypes() != null) {
            for (String a : params.getAcceptTypes()) {
                for (String t : a.split(",")) {
                    t = t.trim().toLowerCase();
                    if (t.isEmpty()) continue;
                    if (t.startsWith(".")) t = mimeFuer("x" + t);
                    if (!mimes.contains(t)) mimes.add(t);
                }
            }
        }
        boolean bilderErlaubt = mimes.isEmpty();
        for (String m : mimes) {
            if (m.startsWith("image/")) bilderErlaubt = true;
        }

        Intent kamera = bilderErlaubt ? kameraIntent() : null;
        if (params.isCaptureEnabled() && kamera != null) {
            try {
                startActivityForResult(kamera, REQ_DATEI);
                return true;
            } catch (Exception e) {
                // keine Kamera-App → normale Auswahl
            }
        }

        Intent auswahl = new Intent(Intent.ACTION_GET_CONTENT);
        auswahl.addCategory(Intent.CATEGORY_OPENABLE);
        if (mimes.size() == 1) {
            auswahl.setType(mimes.get(0));
        } else {
            auswahl.setType("*/*");
            if (!mimes.isEmpty()) {
                auswahl.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toArray(new String[0]));
            }
        }
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            auswahl.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        Intent chooser = Intent.createChooser(auswahl, "Datei auswählen");
        if (kamera != null) {
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { kamera });
        }
        try {
            startActivityForResult(chooser, REQ_DATEI);
            return true;
        } catch (Exception e) {
            dateiCallback = null;
            return false;
        }
    }

    private Intent kameraIntent() {
        String name = "Beleg_" + System.currentTimeMillis() + ".jpg";
        kameraDatei = DateiProvider.dateiFuer(getCacheDir(), "kamera", name);
        kameraUri = DateiProvider.uriFuer("kamera", name);
        Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        i.putExtra(MediaStore.EXTRA_OUTPUT, kameraUri);
        i.setClipData(ClipData.newRawUri("Beleg", kameraUri));
        i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return i;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_DATEI) {
            Uri[] ergebnis = null;
            if (resultCode == RESULT_OK) {
                if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0
                        && data.getClipData().getItemAt(0).getUri() != null
                        && !data.getClipData().getItemAt(0).getUri().equals(kameraUri)) {
                    ClipData clip = data.getClipData();
                    ergebnis = new Uri[clip.getItemCount()];
                    for (int i = 0; i < clip.getItemCount(); i++) {
                        ergebnis[i] = clip.getItemAt(i).getUri();
                    }
                } else if (data != null && data.getData() != null && !data.getData().equals(kameraUri)) {
                    ergebnis = new Uri[] { data.getData() };
                } else if (kameraDatei != null && kameraDatei.exists() && kameraDatei.length() > 0) {
                    ergebnis = new Uri[] { kameraUri };
                }
            }
            if (dateiCallback != null) {
                dateiCallback.onReceiveValue(ergebnis);
                dateiCallback = null;
            }
        } else if (requestCode == REQ_SPEICHERN) {
            byte[] bytes = zuSpeichern;
            zuSpeichern = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                try {
                    OutputStream out = getContentResolver().openOutputStream(data.getData());
                    if (out == null) throw new IllegalStateException("Kein Zugriff");
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
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    // ------------------------------------------------------------------
    // Dateien speichern, öffnen, teilen
    // ------------------------------------------------------------------

    private static String sichererName(String name) {
        String n = name == null || name.trim().isEmpty() ? "Datei" : name.trim();
        return n.replaceAll("[\\\\/:*?\"<>|\\x00-\\x1F]", "_");
    }

    private File schreibe(String ordner, String name, byte[] bytes) throws Exception {
        File dir = new File(getCacheDir(), ordner);
        File[] alt = dir.listFiles();
        long grenze = System.currentTimeMillis() - 24L * 3600 * 1000;
        if (alt != null) {
            for (File f : alt) {
                if (f.lastModified() < grenze) f.delete();
            }
        }
        File f = DateiProvider.dateiFuer(getCacheDir(), ordner, name);
        FileOutputStream out = new FileOutputStream(f);
        try {
            out.write(bytes);
        } finally {
            out.close();
        }
        return f;
    }

    /** Wird in der Oberfläche als window.ReisekostenAndroid angeboten. */
    public final class Bruecke {

        @JavascriptInterface
        public String appVersion() {
            return "1.0";
        }

        @JavascriptInterface
        public void saveFile(final String name, final String mime, String base64) {
            final byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    zuSpeichern = bytes;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                    i.putExtra(Intent.EXTRA_TITLE, sichererName(name));
                    try {
                        startActivityForResult(i, REQ_SPEICHERN);
                    } catch (Exception e) {
                        zuSpeichern = null;
                        Toast.makeText(MainActivity.this, "Speichern ist auf diesem Gerät nicht möglich", Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void openFile(final String name, final String mime, String base64) {
            final byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String n = sichererName(name);
                        schreibe("oeffnen", n, bytes);
                        Uri uri = DateiProvider.uriFuer("oeffnen", n);
                        Intent i = new Intent(Intent.ACTION_VIEW);
                        i.setDataAndType(uri, mime == null || mime.isEmpty() ? mimeFuer(n) : mime);
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(i);
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Keine App zum Öffnen gefunden – bitte speichern", Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public boolean shareFiles(String json) {
            try {
                JSONObject msg = new JSONObject(json);
                JSONArray files = msg.getJSONArray("files");
                final ArrayList<Uri> uris = new ArrayList<Uri>();
                String typ = null;
                for (int k = 0; k < files.length(); k++) {
                    JSONObject f = files.getJSONObject(k);
                    String n = sichererName(f.optString("name"));
                    schreibe("teilen", n, Base64.decode(f.optString("base64"), Base64.DEFAULT));
                    uris.add(DateiProvider.uriFuer("teilen", n));
                    String m = f.optString("mime", "application/octet-stream");
                    typ = typ == null || typ.equals(m) ? m : "*/*";
                }
                if (uris.isEmpty()) return false;
                final Intent send = new Intent(uris.size() == 1 ? Intent.ACTION_SEND : Intent.ACTION_SEND_MULTIPLE);
                send.setType(typ);
                if (uris.size() == 1) {
                    send.putExtra(Intent.EXTRA_STREAM, uris.get(0));
                } else {
                    send.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
                }
                ClipData clip = ClipData.newRawUri("Abrechnung", uris.get(0));
                for (int k = 1; k < uris.size(); k++) clip.addItem(new ClipData.Item(uris.get(k)));
                send.setClipData(clip);
                String email = msg.optString("email", "");
                if (!email.isEmpty()) send.putExtra(Intent.EXTRA_EMAIL, new String[] { email });
                send.putExtra(Intent.EXTRA_SUBJECT, msg.optString("subject", "Reisekostenabrechnung"));
                send.putExtra(Intent.EXTRA_TEXT, msg.optString("text", ""));
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            startActivity(Intent.createChooser(send, "Abrechnung senden mit"));
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "Keine E-Mail-App gefunden", Toast.LENGTH_LONG).show();
                        }
                    }
                });
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }
}
