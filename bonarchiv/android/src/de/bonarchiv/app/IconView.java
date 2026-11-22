package de.bonarchiv.app;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.View;

/** Einfache Strich-Symbole für die nativen Bildschirme (Scanner, Browser). */
final class IconView extends View {

    static final int CLOSE = 1;
    static final int TORCH = 2;
    static final int BACK = 3;

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
    private int type;
    private boolean on;

    IconView(Context context, int type, int color, int background) {
        super(context);
        this.type = type;
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setStrokeJoin(Paint.Join.ROUND);
        paint.setColor(color);
        bg.setColor(background);
        setClickable(true);
        setFocusable(true);
    }

    void setOn(boolean on) {
        this.on = on;
        invalidate();
    }

    void setColor(int color) {
        paint.setColor(color);
        invalidate();
    }

    @Override
    protected void onDraw(Canvas c) {
        float w = getWidth();
        float h = getHeight();
        float s = Math.min(w, h);
        if ((bg.getColor() >>> 24) != 0 || on) {
            Paint p = bg;
            if (on) {
                p = new Paint(Paint.ANTI_ALIAS_FLAG);
                p.setColor(0xFFFFFFFF);
            }
            c.drawCircle(w / 2, h / 2, s / 2, p);
        }
        float u = s / 24f; // 24er-Raster wie bei den Web-Symbolen
        c.save();
        c.translate((w - s) / 2, (h - s) / 2);
        c.scale(0.6f, 0.6f, s / 2, s / 2);
        paint.setStrokeWidth(2f * u / 0.6f * 0.9f);
        int color = paint.getColor();
        if (on) {
            paint.setColor(0xFF111111);
        }
        Path path = new Path();
        switch (type) {
            case CLOSE:
                path.moveTo(6 * u, 6 * u);
                path.lineTo(18 * u, 18 * u);
                path.moveTo(18 * u, 6 * u);
                path.lineTo(6 * u, 18 * u);
                break;
            case BACK:
                path.moveTo(15 * u, 5 * u);
                path.lineTo(8 * u, 12 * u);
                path.lineTo(15 * u, 19 * u);
                break;
            case TORCH:
                // Taschenlampe
                path.moveTo(8 * u, 3 * u);
                path.lineTo(16 * u, 3 * u);
                path.lineTo(16 * u, 7 * u);
                path.lineTo(14 * u, 10 * u);
                path.lineTo(14 * u, 21 * u);
                path.lineTo(10 * u, 21 * u);
                path.lineTo(10 * u, 10 * u);
                path.lineTo(8 * u, 7 * u);
                path.close();
                path.moveTo(8 * u, 7 * u);
                path.lineTo(16 * u, 7 * u);
                path.moveTo(12 * u, 13 * u);
                path.lineTo(12 * u, 15 * u);
                break;
            default:
                break;
        }
        c.drawPath(path, paint);
        paint.setColor(color);
        c.restore();
    }

    /** Sucher mit abgedunkeltem Rand, Rahmenecken und Scanlinie. */
    static final class Viewfinder extends View {
        private final Paint dim = new Paint();
        private final Paint corner = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint laser = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF frame = new RectF();
        private long start = System.currentTimeMillis();

        Viewfinder(Context context) {
            super(context);
            dim.setColor(0x99000000);
            corner.setColor(0xFFFFFFFF);
            corner.setStyle(Paint.Style.STROKE);
            corner.setStrokeCap(Paint.Cap.ROUND);
            laser.setColor(0xCC3CC2A0);
        }

        @Override
        protected void onDraw(Canvas c) {
            float w = getWidth();
            float h = getHeight();
            float side = Math.min(w, h) * 0.72f;
            float left = (w - side) / 2;
            float top = (h - side) / 2 - h * 0.04f;
            frame.set(left, top, left + side, top + side);
            c.drawRect(0, 0, w, frame.top, dim);
            c.drawRect(0, frame.bottom, w, h, dim);
            c.drawRect(0, frame.top, frame.left, frame.bottom, dim);
            c.drawRect(frame.right, frame.top, w, frame.bottom, dim);
            float d = getResources().getDisplayMetrics().density;
            corner.setStrokeWidth(4 * d);
            float len = 28 * d;
            float r = 4 * d;
            drawCorner(c, frame.left, frame.top, len, len, r);
            drawCorner(c, frame.right, frame.top, -len, len, r);
            drawCorner(c, frame.left, frame.bottom, len, -len, r);
            drawCorner(c, frame.right, frame.bottom, -len, -len, r);
            long t = (System.currentTimeMillis() - start) % 2400;
            float phase = t < 1200 ? t / 1200f : 2 - t / 1200f;
            float y = frame.top + side * (0.08f + 0.84f * phase);
            c.drawRoundRect(new RectF(frame.left + 12 * d, y - d, frame.right - 12 * d, y + d), d, d, laser);
            postInvalidateDelayed(30);
        }

        private void drawCorner(Canvas c, float x, float y, float dx, float dy, float r) {
            Path p = new Path();
            p.moveTo(x, y + dy);
            p.lineTo(x, y);
            p.lineTo(x + dx, y);
            c.drawPath(p, corner);
        }

        float frameBottom() {
            return frame.bottom;
        }
    }
}
