package com.example

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var webViewInstance: WebView? = null

    private val filePickerLauncher: ActivityResultLauncher<Intent> =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (fileUploadCallback == null) return@registerForActivityResult

            val results: Array<Uri>? = when {
                result.resultCode == RESULT_OK && result.data != null -> {
                    val clipData = result.data?.clipData
                    val dataUri = result.data?.data
                    when {
                        clipData != null -> {
                            Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                        }
                        dataUri != null -> {
                            arrayOf(dataUri)
                        }
                        else -> null
                    }
                }
                else -> null
            }

            fileUploadCallback?.onReceiveValue(results)
            fileUploadCallback = null
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MotionEditApp(
                onInitWebView = { webView ->
                    webViewInstance = webView
                    setupWebView(webView)
                },
                onBackPressed = {
                    if (webViewInstance?.canGoBack() == true) {
                        webViewInstance?.goBack()
                    } else {
                        finish()
                    }
                }
            )
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(webView: WebView) {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.setBackgroundColor(android.graphics.Color.parseColor("#0c0f17"))

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("file:///android_asset/") || url.startsWith("blob:") || url.startsWith("data:")) {
                    return false
                }
                // Allow in-app navigation
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                try {
                    filePickerLauncher.launch(intent)
                } catch (e: Exception) {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }

        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onDestroy() {
        webViewInstance?.destroy()
        super.onDestroy()
    }
}

@Composable
fun MotionEditApp(
    onInitWebView: (WebView) -> Unit,
    onBackPressed: () -> Unit
) {
    BackHandler(onBack = onBackPressed)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0C0F17))
            .statusBarsPadding()
    ) {
        AndroidView(
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    onInitWebView(this)
                }
            },
            modifier = Modifier.fillMaxSize()
        )
    }
}
