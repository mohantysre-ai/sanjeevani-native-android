package com.ayush.sanjeevani;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Sanjeevani native shell.
 * - Day/night aware status + navigation bar tinted to the app surface color
 *   (#f4f2e8 light / #12211c dark) with matching icon luminance.
 * - Hardware back button walks WebView history first, exits only at root —
 *   the app is a hash-routed SPA, so this mirrors native navigation.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        applySystemBars();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemBars();
    }

    private void applySystemBars() {
        Window window = getWindow();
        if (window == null) return;
        boolean night = (getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int barColor = night ? Color.parseColor("#12211c") : Color.parseColor("#f4f2e8");
        window.setStatusBarColor(barColor);
        window.setNavigationBarColor(barColor);
        WindowCompat.getInsetsController(window, window.getDecorView())
                .setAppearanceLightStatusBars(!night);
        WindowCompat.getInsetsController(window, window.getDecorView())
                .setAppearanceLightNavigationBars(!night);
    }

    @Override
    public void onBackPressed() {
        if (bridge != null && bridge.getWebView() != null && bridge.getWebView().canGoBack()) {
            bridge.getWebView().goBack();
        } else {
            super.onBackPressed();
        }
    }
}
