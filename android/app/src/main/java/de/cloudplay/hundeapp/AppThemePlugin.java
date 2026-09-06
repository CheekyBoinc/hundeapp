package de.cloudplay.hundeapp;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.Window;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Färbt den Fensterhintergrund passend zum gewählten Design (hell/dunkel).
 * Auf Android 15+ liegt die WebView unterhalb der Statusleiste; der Streifen
 * dahinter zeigt den Fensterhintergrund, der sonst nur dem System-Nachtmodus
 * folgen würde. Aufruf aus src/theme.ts.
 */
@CapacitorPlugin(name = "AppTheme")
public class AppThemePlugin extends Plugin {

    @PluginMethod
    public void apply(PluginCall call) {
        String background = call.getString("background", "#faf7f2");
        int color;
        try {
            color = Color.parseColor(background);
        } catch (IllegalArgumentException e) {
            call.reject("Ungültige Farbe: " + background);
            return;
        }
        android.app.Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() -> {
            Window window = activity.getWindow();
            if (window != null) {
                window.setBackgroundDrawable(new ColorDrawable(color));
            }
            call.resolve();
        });
    }
}
