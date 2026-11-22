package de.bonarchiv.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * Bonarchiv für Android.
 *
 * Die Oberfläche (assets/www) läuft offline in einer WebView unter einer festen, sicheren
 * Adresse (https://appassets.androidplatform.net). Diese Klasse liefert, was nur die App kann:
 * Speicher, Kamera-Scanner, Downloads ohne Browser-Beschränkungen, Teilen, Export.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final String STATE_FILE = "bonarchiv.json";

    private static final int REQ_SCAN = 1;
    private static final int REQ_BROWSER = 2;
    private static final int REQ_PICK = 3;
    private static final int REQ_SAVE = 4;
    private static final int REQ_BACKUP = 5;

    private WebView web;
    private FileStore store;
    private final Handler main = new Handler(Looper.getMainLooper());

    private volatile boolean jsReady;
    private final List<JSONObject> pendingIncoming = new ArrayList<>();
    private final Map<Integer, String> waitingIds = new HashMap<>();
    private File pendingSaveFile;
    private boolean firstResume = true;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        store = new FileStore(this);

        web = new WebView(this);
        web.setBackgroundColor(isDarkMode() ? Color.rgb(13, 20, 18) : Color.rgb(243, 245, 244));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "BonAndroid");
        web.setWebViewClient(new LocalClient());
        setContentView(web);

        if (savedInstanceState == null) {
            handleIntent(getIntent());
        }
        web.loadUrl(START_URL);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!firstResume) {
            js("window.BonApp&&BonApp.resume()");
        }
        firstResume = false;
    }

    @Override
    protected void onPause() {
        js("window.BonApp&&BonApp.flush()");
        super.onPause();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        js("window.BonApp&&BonApp.setSystemDark(" + isDarkMode() + ")");
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.BonApp?BonApp.back():false", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"true".equals(value)) {
                    MainActivity.super.onBackPressed();
                }
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
        }
        super.onDestroy();
    }

    private boolean isDarkMode() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    // ------------------------------------------------------------------ JS-Aufrufe

    private void js(final String code) {
        main.post(new Runnable() {
            @Override
            public void run() {
                if (web != null) {
                    web.evaluateJavascript(code, null);
                }
            }
        });
    }

    private void resolve(String id, JSONObject result) {
        if (id == null) {
            return;
        }
        js("window.BonApp&&BonApp.resolve(" + JSONObject.quote(id) + "," + JSONObject.quote(result.toString()) + ")");
    }

    private static JSONObject ok() {
        JSONObject o = new JSONObject();
        try {
            o.put("ok", true);
        } catch (JSONException ignored) {
            // kann nicht passieren
        }
        return o;
    }

    private static JSONObject cancelled() {
        JSONObject o = new JSONObject();
        try {
            o.put("ok", false);
            o.put("cancelled", true);
        } catch (JSONException ignored) {
            // kann nicht passieren
        }
        return o;
    }

    private static JSONObject fail(String message) {
        return Downloader.error("error", message);
    }

    private static JSONObject put(JSONObject o, String key, Object value) {
        try {
            o.put(key, value);
        } catch (JSONException ignored) {
            // kann nicht passieren
        }
        return o;
    }

    /** Wartende Anfrage für eine Activity merken; eine ältere gleichen Typs gilt als abgebrochen. */
    private void await(int request, String id) {
        String old = waitingIds.put(request, id);
        if (old != null) {
            resolve(old, cancelled());
        }
    }

    // ------------------------------------------------------------------ Eingehende Dateien

    private void handleIntent(Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }
        final String action = intent.getAction();
        final List<Uri> uris = new ArrayList<>();
        String text = null;
        try {
        if (Intent.ACTION_SEND.equals(action)) {
            Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (u != null) {
                uris.add(u);
            } else {
                CharSequence t = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
                text = t == null ? null : t.toString();
            }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) {
                uris.addAll(list);
            }
        } else if (Intent.ACTION_VIEW.equals(action) && intent.getData() != null) {
            uris.add(intent.getData());
        } else {
            return;
        }
        } catch (RuntimeException e) {
            // fehlerhafte Angaben der sendenden App
            Toast.makeText(this, "Die geteilten Daten konnten nicht gelesen werden.", Toast.LENGTH_LONG).show();
            return;
        }
        intent.setAction(null); // nicht erneut verarbeiten
        if (text != null) {
            deliverIncoming(put(new JSONObject(), "text", text));
            return;
        }
        if (uris.isEmpty()) {
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                for (Uri u : uris) {
                    JSONObject info = importUri(u);
                    if (info != null) {
                        deliverIncoming(info);
                    }
                }
            }
        }).start();
    }

    private void deliverIncoming(JSONObject item) {
        synchronized (pendingIncoming) {
            if (!jsReady) {
                pendingIncoming.add(item);
                return;
            }
        }
        JSONArray arr = new JSONArray();
        arr.put(item);
        js("window.BonApp&&BonApp.incoming(" + JSONObject.quote(arr.toString()) + ")");
    }

    /** Inhalt einer fremden Datei (content://, file://) ins Archiv kopieren. */
    private JSONObject importUri(Uri uri) {
        ContentResolver cr = getContentResolver();
        String name = null;
        String type = null;
        try {
            if ("file".equals(uri.getScheme())) {
                // Dateien aus dem eigenen Speicher sind tabu
                String path = uri.getPath();
                if (path == null || path.startsWith(getApplicationInfo().dataDir)) {
                    return null;
                }
                name = uri.getLastPathSegment();
            } else {
                type = cr.getType(uri);
                Cursor c = cr.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
                if (c != null) {
                    try {
                        if (c.moveToFirst()) {
                            name = c.getString(0);
                        }
                    } finally {
                        c.close();
                    }
                }
            }
        } catch (Exception ignored) {
            // Name und Typ sind optional
        }
        try {
            InputStream in = cr.openInputStream(uri);
            if (in == null) {
                return null;
            }
            try {
                return store.save(in, type, name != null ? name : uri.getLastPathSegment());
            } finally {
                in.close();
            }
        } catch (final Exception e) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, "Datei konnte nicht gelesen werden: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
            return null;
        }
    }

    // ------------------------------------------------------------------ Activity-Ergebnisse

    @Override
    protected void onActivityResult(int requestCode, int resultCode, final Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        final String id = waitingIds.remove(requestCode);
        switch (requestCode) {
            case REQ_SCAN: {
                String text = data == null ? null : data.getStringExtra(ScannerActivity.EXTRA_TEXT);
                resolve(id, resultCode == RESULT_OK && text != null ? put(ok(), "text", text) : cancelled());
                break;
            }
            case REQ_BROWSER: {
                String json = data == null ? null : data.getStringExtra(BrowserActivity.EXTRA_RESULT);
                JSONObject r = cancelled();
                if (json != null) {
                    try {
                        r = new JSONObject(json);
                    } catch (JSONException ignored) {
                        // abgebrochen
                    }
                }
                resolve(id, r);
                break;
            }
            case REQ_PICK: {
                if (resultCode != RESULT_OK || data == null) {
                    resolve(id, put(ok(), "files", new JSONArray()));
                    break;
                }
                final List<Uri> uris = new ArrayList<>();
                ClipData clip = data.getClipData();
                if (clip != null) {
                    for (int i = 0; i < clip.getItemCount(); i++) {
                        if (clip.getItemAt(i).getUri() != null) {
                            uris.add(clip.getItemAt(i).getUri());
                        }
                    }
                } else if (data.getData() != null) {
                    uris.add(data.getData());
                }
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        JSONArray files = new JSONArray();
                        for (Uri u : uris) {
                            JSONObject info = importUri(u);
                            if (info != null) {
                                files.put(info);
                            }
                        }
                        resolve(id, put(ok(), "files", files));
                    }
                }).start();
                break;
            }
            case REQ_SAVE: {
                final File src = pendingSaveFile;
                pendingSaveFile = null;
                if (resultCode != RESULT_OK || data == null || data.getData() == null || src == null) {
                    resolve(id, cancelled());
                    break;
                }
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            OutputStream out = getContentResolver().openOutputStream(data.getData(), "w");
                            if (out == null) {
                                throw new IOException("Ziel nicht beschreibbar");
                            }
                            try {
                                copy(new FileInputStream(src), out);
                            } finally {
                                out.close();
                            }
                            resolve(id, put(ok(), "saved", true));
                        } catch (Exception e) {
                            resolve(id, fail("Die Datei konnte nicht gespeichert werden: " + e.getMessage()));
                        }
                    }
                }).start();
                break;
            }
            case REQ_BACKUP: {
                if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                    resolve(id, cancelled());
                    break;
                }
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        resolve(id, restoreBackup(data.getData()));
                    }
                }).start();
                break;
            }
            default:
                break;
        }
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        try {
            byte[] buf = new byte[32 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
            }
        } finally {
            in.close();
        }
    }

    // ------------------------------------------------------------------ Export & Sicherung

    private static String safeFileName(String name, String fallback) {
        String n = name == null ? "" : name.replaceAll("[^A-Za-z0-9_.-]+", "_");
        if (n.isEmpty() || n.startsWith(".")) {
            n = fallback;
        }
        return n.length() > 100 ? n.substring(0, 100) : n;
    }

    private static String safeZipPath(String path) {
        if (path == null) {
            return null;
        }
        String p = path.replace('\\', '/').replaceAll("^/+", "");
        StringBuilder sb = new StringBuilder();
        for (String part : p.split("/")) {
            if (part.isEmpty() || part.equals(".") || part.equals("..")) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append('/');
            }
            sb.append(part.replaceAll("[\\p{Cntrl}:*?\"<>|]+", "_"));
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    private File buildZip(JSONObject spec) throws IOException, JSONException {
        File dir = DocProvider.exportDir(this);
        File[] old = dir.listFiles();
        if (old != null) {
            for (File f : old) {
                f.delete();
            }
        }
        File zip = new File(dir, safeFileName(spec.optString("fileName"), "Belege.zip"));
        JSONArray entries = spec.getJSONArray("entries");
        Set<String> used = new HashSet<>();
        ZipOutputStream out = new ZipOutputStream(new FileOutputStream(zip));
        try {
            for (int i = 0; i < entries.length(); i++) {
                JSONObject e = entries.getJSONObject(i);
                String path = safeZipPath(e.optString("path"));
                if (path == null || !used.add(path)) {
                    continue;
                }
                if (e.has("file")) {
                    File f = store.get(e.getString("file"));
                    if (f == null || !f.exists()) {
                        continue;
                    }
                    out.putNextEntry(new ZipEntry(path));
                    FileInputStream in = new FileInputStream(f);
                    try {
                        byte[] buf = new byte[32 * 1024];
                        int n;
                        while ((n = in.read(buf)) > 0) {
                            out.write(buf, 0, n);
                        }
                    } finally {
                        in.close();
                    }
                    out.closeEntry();
                } else if (e.has("text")) {
                    out.putNextEntry(new ZipEntry(path));
                    out.write(e.getString("text").getBytes(StandardCharsets.UTF_8));
                    out.closeEntry();
                }
            }
        } finally {
            out.close();
        }
        return zip;
    }

    /** Fertige Datei speichern (Android-Dialog) oder teilen. */
    private void deliverExport(final String id, final File file, final String mime, String mode) {
        if ("share".equals(mode)) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent send = new Intent(Intent.ACTION_SEND);
                        send.setType(mime);
                        Uri uri = DocProvider.exportUri(file.getName());
                        send.putExtra(Intent.EXTRA_STREAM, uri);
                        send.putExtra(Intent.EXTRA_SUBJECT, file.getName());
                        send.setClipData(ClipData.newRawUri(file.getName(), uri));
                        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(send, "Export teilen"));
                        resolve(id, put(ok(), "shared", true));
                    } catch (Exception e) {
                        resolve(id, fail("Teilen ist nicht möglich."));
                    }
                }
            });
            return;
        }
        main.post(new Runnable() {
            @Override
            public void run() {
                pendingSaveFile = file;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(mime);
                i.putExtra(Intent.EXTRA_TITLE, file.getName());
                try {
                    await(REQ_SAVE, id);
                    startActivityForResult(i, REQ_SAVE);
                } catch (ActivityNotFoundException e) {
                    waitingIds.remove(REQ_SAVE);
                    deliverExport(id, file, mime, "share");
                }
            }
        });
    }

    private JSONObject restoreBackup(Uri uri) {
        String index = null;
        int restored = 0;
        try {
            InputStream raw = getContentResolver().openInputStream(uri);
            if (raw == null) {
                return fail("Die Datei kann nicht geöffnet werden.");
            }
            ZipInputStream zin = new ZipInputStream(raw);
            try {
                ZipEntry e;
                byte[] buf = new byte[32 * 1024];
                while ((e = zin.getNextEntry()) != null) {
                    String name = e.getName();
                    if (e.isDirectory()) {
                        continue;
                    }
                    if ("bonarchiv.json".equals(name)) {
                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        int n;
                        long total = 0;
                        while ((n = zin.read(buf)) > 0) {
                            total += n;
                            if (total > 100L * 1024 * 1024) {
                                return fail("Die Sicherung ist zu groß.");
                            }
                            bos.write(buf, 0, n);
                        }
                        index = new String(bos.toByteArray(), StandardCharsets.UTF_8);
                    } else if (name.startsWith("docs/")) {
                        String file = name.substring(5);
                        File target = store.get(file);
                        if (target == null || target.exists()) {
                            continue;
                        }
                        File tmp = new File(store.dir, "tmp_restore_" + System.nanoTime());
                        FileOutputStream out = new FileOutputStream(tmp);
                        try {
                            int n;
                            long total = 0;
                            while ((n = zin.read(buf)) > 0) {
                                total += n;
                                if (total > FileStore.MAX_BYTES) {
                                    throw new IOException("Datei zu groß");
                                }
                                out.write(buf, 0, n);
                            }
                        } finally {
                            out.close();
                        }
                        if (tmp.renameTo(target)) {
                            restored++;
                        } else {
                            tmp.delete();
                        }
                    }
                }
            } finally {
                zin.close();
            }
        } catch (Exception e) {
            return fail("Die Sicherung konnte nicht gelesen werden: " + e.getMessage());
        }
        if (index == null) {
            return fail("Das ist keine Bonarchiv-Sicherung (bonarchiv.json fehlt).");
        }
        JSONObject r = ok();
        put(r, "index", index);
        put(r, "files", restored);
        return r;
    }

    // ------------------------------------------------------------------ Lokaler Server für die Oberfläche

    private final class LocalClient extends WebViewClient {

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (!HOST.equals(url.getHost())) {
                return null;
            }
            String path = url.getPath() == null ? "/" : url.getPath();
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-store");
            try {
                if (path.startsWith("/docs/")) {
                    File f = store.get(path.substring(6));
                    if (f == null || !f.exists()) {
                        return notFound();
                    }
                    return new WebResourceResponse(FileStore.mimeForName(f.getName()), null, 200, "OK", headers, new FileInputStream(f));
                }
                String asset = path.equals("/") ? "index.html" : path.substring(1);
                if (asset.contains("..")) {
                    return notFound();
                }
                InputStream in = getAssets().open("www/" + asset);
                String mime = FileStore.mimeForName(asset);
                String encoding = mime.startsWith("text/") || mime.contains("javascript") ? "utf-8" : null;
                return new WebResourceResponse(mime, encoding, 200, "OK", headers, in);
            } catch (IOException e) {
                return notFound();
            }
        }

        private WebResourceResponse notFound() {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(),
                    new ByteArrayInputStream(new byte[0]));
        }

        // Ab Android 7 (API 24) ruft das System diese Variante auf
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return !HOST.equals(request.getUrl().getHost());
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return !HOST.equals(Uri.parse(url).getHost());
        }
    }

    // ------------------------------------------------------------------ Brücke zur Oberfläche

    private final class Bridge {

        @JavascriptInterface
        public String ready() {
            JSONArray arr = new JSONArray();
            synchronized (pendingIncoming) {
                for (JSONObject o : pendingIncoming) {
                    arr.put(o);
                }
                pendingIncoming.clear();
                jsReady = true;
            }
            return arr.toString();
        }

        @JavascriptInterface
        public String loadState() {
            File f = new File(getFilesDir(), STATE_FILE);
            if (!f.exists()) {
                File backup = new File(getFilesDir(), STATE_FILE + ".bak");
                if (!backup.exists()) {
                    return "";
                }
                f = backup;
            }
            try {
                FileInputStream in = new FileInputStream(f);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                copy(in, out);
                return new String(out.toByteArray(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean saveState(String json) {
            if (json == null) {
                return false;
            }
            synchronized (MainActivity.this) {
                File dir = getFilesDir();
                File tmp = new File(dir, STATE_FILE + ".tmp");
                File target = new File(dir, STATE_FILE);
                File backup = new File(dir, STATE_FILE + ".bak");
                try {
                    FileOutputStream out = new FileOutputStream(tmp);
                    try {
                        out.write(json.getBytes(StandardCharsets.UTF_8));
                        out.getFD().sync();
                    } finally {
                        out.close();
                    }
                    if (target.exists()) {
                        backup.delete();
                        target.renameTo(backup);
                    }
                    return tmp.renameTo(target);
                } catch (IOException e) {
                    tmp.delete();
                    return false;
                }
            }
        }

        @JavascriptInterface
        public String fileUrl(String name) {
            return "/docs/" + Uri.encode(name == null ? "" : name);
        }

        @JavascriptInterface
        public String writeText(String text, String ext) {
            if (text == null) {
                return "";
            }
            String e = ext == null || !ext.matches("[a-z]{2,4}") ? "txt" : ext;
            String mime = e.equals("json") ? "application/json" : e.equals("xml") ? "application/xml" : "text/plain";
            try {
                return store.saveBytes(text.getBytes(StandardCharsets.UTF_8), mime, "qr-inhalt." + e).toString();
            } catch (IOException ex) {
                return "";
            }
        }

        @JavascriptInterface
        public void deleteFile(String name) {
            File f = store.get(name);
            if (f != null) {
                f.delete();
            }
        }

        /** Dateien entfernen, die zu keinem Beleg gehören (nur ältere als 1 Tag). */
        @JavascriptInterface
        public void cleanup(String keepJson) {
            final Set<String> keep = new HashSet<>();
            try {
                JSONArray arr = new JSONArray(keepJson);
                for (int i = 0; i < arr.length(); i++) {
                    keep.add(arr.getString(i));
                }
            } catch (JSONException e) {
                return;
            }
            new Thread(new Runnable() {
                @Override
                public void run() {
                    File[] files = store.dir.listFiles();
                    if (files == null) {
                        return;
                    }
                    long limit = System.currentTimeMillis() - 24L * 3600 * 1000;
                    for (File f : files) {
                        if (!keep.contains(f.getName()) && f.lastModified() < limit) {
                            f.delete();
                        }
                    }
                }
            }).start();
        }

        @JavascriptInterface
        public void scan(final String id) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    await(REQ_SCAN, id);
                    startActivityForResult(new Intent(MainActivity.this, ScannerActivity.class), REQ_SCAN);
                }
            });
        }

        @JavascriptInterface
        public void download(final String id, final String url) {
            final String ua = WebSettings.getDefaultUserAgent(MainActivity.this);
            new Thread(new Runnable() {
                @Override
                public void run() {
                    resolve(id, Downloader.download(MainActivity.this, store, url, ua, null, null));
                }
            }).start();
        }

        @JavascriptInterface
        public void openBrowser(final String id, final String url) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    await(REQ_BROWSER, id);
                    startActivityForResult(new Intent(MainActivity.this, BrowserActivity.class).putExtra(BrowserActivity.EXTRA_URL, url), REQ_BROWSER);
                }
            });
        }

        @JavascriptInterface
        public void pickFiles(final String id, final String mime) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    boolean images = mime != null && mime.startsWith("image/");
                    i.setType(images ? "image/*" : "*/*");
                    if (!images) {
                        i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/pdf", "image/*", "application/json",
                                "application/xml", "text/xml", "text/plain", "text/html", "application/octet-stream"});
                    }
                    i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, !images);
                    try {
                        await(REQ_PICK, id);
                        startActivityForResult(i, REQ_PICK);
                    } catch (ActivityNotFoundException e) {
                        waitingIds.remove(REQ_PICK);
                        resolve(id, fail("Keine Datei-App gefunden."));
                    }
                }
            });
        }

        @JavascriptInterface
        public void decodeQr(final String id, final String name) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    String text = null;
                    try {
                        text = QrDecoder.decodeFile(store.get(name));
                    } catch (Throwable ignored) {
                        // nicht lesbar
                    }
                    resolve(id, text != null ? put(ok(), "text", text) : put(new JSONObject(), "ok", false));
                }
            }).start();
        }

        @JavascriptInterface
        public void decodeQrImage(final String id, final String dataUrl) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    String text = null;
                    try {
                        int comma = dataUrl.indexOf(',');
                        byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
                        text = QrDecoder.decodeBytes(bytes);
                    } catch (Throwable ignored) {
                        // nicht lesbar
                    }
                    resolve(id, text != null ? put(ok(), "text", text) : put(new JSONObject(), "ok", false));
                }
            }).start();
        }

        @JavascriptInterface
        public void shareFile(final String name, final String displayName, final String mime) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    File f = store.get(name);
                    if (f == null || !f.exists()) {
                        Toast.makeText(MainActivity.this, "Datei nicht gefunden.", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    Uri uri = DocProvider.docUri(name, displayName);
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType(mime == null || mime.isEmpty() ? FileStore.mimeForName(name) : mime);
                    send.putExtra(Intent.EXTRA_STREAM, uri);
                    send.putExtra(Intent.EXTRA_SUBJECT, displayName);
                    send.setClipData(ClipData.newRawUri(displayName, uri));
                    send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(send, "Beleg teilen"));
                }
            });
        }

        @JavascriptInterface
        public void openFile(final String name, final String displayName, final String mime) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    File f = store.get(name);
                    if (f == null || !f.exists()) {
                        Toast.makeText(MainActivity.this, "Datei nicht gefunden.", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    Intent view = new Intent(Intent.ACTION_VIEW);
                    view.setDataAndType(DocProvider.docUri(name, displayName), mime == null || mime.isEmpty() ? FileStore.mimeForName(name) : mime);
                    view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    try {
                        startActivity(Intent.createChooser(view, "Beleg öffnen mit"));
                    } catch (ActivityNotFoundException e) {
                        Toast.makeText(MainActivity.this, "Keine App zum Öffnen gefunden.", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
                return;
            }
            main.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (ActivityNotFoundException e) {
                        Toast.makeText(MainActivity.this, "Kein Browser gefunden.", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void exportZip(final String id, final String specJson) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        JSONObject spec = new JSONObject(specJson);
                        File zip = buildZip(spec);
                        deliverExport(id, zip, "application/zip", spec.optString("mode", "save"));
                    } catch (Exception e) {
                        resolve(id, fail("Die ZIP-Datei konnte nicht erstellt werden: " + e.getMessage()));
                    }
                }
            }).start();
        }

        @JavascriptInterface
        public void exportText(final String id, final String specJson) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        JSONObject spec = new JSONObject(specJson);
                        File dir = DocProvider.exportDir(MainActivity.this);
                        File f = new File(dir, safeFileName(spec.optString("fileName"), "export.txt"));
                        FileOutputStream out = new FileOutputStream(f);
                        try {
                            out.write(spec.optString("text").getBytes(StandardCharsets.UTF_8));
                        } finally {
                            out.close();
                        }
                        deliverExport(id, f, spec.optString("mime", "text/plain"), spec.optString("mode", "share"));
                    } catch (Exception e) {
                        resolve(id, fail("Export fehlgeschlagen: " + e.getMessage()));
                    }
                }
            }).start();
        }

        @JavascriptInterface
        public void pickBackup(final String id) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/zip", "application/x-zip-compressed", "application/octet-stream"});
                    try {
                        await(REQ_BACKUP, id);
                        startActivityForResult(i, REQ_BACKUP);
                    } catch (ActivityNotFoundException e) {
                        waitingIds.remove(REQ_BACKUP);
                        resolve(id, fail("Keine Datei-App gefunden."));
                    }
                }
            });
        }

        @JavascriptInterface
        public boolean isDarkMode() {
            return MainActivity.this.isDarkMode();
        }

        @JavascriptInterface
        public void setBars(final String statusColor, final String navColor, final boolean lightBars) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        getWindow().setStatusBarColor(Color.parseColor(statusColor.trim()));
                        getWindow().setNavigationBarColor(Color.parseColor(navColor.trim()));
                        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                        int flags = 0;
                        if (lightBars) {
                            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            if (Build.VERSION.SDK_INT >= 26) {
                                flags |= 0x00000010; // SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                            }
                        }
                        getWindow().getDecorView().setSystemUiVisibility(flags);
                        web.setBackgroundColor(Color.parseColor(statusColor.trim()));
                    } catch (Exception ignored) {
                        // ungültige Farbe
                    }
                }
            });
        }

        @JavascriptInterface
        public void haptic() {
            main.post(new Runnable() {
                @Override
                public void run() {
                    web.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY);
                }
            });
        }

        @JavascriptInterface
        public String clipboardText() {
            try {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null && cm.hasPrimaryClip() && cm.getPrimaryClip().getItemCount() > 0) {
                    CharSequence t = cm.getPrimaryClip().getItemAt(0).coerceToText(MainActivity.this);
                    return t == null ? "" : t.toString();
                }
            } catch (Exception ignored) {
                // kein Zugriff
            }
            return "";
        }

        @JavascriptInterface
        public String appVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "1.0";
            }
        }
    }
}
