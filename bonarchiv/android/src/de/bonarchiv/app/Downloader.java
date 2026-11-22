package de.bonarchiv.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.webkit.URLUtil;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.NoRouteToHostException;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.net.ssl.SSLException;

/**
 * Lädt einen digitalen Beleg aus dem Internet.
 *
 * Ergebnis (JSON):
 *   {ok:true, kind:"file", file:{…}, finalUrl}   – PDF, Bild, JSON, XML …
 *   {ok:true, kind:"html", html:"…", finalUrl}   – Beleg-Webseite, die Oberfläche entscheidet weiter
 *   {ok:false, errorType:"offline|network|http|size|invalid", error:"…"}
 */
final class Downloader {

    private static final int MAX_REDIRECTS = 8;
    private static final int MAX_HTML = 2 * 1024 * 1024;

    private Downloader() {
    }

    static JSONObject download(Context context, FileStore store, String url, String userAgent, String cookie, String referer) {
        try {
            if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
                return error("invalid", "Das ist kein gültiger Link.");
            }
            String current = url;
            HttpURLConnection conn = null;
            for (int i = 0; i <= MAX_REDIRECTS; i++) {
                conn = (HttpURLConnection) new URL(current).openConnection();
                conn.setInstanceFollowRedirects(false);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("User-Agent", userAgent != null ? userAgent : "Mozilla/5.0 (Linux; Android) Bonarchiv");
                conn.setRequestProperty("Accept", "application/pdf,application/json,application/xml,text/xml,image/*,text/html;q=0.9,*/*;q=0.8");
                conn.setRequestProperty("Accept-Language", "de-DE,de;q=0.9,en;q=0.5");
                if (cookie != null && !cookie.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookie);
                }
                if (referer != null && !referer.isEmpty()) {
                    conn.setRequestProperty("Referer", referer);
                }
                int code = conn.getResponseCode();
                if (code >= 300 && code < 400 && code != 304) {
                    String location = conn.getHeaderField("Location");
                    conn.disconnect();
                    if (location == null) {
                        return error("http", "Der Server leitet ohne Ziel weiter.");
                    }
                    current = new URL(new URL(current), location).toString();
                    if (!current.startsWith("http")) {
                        return error("invalid", "Der Link führt zu einer App statt zu einem Beleg.");
                    }
                    continue;
                }
                if (code >= 400) {
                    conn.disconnect();
                    String reason = code == 404 || code == 410
                            ? "Der Beleg wurde nicht gefunden – evtl. ist der Link abgelaufen."
                            : code == 401 || code == 403 ? "Der Server verweigert den Zugriff." : "Der Server meldet einen Fehler.";
                    return error("http", reason + " (HTTP " + code + ")");
                }
                break;
            }
            if (conn == null) {
                return error("network", "Keine Verbindung.");
            }
            String type = conn.getContentType();
            String disposition = conn.getHeaderField("Content-Disposition");
            String fileName = URLUtil.guessFileName(current, disposition, type);
            long length = conn.getContentLength();
            if (length > FileStore.MAX_BYTES) {
                conn.disconnect();
                return error("size", "Die Datei ist größer als 30 MB.");
            }
            JSONObject info;
            InputStream in = conn.getInputStream();
            try {
                info = store.save(in, type, fileName);
            } finally {
                in.close();
                conn.disconnect();
            }
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("finalUrl", current);
            if ("text/html".equals(info.optString("mime"))) {
                File f = store.get(info.getString("name"));
                result.put("kind", "html");
                result.put("html", readText(f, charsetOf(type)));
                if (f != null) {
                    f.delete();
                }
            } else {
                result.put("kind", "file");
                result.put("file", info);
            }
            return result;
        } catch (FileStore.TooLargeException e) {
            return error("size", e.getMessage());
        } catch (UnknownHostException | ConnectException | NoRouteToHostException e) {
            return isOnline(context)
                    ? error("network", "Der Server ist nicht erreichbar.")
                    : error("offline", "Keine Internetverbindung.");
        } catch (SocketTimeoutException e) {
            return error("network", "Zeitüberschreitung – die Verbindung ist zu langsam.");
        } catch (SSLException e) {
            return error("network", "Keine sichere Verbindung möglich.");
        } catch (IOException e) {
            return isOnline(context)
                    ? error("network", "Fehler beim Laden: " + e.getMessage())
                    : error("offline", "Keine Internetverbindung.");
        } catch (Exception e) {
            return error("invalid", "Der Link konnte nicht geöffnet werden.");
        }
    }

    static boolean isOnline(Context context) {
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo ni = cm == null ? null : cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        } catch (Exception e) {
            return true;
        }
    }

    private static Charset charsetOf(String contentType) {
        if (contentType != null) {
            Matcher m = Pattern.compile("charset=\"?([A-Za-z0-9_\\-]+)").matcher(contentType);
            if (m.find()) {
                try {
                    return Charset.forName(m.group(1));
                } catch (Exception ignored) {
                    // Standard verwenden
                }
            }
        }
        return StandardCharsets.UTF_8;
    }

    private static String readText(File f, Charset cs) throws IOException {
        if (f == null) {
            return "";
        }
        int len = (int) Math.min(f.length(), MAX_HTML);
        byte[] data = new byte[len];
        FileInputStream in = new FileInputStream(f);
        try {
            int off = 0;
            while (off < len) {
                int n = in.read(data, off, len - off);
                if (n < 0) {
                    break;
                }
                off += n;
            }
        } finally {
            in.close();
        }
        return new String(data, cs);
    }

    static JSONObject error(String type, String message) {
        JSONObject o = new JSONObject();
        try {
            o.put("ok", false);
            o.put("errorType", type);
            o.put("error", message);
        } catch (JSONException ignored) {
            // kann nicht passieren
        }
        return o;
    }

    static String lower(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }
}
