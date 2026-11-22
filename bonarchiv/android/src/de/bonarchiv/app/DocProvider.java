package de.bonarchiv.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.List;

/**
 * Gibt einzelne Belege bzw. Exporte an andere Apps weiter (Teilen, Öffnen mit …).
 * Nicht exportiert: andere Apps erhalten nur über eine erteilte URI-Berechtigung Lesezugriff.
 *
 *   content://de.bonarchiv.app.files/docs/<datei>?n=<anzeigename>
 *   content://de.bonarchiv.app.files/export/<datei>
 */
public class DocProvider extends ContentProvider {

    static final String AUTHORITY = "de.bonarchiv.app.files";

    static Uri docUri(String name, String displayName) {
        return new Uri.Builder().scheme("content").authority(AUTHORITY).appendPath("docs").appendPath(name)
                .appendQueryParameter("n", displayName == null ? name : displayName).build();
    }

    static Uri exportUri(String name) {
        return new Uri.Builder().scheme("content").authority(AUTHORITY).appendPath("export").appendPath(name)
                .appendQueryParameter("n", name).build();
    }

    static File exportDir(Context context) {
        File dir = new File(context.getCacheDir(), "export");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dir;
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    private File fileFor(Uri uri) {
        List<String> seg = uri.getPathSegments();
        if (seg.size() != 2 || !FileStore.isSafeName(seg.get(1))) {
            return null;
        }
        Context c = getContext();
        if (c == null) {
            return null;
        }
        if ("docs".equals(seg.get(0))) {
            return new File(new File(c.getFilesDir(), "docs"), seg.get(1));
        }
        if ("export".equals(seg.get(0))) {
            return new File(exportDir(c), seg.get(1));
        }
        return null;
    }

    private static String displayName(Uri uri) {
        String n = uri.getQueryParameter("n");
        if (n == null || n.isEmpty()) {
            n = uri.getLastPathSegment();
        }
        return n.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]+", "_");
    }

    @Override
    public String getType(Uri uri) {
        String type = FileStore.mimeForName(displayName(uri));
        if ("application/octet-stream".equals(type)) {
            type = FileStore.mimeForName(uri.getLastPathSegment());
        }
        return type;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File f = fileFor(uri);
        String[] cols = projection != null ? projection : new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        MatrixCursor cursor = new MatrixCursor(cols, 1);
        if (f == null || !f.exists()) {
            return cursor;
        }
        Object[] row = new Object[cols.length];
        for (int i = 0; i < cols.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) {
                row[i] = displayName(uri);
            } else if (OpenableColumns.SIZE.equals(cols[i])) {
                row[i] = f.length();
            }
        }
        cursor.addRow(row);
        return cursor;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (mode == null || !mode.startsWith("r") || mode.contains("w")) {
            throw new FileNotFoundException("Nur Lesezugriff");
        }
        File f = fileFor(uri);
        if (f == null || !f.exists()) {
            throw new FileNotFoundException("Datei nicht gefunden");
        }
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException();
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException();
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException();
    }
}
