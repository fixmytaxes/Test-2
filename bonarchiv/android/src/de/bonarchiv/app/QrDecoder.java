package de.bonarchiv.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.LuminanceSource;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.PlanarYUVLuminanceSource;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.GlobalHistogramBinarizer;
import com.google.zxing.common.HybridBinarizer;

import java.io.File;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;

/** QR-Codes (und DataMatrix/Aztec) mit ZXing lesen – aus Kamerabildern oder Bilddateien. */
final class QrDecoder {

    private final MultiFormatReader reader = new MultiFormatReader();
    private final Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);

    QrDecoder(boolean tryHarder) {
        hints.put(DecodeHintType.POSSIBLE_FORMATS, Arrays.asList(BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.AZTEC));
        hints.put(DecodeHintType.CHARACTER_SET, "UTF-8");
        hints.put(DecodeHintType.ALSO_INVERTED, Boolean.TRUE);
        if (tryHarder) {
            hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
        }
        reader.setHints(hints);
    }

    /** Kamerabild (NV21, Sensorausrichtung). Die Mitte wird zuerst geprüft, gelegentlich das ganze Bild. */
    String decodeFrame(byte[] data, int width, int height, boolean fullFrame) {
        LuminanceSource src;
        if (fullFrame) {
            src = new PlanarYUVLuminanceSource(data, width, height, 0, 0, width, height, false);
        } else {
            int side = (int) (Math.min(width, height) * 0.85f);
            src = new PlanarYUVLuminanceSource(data, width, height, (width - side) / 2, (height - side) / 2, side, side, false);
        }
        return decode(src);
    }

    String decodeBitmap(Bitmap bmp) {
        int w = bmp.getWidth();
        int h = bmp.getHeight();
        int[] px = new int[w * h];
        bmp.getPixels(px, 0, w, 0, 0, w, h);
        return decode(new RGBLuminanceSource(w, h, px));
    }

    private String decode(LuminanceSource src) {
        try {
            Result r = reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(src)));
            return r.getText();
        } catch (Exception e) {
            // zweiter Versuch mit anderem Verfahren (hilft bei Displays und Spiegelungen)
        } finally {
            reader.reset();
        }
        try {
            Result r = reader.decodeWithState(new BinaryBitmap(new GlobalHistogramBinarizer(src)));
            return r.getText();
        } catch (Exception e) {
            return null;
        } finally {
            reader.reset();
        }
    }

    /** Bilddatei verkleinert laden und auswerten. */
    static String decodeFile(File f) {
        if (f == null || !f.exists()) {
            return null;
        }
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(f.getAbsolutePath(), bounds);
        int sample = 1;
        while (bounds.outWidth / sample > 2400 || bounds.outHeight / sample > 2400) {
            sample *= 2;
        }
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inSampleSize = sample;
        Bitmap bmp = BitmapFactory.decodeFile(f.getAbsolutePath(), opts);
        return decodeAndRecycle(bmp);
    }

    static String decodeBytes(byte[] data) {
        if (data == null) {
            return null;
        }
        Bitmap bmp = BitmapFactory.decodeByteArray(data, 0, data.length);
        return decodeAndRecycle(bmp);
    }

    private static String decodeAndRecycle(Bitmap bmp) {
        if (bmp == null) {
            return null;
        }
        try {
            String text = new QrDecoder(true).decodeBitmap(bmp);
            if (text == null && (bmp.getWidth() > 1200 || bmp.getHeight() > 1200)) {
                // kleine Codes auf großen Bildern: halbe Größe probieren
                Bitmap half = Bitmap.createScaledBitmap(bmp, bmp.getWidth() / 2, bmp.getHeight() / 2, true);
                text = new QrDecoder(true).decodeBitmap(half);
                half.recycle();
            }
            return text;
        } finally {
            bmp.recycle();
        }
    }
}
