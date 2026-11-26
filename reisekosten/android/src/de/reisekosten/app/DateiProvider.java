package de.reisekosten.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Minimaler Content-Provider (wie androidx FileProvider, ohne Bibliothek): gibt Dateien aus dem
 * Cache-Verzeichnis der App frei – Kamerafotos (kamera/), zu teilende Abrechnungen (teilen/)
 * und Dateien, die mit einer anderen App geöffnet werden (oeffnen/).
 * URI-Form: content://de.reisekosten.app.dateien/<ordner>/<datei>
 */
public class DateiProvider extends ContentProvider {

    public static final String AUTHORITY = "de.reisekosten.app.dateien";
    private static final String[] ORDNER = { "kamera", "teilen", "oeffnen" };

    public static Uri uriFuer(String ordner, String name) {
        return new Uri.Builder().scheme("content").authority(AUTHORITY).appendPath(ordner).appendPath(name).build();
    }

    public static File dateiFuer(File cacheDir, String ordner, String name) {
        File dir = new File(cacheDir, ordner);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return new File(dir, name);
    }

    private File datei(Uri uri) throws FileNotFoundException {
        if (getContext() == null || uri.getPathSegments().size() != 2) {
            throw new FileNotFoundException(String.valueOf(uri));
        }
        String ordner = uri.getPathSegments().get(0);
        String name = uri.getPathSegments().get(1);
        boolean erlaubt = false;
        for (String o : ORDNER) {
            if (o.equals(ordner)) {
                erlaubt = true;
            }
        }
        if (!erlaubt || name.contains("/") || name.contains("..")) {
            throw new FileNotFoundException(String.valueOf(uri));
        }
        return dateiFuer(getContext().getCacheDir(), ordner, name);
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = datei(uri);
        int flags = mode != null && mode.contains("w")
                ? ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE
                : ParcelFileDescriptor.MODE_READ_ONLY;
        return ParcelFileDescriptor.open(f, flags);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File f;
        try {
            f = datei(uri);
        } catch (FileNotFoundException e) {
            return null;
        }
        String[] spalten = projection != null ? projection : new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE };
        MatrixCursor c = new MatrixCursor(spalten, 1);
        Object[] zeile = new Object[spalten.length];
        for (int i = 0; i < spalten.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(spalten[i])) {
                zeile[i] = f.getName();
            } else if (OpenableColumns.SIZE.equals(spalten[i])) {
                zeile[i] = f.length();
            }
        }
        c.addRow(zeile);
        return c;
    }

    @Override
    public String getType(Uri uri) {
        return MainActivity.mimeFuer(uri.getLastPathSegment());
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException();
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
