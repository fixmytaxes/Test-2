package de.bonarchiv.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.hardware.Camera;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.os.Vibrator;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.List;

/**
 * Kamera-Scanner für QR-Codes an der Kasse.
 * Nutzt die klassische Kamera-Schnittstelle (läuft auf allen Geräten ab Android 7) und ZXing.
 */
@SuppressWarnings("deprecation")
public class ScannerActivity extends Activity implements SurfaceHolder.Callback, Camera.PreviewCallback {

    static final String EXTRA_TEXT = "text";
    private static final int REQUEST_CAMERA = 10;

    private FrameLayout root;
    private SurfaceView surface;
    private IconView torchButton;
    private TextView hint;
    private View permissionPanel;

    private Camera camera;
    private int cameraId = -1;
    private Camera.Size previewSize;
    private boolean hasSurface;
    private boolean previewing;
    private boolean torchOn;
    private boolean finished;
    private boolean autoFocusLoop;
    private int frameCount;

    private HandlerThread decodeThread;
    private Handler decodeHandler;
    private final Handler main = new Handler(Looper.getMainLooper());
    private QrDecoder decoder;

    private final Runnable focusRunnable = new Runnable() {
        @Override
        public void run() {
            if (camera != null && previewing && autoFocusLoop) {
                try {
                    camera.autoFocus(null);
                } catch (RuntimeException ignored) {
                    // Fokus nicht möglich
                }
                main.postDelayed(this, 2000);
            }
        }
    };

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        surface = new SurfaceView(this);
        root.addView(surface, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER));
        surface.getHolder().addCallback(this);

        root.addView(new IconView.Viewfinder(this), new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Kopfzeile
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(8), dp(8), dp(8), dp(8));
        IconView close = new IconView(this, IconView.CLOSE, Color.WHITE, 0x55000000);
        close.setContentDescription("Schließen");
        close.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                cancel();
            }
        });
        bar.addView(close, new LinearLayout.LayoutParams(dp(48), dp(48)));
        TextView title = new TextView(this);
        title.setText("Kassenbon scannen");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        bar.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        torchButton = new IconView(this, IconView.TORCH, Color.WHITE, 0x55000000);
        torchButton.setContentDescription("Licht");
        torchButton.setVisibility(View.INVISIBLE);
        torchButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                setTorch(!torchOn);
            }
        });
        bar.addView(torchButton, new LinearLayout.LayoutParams(dp(48), dp(48)));
        root.addView(bar, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP));

        // Hinweis unten
        hint = new TextView(this);
        hint.setText("Halte die Kamera auf den QR-Code für den digitalen Beleg – an der Kasse oder auf dem Kassenbon.");
        hint.setTextColor(Color.WHITE);
        hint.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        hint.setGravity(Gravity.CENTER);
        hint.setLineSpacing(0, 1.15f);
        hint.setPadding(dp(32), dp(16), dp(32), dp(48));
        root.addView(hint, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));

        setContentView(root);

        decoder = new QrDecoder(true);
        decodeThread = new HandlerThread("qr-decode");
        decodeThread.start();
        decodeHandler = new Handler(decodeThread.getLooper());

        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != REQUEST_CAMERA) {
            return;
        }
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            hidePermissionPanel();
            startCamera();
        } else {
            showPermissionPanel(!shouldShowRequestPermissionRationale(Manifest.permission.CAMERA));
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            hidePermissionPanel();
            startCamera();
        }
    }

    @Override
    protected void onPause() {
        stopCamera();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (decodeThread != null) {
            decodeThread.quit();
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        cancel();
    }

    private void cancel() {
        finished = true;
        setResult(RESULT_CANCELED);
        finish();
    }

    // ---------------------------------------------------------------- Kamera

    private void startCamera() {
        if (camera != null || finished) {
            return;
        }
        try {
            int n = Camera.getNumberOfCameras();
            Camera.CameraInfo info = new Camera.CameraInfo();
            cameraId = -1;
            for (int i = 0; i < n; i++) {
                Camera.getCameraInfo(i, info);
                if (info.facing == Camera.CameraInfo.CAMERA_FACING_BACK) {
                    cameraId = i;
                    break;
                }
            }
            if (cameraId < 0 && n > 0) {
                cameraId = 0;
            }
            if (cameraId < 0) {
                showError("Dieses Gerät hat keine Kamera.");
                return;
            }
            camera = Camera.open(cameraId);
            configure();
            if (hasSurface) {
                startPreview();
            }
        } catch (RuntimeException e) {
            camera = null;
            showError("Die Kamera konnte nicht gestartet werden. Wird sie gerade von einer anderen App benutzt?");
        }
    }

    private void configure() {
        Camera.Parameters p = camera.getParameters();
        previewSize = choosePreviewSize(p.getSupportedPreviewSizes());
        if (previewSize != null) {
            p.setPreviewSize(previewSize.width, previewSize.height);
        }
        List<String> focus = p.getSupportedFocusModes();
        autoFocusLoop = false;
        if (focus != null && focus.contains(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE)) {
            p.setFocusMode(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE);
        } else if (focus != null && focus.contains(Camera.Parameters.FOCUS_MODE_CONTINUOUS_VIDEO)) {
            p.setFocusMode(Camera.Parameters.FOCUS_MODE_CONTINUOUS_VIDEO);
        } else if (focus != null && focus.contains(Camera.Parameters.FOCUS_MODE_AUTO)) {
            p.setFocusMode(Camera.Parameters.FOCUS_MODE_AUTO);
            autoFocusLoop = true;
        }
        List<String> scenes = p.getSupportedSceneModes();
        if (scenes != null && scenes.contains(Camera.Parameters.SCENE_MODE_BARCODE)) {
            p.setSceneMode(Camera.Parameters.SCENE_MODE_BARCODE);
        }
        List<String> flash = p.getSupportedFlashModes();
        final boolean canTorch = flash != null && flash.contains(Camera.Parameters.FLASH_MODE_TORCH);
        try {
            camera.setParameters(p);
        } catch (RuntimeException e) {
            // Manche Geräte lehnen Kombinationen ab – nur die Vorschaugröße setzen
            Camera.Parameters basic = camera.getParameters();
            if (previewSize != null) {
                basic.setPreviewSize(previewSize.width, previewSize.height);
            }
            try {
                camera.setParameters(basic);
            } catch (RuntimeException ignored) {
                previewSize = camera.getParameters().getPreviewSize();
            }
        }
        previewSize = camera.getParameters().getPreviewSize();
        camera.setDisplayOrientation(displayOrientation());
        torchButton.setVisibility(canTorch ? View.VISIBLE : View.INVISIBLE);
        layoutSurface();
    }

    private int displayOrientation() {
        Camera.CameraInfo info = new Camera.CameraInfo();
        Camera.getCameraInfo(cameraId, info);
        int rotation = getWindowManager().getDefaultDisplay().getRotation();
        int degrees = 0;
        switch (rotation) {
            case Surface.ROTATION_90:
                degrees = 90;
                break;
            case Surface.ROTATION_180:
                degrees = 180;
                break;
            case Surface.ROTATION_270:
                degrees = 270;
                break;
            default:
                break;
        }
        if (info.facing == Camera.CameraInfo.CAMERA_FACING_FRONT) {
            return (360 - (info.orientation + degrees) % 360) % 360;
        }
        return (info.orientation - degrees + 360) % 360;
    }

    private Camera.Size choosePreviewSize(List<Camera.Size> sizes) {
        if (sizes == null || sizes.isEmpty()) {
            return null;
        }
        int sw = getResources().getDisplayMetrics().widthPixels;
        int sh = getResources().getDisplayMetrics().heightPixels;
        float screenRatio = (float) Math.max(sw, sh) / Math.min(sw, sh);
        Camera.Size best = null;
        float bestScore = Float.MAX_VALUE;
        for (Camera.Size s : sizes) {
            int pixels = s.width * s.height;
            if (pixels < 480 * 320 || pixels > 1920 * 1088) {
                continue;
            }
            float ratio = (float) Math.max(s.width, s.height) / Math.min(s.width, s.height);
            // Nähe zu 1280×720 und zum Bildschirmformat
            float score = Math.abs(pixels - 1280 * 720) / (1280f * 720f) + Math.abs(ratio - screenRatio) * 2f;
            if (score < bestScore) {
                bestScore = score;
                best = s;
            }
        }
        return best != null ? best : sizes.get(0);
    }

    /** Vorschau formatfüllend und unverzerrt (überstehende Ränder werden abgeschnitten). */
    private void layoutSurface() {
        if (previewSize == null) {
            return;
        }
        root.post(new Runnable() {
            @Override
            public void run() {
                int rw = root.getWidth();
                int rh = root.getHeight();
                if (rw == 0 || rh == 0) {
                    return;
                }
                boolean rotated = displayOrientation() % 180 != 0;
                float pw = rotated ? previewSize.height : previewSize.width;
                float ph = rotated ? previewSize.width : previewSize.height;
                float scale = Math.max(rw / pw, rh / ph);
                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(pw * scale), Math.round(ph * scale), Gravity.CENTER);
                surface.setLayoutParams(lp);
            }
        });
    }

    private void startPreview() {
        if (camera == null || previewing) {
            return;
        }
        try {
            camera.setPreviewDisplay(surface.getHolder());
            camera.startPreview();
            previewing = true;
            if (torchOn) {
                setTorch(true);
            }
            requestFrame();
            if (autoFocusLoop) {
                main.postDelayed(focusRunnable, 500);
            }
        } catch (Exception e) {
            showError("Die Kameravorschau konnte nicht gestartet werden.");
        }
    }

    private void stopCamera() {
        main.removeCallbacks(focusRunnable);
        if (camera != null) {
            try {
                camera.setPreviewCallback(null);
                camera.stopPreview();
            } catch (RuntimeException ignored) {
                // bereits gestoppt
            }
            camera.release();
            camera = null;
        }
        previewing = false;
    }

    private void requestFrame() {
        if (camera != null && previewing && !finished) {
            try {
                camera.setOneShotPreviewCallback(this);
            } catch (RuntimeException ignored) {
                // Kamera wurde inzwischen freigegeben
            }
        }
    }

    @Override
    public void onPreviewFrame(final byte[] data, Camera cam) {
        if (finished || previewSize == null || data == null) {
            return;
        }
        final int w = previewSize.width;
        final int h = previewSize.height;
        final boolean full = (++frameCount % 4) == 0;
        decodeHandler.post(new Runnable() {
            @Override
            public void run() {
                final String text = decoder.decodeFrame(data, w, h, full);
                main.post(new Runnable() {
                    @Override
                    public void run() {
                        if (text != null && !text.trim().isEmpty()) {
                            deliver(text);
                        } else {
                            requestFrame();
                        }
                    }
                });
            }
        });
    }

    private void deliver(String text) {
        if (finished) {
            return;
        }
        finished = true;
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                v.vibrate(60);
            }
        } catch (Exception ignored) {
            // ohne Vibration
        }
        setResult(RESULT_OK, new Intent().putExtra(EXTRA_TEXT, text));
        finish();
    }

    private void setTorch(boolean on) {
        if (camera == null) {
            return;
        }
        try {
            Camera.Parameters p = camera.getParameters();
            p.setFlashMode(on ? Camera.Parameters.FLASH_MODE_TORCH : Camera.Parameters.FLASH_MODE_OFF);
            camera.setParameters(p);
            torchOn = on;
            torchButton.setOn(on);
        } catch (RuntimeException ignored) {
            // Licht nicht verfügbar
        }
    }

    // ---------------------------------------------------------------- Surface

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        hasSurface = true;
        startPreview();
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
        // Größe wird in layoutSurface() bestimmt
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        hasSurface = false;
        stopCamera();
    }

    // ---------------------------------------------------------------- Hinweise

    private void showError(String message) {
        hint.setText(message);
    }

    private void hidePermissionPanel() {
        if (permissionPanel != null) {
            root.removeView(permissionPanel);
            permissionPanel = null;
        }
    }

    private void showPermissionPanel(final boolean openSettings) {
        hidePermissionPanel();
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(32), dp(32), dp(32), dp(32));
        panel.setBackgroundColor(0xF0101614);
        TextView t = new TextView(this);
        t.setText("Kamera erlauben");
        t.setTextColor(Color.WHITE);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setGravity(Gravity.CENTER);
        panel.addView(t);
        TextView m = new TextView(this);
        m.setText("Zum Scannen der QR-Codes braucht Bonarchiv Zugriff auf die Kamera. Bilder werden nicht gespeichert und nicht übertragen.");
        m.setTextColor(0xFFCCD6D2);
        m.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        m.setGravity(Gravity.CENTER);
        m.setPadding(0, dp(12), 0, dp(24));
        panel.addView(m);
        TextView button = pill(openSettings ? "Einstellungen öffnen" : "Zugriff erlauben", 0xFF3CC2A0, 0xFF052019);
        button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (openSettings) {
                    Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getPackageName(), null));
                    startActivity(i);
                } else {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA);
                }
            }
        });
        panel.addView(button);
        TextView later = pill("Schließen", 0x00000000, Color.WHITE);
        later.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                cancel();
            }
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(8);
        panel.addView(later, lp);
        permissionPanel = panel;
        root.addView(panel, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private TextView pill(String text, int bgColor, int fg) {
        TextView b = new TextView(this);
        b.setText(text);
        b.setTextColor(fg);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(28), dp(14), dp(28), dp(14));
        GradientDrawable d = new GradientDrawable();
        d.setColor(bgColor);
        d.setCornerRadius(dp(14));
        b.setBackground(d);
        b.setClickable(true);
        return b;
    }
}
