package de.bonarchiv.app;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;

public class JvmTest {
    static void check(boolean ok, String msg) { if (!ok) throw new AssertionError(msg); System.out.println("  ok  " + msg); }

    /** QR-Code in ein NV21-Kamerabild (Querformat, mit Rauschen und Versatz) zeichnen. */
    static byte[] frame(String text, int w, int h, int size, int ox, int oy, boolean inverted) throws Exception {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        BitMatrix m = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size, hints);
        byte[] data = new byte[w * h * 3 / 2];
        java.util.Random r = new java.util.Random(1);
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int qx = x - ox, qy = y - oy;
            boolean black = qx >= 0 && qy >= 0 && qx < size && qy < size && m.get(qx, qy);
            if (inverted) black = !black && qx >= 0 && qy >= 0 && qx < size && qy < size;
            int v = (black ? 40 : 200) + r.nextInt(30) - 15;
            data[y * w + x] = (byte) v;
        }
        return data;
    }

    public static void main(String[] a) throws Exception {
        String url = "https://beleg.example.de/r/9f8e7d6c5b4a?k=Zx8&ä=1";
        QrDecoder d = new QrDecoder(true);
        check(url.equals(d.decodeFrame(frame(url, 1280, 720, 300, 490, 210, false), 1280, 720, false)), "QR-Code in der Bildmitte (1280×720)");
        check(d.decodeFrame(frame(url, 1280, 720, 220, 40, 30, false), 1280, 720, false) == null, "QR-Code am Rand wird im Ausschnitt nicht gesucht");
        check(url.equals(d.decodeFrame(frame(url, 1280, 720, 220, 40, 30, false), 1280, 720, true)), "… aber im Vollbild gefunden");
        check(url.equals(d.decodeFrame(frame(url, 1280, 720, 300, 490, 210, true), 1280, 720, false)), "Invertierter QR-Code (helles Muster auf dunklem Display)");
        String tse = "V0;955002-00;Kassenbeleg-V1;Beleg^75.33_7.99_0.00_0.00_0.00^10.00:Bar_5.00:Bar:CHF_55.00:Unbar;18;112;2019-07-10T18:41:04.000Z;2019-07-10T18:41:04.000Z;ecdsa-plain-SHA256;unixTime;MEUCIAy4P9k+7x9saDO0uRZ4El8QwN+qTgYiv1DIaJIMWRiuAiEAmfQgvMgVLwDKyEvwOjbqMSEVR7rDyMbw4LqVVX69zh4=;BHhWOeisRpPBTGQ1W4VUH95TXx2GARf8e2NYZXJoInjtGqnxJ8sZ3CQpYgjI+LYEmW5A37sLWHsyU7nSJUBemyU=";
        check(tse.equals(d.decodeFrame(frame(tse, 1920, 1080, 560, 680, 260, false), 1920, 1080, false)), "Großer TSE-QR-Code (1920×1080)");

        byte[] pdf = "%PDF-1.7\n...".getBytes(StandardCharsets.ISO_8859_1);
        check(FileStore.sniff(pdf, pdf.length, "application/octet-stream", "x.bin").equals("application/pdf"), "PDF am Inhalt erkannt (trotz falschem Typ)");
        byte[] html = "<!DOCTYPE html><html><head></head><body>".getBytes(StandardCharsets.UTF_8);
        check(FileStore.sniff(html, html.length, "application/pdf", "beleg.pdf").equals("text/html"), "HTML-Seite statt PDF erkannt");
        byte[] json = "﻿  {\"head\":{}}".getBytes(StandardCharsets.UTF_8);
        check(FileStore.sniff(json, json.length, "text/plain", null).equals("application/json"), "JSON mit BOM erkannt");
        byte[] xml = "<?xml version=\"1.0\"?><Invoice/>".getBytes(StandardCharsets.UTF_8);
        check(FileStore.sniff(xml, xml.length, null, null).equals("application/xml"), "XML erkannt");
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};
        check(FileStore.sniff(png, png.length, null, null).equals("image/png"), "PNG erkannt");
        byte[] tseBytes = tse.getBytes(StandardCharsets.UTF_8);
        check(FileStore.sniff(tseBytes, tseBytes.length, null, null).equals("text/plain"), "TSE-Text erkannt");
        check(FileStore.extensionFor("application/pdf", "egal.bin").equals("pdf"), "Endung pdf");
        check(FileStore.isSafeName("b1abc_x9.pdf") && !FileStore.isSafeName("../x.pdf") && !FileStore.isSafeName("a/b.pdf") && !FileStore.isSafeName(".hidden"), "Unsichere Dateinamen werden abgelehnt");
        System.out.println("Java-Tests erfolgreich.");
    }
}
