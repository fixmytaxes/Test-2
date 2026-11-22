package de.bonarchiv.app;

import android.content.Context;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Ablage der Originalbelege im privaten App-Speicher (files/docs).
 *
 * Dateinamen vergibt ausschließlich die App ("b<zeit>_<zufall>.<endung>"); Namen, die aus
 * der Oberfläche kommen, werden streng geprüft, damit niemand aus dem Ordner ausbrechen kann.
 */
final class FileStore {

    static final long MAX_BYTES = 30L * 1024 * 1024;

    private static final Pattern SAFE_NAME = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    final File dir;

    static final class TooLargeException extends IOException {
        private static final long serialVersionUID = 1L;

        TooLargeException() {
            super("Die Datei ist größer als 30 MB.");
        }
    }

    FileStore(Context context) {
        dir = new File(context.getFilesDir(), "docs");
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }

    static boolean isSafeName(String name) {
        return name != null && SAFE_NAME.matcher(name).matches() && !name.contains("..");
    }

    /** Datei zu einem Namen aus der Oberfläche – oder null, wenn der Name nicht zulässig ist. */
    File get(String name) {
        if (!isSafeName(name)) {
            return null;
        }
        return new File(dir, name);
    }

    /** Strom vollständig speichern, Typ am Inhalt erkennen, SHA-256 berechnen. */
    JSONObject save(InputStream in, String mimeHint, String origName) throws IOException {
        File tmp = new File(dir, "tmp_" + System.nanoTime() + "_" + Integer.toHexString(RANDOM.nextInt()));
        MessageDigest md;
        try {
            md = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IOException(e);
        }
        byte[] head = new byte[1024];
        int headLen = 0;
        long total = 0;
        byte[] buf = new byte[32 * 1024];
        try {
            OutputStream out = new FileOutputStream(tmp);
            try {
                int n;
                while ((n = in.read(buf)) > 0) {
                    total += n;
                    if (total > MAX_BYTES) {
                        throw new TooLargeException();
                    }
                    md.update(buf, 0, n);
                    out.write(buf, 0, n);
                    if (headLen < head.length) {
                        int copy = Math.min(n, head.length - headLen);
                        System.arraycopy(buf, 0, head, headLen, copy);
                        headLen += copy;
                    }
                }
            } finally {
                out.close();
            }
        } catch (IOException e) {
            tmp.delete();
            throw e;
        }
        String mime = sniff(head, headLen, mimeHint, origName);
        String ext = extensionFor(mime, origName);
        String name = "b" + Long.toString(System.currentTimeMillis(), 36) + "_"
                + Integer.toString(RANDOM.nextInt(1 << 30), 36) + "." + ext;
        File dest = new File(dir, name);
        if (!tmp.renameTo(dest)) {
            tmp.delete();
            throw new IOException("Datei konnte nicht gespeichert werden.");
        }
        JSONObject info = new JSONObject();
        try {
            info.put("name", name);
            info.put("mime", mime);
            info.put("size", total);
            info.put("sha256", hex(md.digest()));
            info.put("origName", cleanOrigName(origName, ext));
        } catch (JSONException e) {
            throw new IOException(e);
        }
        return info;
    }

    JSONObject saveBytes(byte[] data, String mimeHint, String origName) throws IOException {
        return save(new java.io.ByteArrayInputStream(data), mimeHint, origName);
    }

    static String cleanOrigName(String origName, String ext) {
        String n = origName == null ? "" : origName.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]+", "").trim();
        if (n.length() > 80) {
            n = n.substring(n.length() - 80);
        }
        if (n.isEmpty()) {
            n = "beleg." + ext;
        }
        return n;
    }

    static String hex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.ROOT, "%02x", b & 0xff));
        }
        return sb.toString();
    }

    /** Dateityp am Inhalt erkennen; Angaben des Servers/der App sind oft ungenau. */
    static String sniff(byte[] h, int len, String mimeHint, String name) {
        String hint = mimeHint == null ? "" : mimeHint.toLowerCase(Locale.ROOT).split(";")[0].trim();
        if (len >= 4 && h[0] == '%' && h[1] == 'P' && h[2] == 'D' && h[3] == 'F') {
            return "application/pdf";
        }
        // PDF darf mit etwas Vorspann beginnen
        String start = new String(h, 0, Math.max(0, len), StandardCharsets.ISO_8859_1);
        if (start.contains("%PDF-")) {
            return "application/pdf";
        }
        if (len >= 8 && (h[0] & 0xff) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') {
            return "image/png";
        }
        if (len >= 3 && (h[0] & 0xff) == 0xFF && (h[1] & 0xff) == 0xD8 && (h[2] & 0xff) == 0xFF) {
            return "image/jpeg";
        }
        if (len >= 4 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') {
            return "image/gif";
        }
        if (len >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F' && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return "image/webp";
        }
        if (len >= 2 && h[0] == 'P' && h[1] == 'K') {
            return "application/zip";
        }
        String text = new String(h, 0, Math.max(0, len), StandardCharsets.UTF_8).replace("﻿", "").trim();
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.startsWith("<!doctype html") || lower.startsWith("<html") || (lower.startsWith("<") && lower.contains("<head") && lower.contains("<body"))) {
            return "text/html";
        }
        if (lower.startsWith("<?xml") || lower.startsWith("<")) {
            if (lower.contains("<html")) {
                return "text/html";
            }
            return "application/xml";
        }
        if (text.startsWith("{") || text.startsWith("[")) {
            return "application/json";
        }
        if (hint.contains("html")) {
            return "text/html";
        }
        if (text.startsWith("V0;")) {
            return "text/plain";
        }
        if (!hint.isEmpty() && !hint.equals("application/octet-stream") && !hint.equals("binary/octet-stream")) {
            return hint;
        }
        String ext = extensionOf(name);
        if (ext.equals("pdf")) {
            return "application/pdf";
        }
        if (ext.equals("json")) {
            return "application/json";
        }
        if (ext.equals("xml")) {
            return "application/xml";
        }
        if (ext.equals("txt") || ext.equals("csv")) {
            return "text/plain";
        }
        if (looksLikeText(h, len)) {
            return "text/plain";
        }
        return "application/octet-stream";
    }

    private static boolean looksLikeText(byte[] h, int len) {
        if (len == 0) {
            return false;
        }
        int bad = 0;
        for (int i = 0; i < len; i++) {
            int c = h[i] & 0xff;
            if (c < 9 || (c > 13 && c < 32 && c != 27)) {
                bad++;
            }
        }
        return bad * 20 < len;
    }

    static String extensionOf(String name) {
        if (name == null) {
            return "";
        }
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return "";
        }
        String ext = name.substring(dot + 1).toLowerCase(Locale.ROOT);
        return ext.matches("[a-z0-9]{1,5}") ? ext : "";
    }

    static String extensionFor(String mime, String name) {
        switch (mime) {
            case "application/pdf":
                return "pdf";
            case "image/png":
                return "png";
            case "image/jpeg":
                return "jpg";
            case "image/gif":
                return "gif";
            case "image/webp":
                return "webp";
            case "application/json":
                return "json";
            case "application/xml":
            case "text/xml":
                return "xml";
            case "text/html":
                return "html";
            case "text/plain":
                return "txt";
            case "application/zip":
                return "zip";
            default:
                String ext = extensionOf(name);
                return ext.isEmpty() ? "bin" : ext;
        }
    }

    static String mimeForName(String name) {
        switch (extensionOf(name)) {
            case "pdf":
                return "application/pdf";
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "gif":
                return "image/gif";
            case "webp":
                return "image/webp";
            case "json":
                return "application/json";
            case "xml":
                return "application/xml";
            case "html":
            case "htm":
                return "text/html";
            case "txt":
                return "text/plain";
            case "csv":
                return "text/csv";
            case "zip":
                return "application/zip";
            case "js":
            case "mjs":
                return "text/javascript";
            case "css":
                return "text/css";
            case "svg":
                return "image/svg+xml";
            default:
                return "application/octet-stream";
        }
    }
}
