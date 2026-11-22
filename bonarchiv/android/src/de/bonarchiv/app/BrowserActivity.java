package de.bonarchiv.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.ByteArrayOutputStream;
import java.util.UUID;

/**
 * Eingebauter Browser für Beleg-Webseiten.
 *
 * Viele Kassensysteme zeigen den digitalen Beleg zuerst als Webseite mit einem
 * „PDF herunterladen“-Knopf. Hier wird jeder Download abgefangen und direkt im Archiv
 * abgelegt. Gibt es keinen Download, sichert „Als Beleg speichern“ die ganze Seite als Bild
 * samt Text (für Suche und Erkennung).
 *
 * Läuft in einem eigenen Prozess (":browser"), damit die Ganzseiten-Aufnahme die
 * WebView der Haupt-App nicht beeinflusst.
 */
public class BrowserActivity extends Activity {

    static final String EXTRA_URL = "url";
    static final String EXTRA_RESULT = "result";

    private static boolean webViewPrepared;

    private WebView web;
    private TextView titleView;
    private TextView hostView;
    private ProgressBar progress;
    private View busyView;
    private TextView busyText;
    private FileStore store;
    private String blobToken;
    private boolean done;
    private final Handler main = new Handler(Looper.getMainLooper());

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private boolean dark() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    private static void prepareWebView() {
        if (webViewPrepared) {
            return;
        }
        webViewPrepared = true;
        if (Build.VERSION.SDK_INT >= 28) {
            try {
                WebView.class.getMethod("setDataDirectorySuffix", String.class).invoke(null, "browser");
            } catch (Exception ignored) {
                // bereits gesetzt
            }
        }
        // Ganze Seite zeichnen können (für „Als Beleg speichern“)
        WebView.enableSlowWholeDocumentDraw();
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        prepareWebView();
        super.onCreate(savedInstanceState);
        store = new FileStore(this);
        boolean dark = dark();
        int bg = dark ? 0xFF151E1B : 0xFFFFFFFF;
        int fg = dark ? 0xFFE4ECE9 : 0xFF13201B;
        int muted = dark ? 0xFF9AAAA4 : 0xFF5A6964;
        int accent = dark ? 0xFF3CC2A0 : 0xFF0D7A64;
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        if (!dark) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(bg);

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(4), dp(4), dp(10), dp(4));
        IconView close = new IconView(this, IconView.CLOSE, fg, 0);
        close.setContentDescription("Schließen");
        close.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                cancel();
            }
        });
        bar.addView(close, new LinearLayout.LayoutParams(dp(48), dp(48)));
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(dp(4), 0, dp(8), 0);
        titleView = new TextView(this);
        titleView.setTextColor(fg);
        titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setSingleLine(true);
        titleView.setEllipsize(TextUtils.TruncateAt.END);
        titleView.setText("Digitaler Beleg");
        hostView = new TextView(this);
        hostView.setTextColor(muted);
        hostView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        hostView.setSingleLine(true);
        hostView.setEllipsize(TextUtils.TruncateAt.MIDDLE);
        titles.addView(titleView);
        titles.addView(hostView);
        bar.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        TextView save = new TextView(this);
        save.setText("Als Beleg speichern");
        save.setTextColor(dark ? 0xFF052019 : Color.WHITE);
        save.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        save.setTypeface(Typeface.DEFAULT_BOLD);
        save.setPadding(dp(14), dp(9), dp(14), dp(9));
        GradientDrawable pill = new GradientDrawable();
        pill.setColor(accent);
        pill.setCornerRadius(dp(12));
        save.setBackground(pill);
        save.setClickable(true);
        save.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                snapshot();
            }
        });
        bar.addView(save);
        rootLayout.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(60)));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        rootLayout.addView(progress, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));

        TextView hint = new TextView(this);
        hint.setText("Tippe auf den PDF-Download des Belegs – er wird automatisch übernommen. Ohne Download: „Als Beleg speichern“.");
        hint.setTextColor(muted);
        hint.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        hint.setPadding(dp(16), dp(8), dp(16), dp(8));
        hint.setBackgroundColor(dark ? 0xFF1C2723 : 0xFFEDF1EF);
        rootLayout.addView(hint);

        FrameLayout content = new FrameLayout(this);
        web = new WebView(this);
        content.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        busyView = buildBusy(bg, fg);
        busyView.setVisibility(View.GONE);
        content.addView(busyView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        rootLayout.addView(content, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(rootLayout);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setSupportMultipleWindows(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.addJavascriptInterface(new BlobBridge(), "BonarchivBlob");

        web.setWebViewClient(new WebViewClient() {
            // Ab Android 7 (API 24) ruft das System diese Variante auf
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl().toString());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(url);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                setHost(url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                setHost(url);
                String t = view.getTitle();
                if (t != null && !t.isEmpty() && !t.startsWith("http")) {
                    titleView.setText(t);
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress >= 100 ? View.INVISIBLE : View.VISIBLE);
            }

            @Override
            public void onReceivedTitle(WebView view, String title) {
                if (title != null && !title.isEmpty() && !title.startsWith("http")) {
                    titleView.setText(title);
                }
            }
        });
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                handleDownload(url, userAgent, contentDisposition, mimetype);
            }
        });

        String url = getIntent().getStringExtra(EXTRA_URL);
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
            cancel();
            return;
        }
        setHost(url);
        web.loadUrl(url);
    }

    private View buildBusy(int bg, int fg) {
        LinearLayout v = new LinearLayout(this);
        v.setOrientation(LinearLayout.VERTICAL);
        v.setGravity(Gravity.CENTER);
        v.setBackgroundColor((bg & 0x00FFFFFF) | 0xE6000000);
        v.setClickable(true);
        ProgressBar spinner = new ProgressBar(this);
        v.addView(spinner);
        busyText = new TextView(this);
        busyText.setTextColor(fg);
        busyText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        busyText.setPadding(0, dp(16), 0, 0);
        v.addView(busyText);
        return v;
    }

    private void showBusy(String text) {
        busyText.setText(text);
        busyView.setVisibility(View.VISIBLE);
    }

    private void hideBusy() {
        busyView.setVisibility(View.GONE);
    }

    private void setHost(String url) {
        try {
            hostView.setText(Uri.parse(url).getHost());
        } catch (Exception ignored) {
            hostView.setText("");
        }
    }

    private boolean handleNavigation(String url) {
        if (url == null) {
            return true;
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return false;
        }
        if (url.startsWith("intent:")) {
            // Fallback-Adresse nutzen, statt fremde Apps zu starten
            try {
                Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                String fallback = intent.getStringExtra("browser_fallback_url");
                if (fallback != null && fallback.startsWith("http")) {
                    web.loadUrl(fallback);
                }
            } catch (Exception ignored) {
                // ignorieren
            }
            return true;
        }
        if (url.startsWith("blob:") || url.startsWith("data:")) {
            handleDownload(url, null, null, null);
            return true;
        }
        return true;
    }

    @Override
    public void onBackPressed() {
        if (busyView.getVisibility() == View.VISIBLE) {
            return;
        }
        if (web.canGoBack()) {
            web.goBack();
        } else {
            cancel();
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.stopLoading();
            web.destroy();
        }
        super.onDestroy();
    }

    // ------------------------------------------------------------------ Ergebnis

    private void cancel() {
        if (done) {
            return;
        }
        done = true;
        try {
            JSONObject o = new JSONObject();
            o.put("ok", false);
            o.put("cancelled", true);
            setResult(RESULT_CANCELED, new Intent().putExtra(EXTRA_RESULT, o.toString()));
        } catch (Exception e) {
            setResult(RESULT_CANCELED);
        }
        finish();
    }

    private void finishWith(JSONObject result) {
        if (done) {
            return;
        }
        done = true;
        setResult(RESULT_OK, new Intent().putExtra(EXTRA_RESULT, result.toString()));
        finish();
    }

    private void finishWithFile(JSONObject file) {
        try {
            JSONObject o = new JSONObject();
            o.put("ok", true);
            o.put("kind", "file");
            o.put("file", file);
            o.put("url", web.getUrl());
            finishWith(o);
        } catch (Exception e) {
            fail("Der Beleg konnte nicht übernommen werden.");
        }
    }

    private void fail(String message) {
        hideBusy();
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    // ------------------------------------------------------------------ Downloads

    private void handleDownload(final String url, final String userAgent, final String disposition, final String mimetype) {
        if (url == null || done) {
            return;
        }
        if (url.startsWith("data:")) {
            saveDataUrl(url, URLUtil.guessFileName(url, disposition, mimetype));
            return;
        }
        if (url.startsWith("blob:")) {
            // Inhalt im Seitenkontext lesen und an die App reichen
            blobToken = UUID.randomUUID().toString();
            showBusy("Beleg wird übernommen …");
            String js = "(function(){var t=" + JSONObject.quote(blobToken) + ";fetch(" + JSONObject.quote(url) + ").then(function(r){return r.blob();})"
                    + ".then(function(b){var f=new FileReader();f.onloadend=function(){BonarchivBlob.data(t,f.result," + JSONObject.quote(disposition == null ? "" : disposition) + ");};f.readAsDataURL(b);})"
                    + ".catch(function(e){BonarchivBlob.error(t,String(e));});})();";
            web.evaluateJavascript(js, null);
            return;
        }
        final String cookie = CookieManager.getInstance().getCookie(url);
        final String referer = web.getUrl();
        final String ua = userAgent != null ? userAgent : web.getSettings().getUserAgentString();
        showBusy("Beleg wird heruntergeladen …");
        new Thread(new Runnable() {
            @Override
            public void run() {
                final JSONObject res = Downloader.download(BrowserActivity.this, store, url, ua, cookie, referer);
                main.post(new Runnable() {
                    @Override
                    public void run() {
                        if (res.optBoolean("ok") && "file".equals(res.optString("kind"))) {
                            finishWithFile(res.optJSONObject("file"));
                        } else if (res.optBoolean("ok")) {
                            hideBusy();
                            web.loadUrl(res.optString("finalUrl", url));
                        } else {
                            fail(res.optString("error", "Download fehlgeschlagen."));
                        }
                    }
                });
            }
        }).start();
    }

    private void saveDataUrl(String dataUrl, String fileName) {
        try {
            int comma = dataUrl.indexOf(',');
            if (comma < 0) {
                fail("Unbekanntes Dateiformat.");
                return;
            }
            String meta = dataUrl.substring(5, comma);
            String mime = meta.split(";")[0];
            byte[] bytes = meta.contains(";base64")
                    ? Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT)
                    : Uri.decode(dataUrl.substring(comma + 1)).getBytes("UTF-8");
            finishWithFile(store.saveBytes(bytes, mime, fileName));
        } catch (Exception e) {
            fail("Der Beleg konnte nicht gespeichert werden.");
        }
    }

    /** Wird von der Webseite (über das eingeschleuste Skript) aufgerufen – nur mit gültigem Token. */
    private final class BlobBridge {
        @JavascriptInterface
        public void data(final String token, final String dataUrl, final String disposition) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    if (blobToken == null || !blobToken.equals(token) || dataUrl == null) {
                        return;
                    }
                    blobToken = null;
                    String name = URLUtil.guessFileName("beleg", disposition, null);
                    saveDataUrl(dataUrl, name);
                }
            });
        }

        @JavascriptInterface
        public void error(final String token, final String message) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    if (blobToken != null && blobToken.equals(token)) {
                        blobToken = null;
                        fail("Der Download konnte nicht gelesen werden.");
                    }
                }
            });
        }
    }

    // ------------------------------------------------------------------ Seite sichern

    private void snapshot() {
        if (done || busyView.getVisibility() == View.VISIBLE) {
            return;
        }
        showBusy("Seite wird gesichert …");
        web.evaluateJavascript("(function(){return JSON.stringify({t:document.title||'',x:(document.body?document.body.innerText:'').slice(0,60000)});})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        String title = "";
                        String text = "";
                        try {
                            Object decoded = new JSONTokener(value).nextValue();
                            JSONObject o = new JSONObject(String.valueOf(decoded));
                            title = o.optString("t");
                            text = o.optString("x");
                        } catch (Exception ignored) {
                            // ohne Text weiter
                        }
                        capture(title, text);
                    }
                });
    }

    @SuppressWarnings("deprecation")
    private void capture(final String title, final String text) {
        web.scrollTo(0, 0);
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                try {
                    int width = web.getWidth();
                    float scale = web.getScale();
                    int height = (int) (web.getContentHeight() * scale);
                    if (width <= 0 || height <= 0) {
                        height = web.getHeight();
                    }
                    height = Math.min(height, 30000);
                    float factor = 1f;
                    if (width > 1080) {
                        factor = 1080f / width;
                    }
                    // höchstens ca. 48 MB Bildspeicher
                    long bytes = (long) (width * factor) * (long) (height * factor) * 4L;
                    if (bytes > 48L * 1024 * 1024) {
                        factor *= (float) Math.sqrt((48.0 * 1024 * 1024) / bytes);
                    }
                    int bw = Math.max(1, (int) (width * factor));
                    int bh = Math.max(1, (int) (height * factor));
                    Bitmap bmp = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888);
                    Canvas c = new Canvas(bmp);
                    c.drawColor(Color.WHITE);
                    c.scale(factor, factor);
                    web.draw(c);
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
                    bmp.recycle();
                    JSONObject file = store.saveBytes(out.toByteArray(), "image/png", "beleg-webseite.png");
                    JSONObject o = new JSONObject();
                    o.put("ok", true);
                    o.put("kind", "snapshot");
                    o.put("file", file);
                    o.put("title", title);
                    o.put("text", text.length() > 60000 ? text.substring(0, 60000) : text);
                    o.put("url", web.getUrl());
                    finishWith(o);
                } catch (OutOfMemoryError e) {
                    fail("Die Seite ist zu groß zum Sichern.");
                } catch (Exception e) {
                    fail("Die Seite konnte nicht gesichert werden.");
                }
            }
        }, 400);
    }
}
