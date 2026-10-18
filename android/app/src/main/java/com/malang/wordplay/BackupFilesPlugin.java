package com.malang.wordplay;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupFiles")
public class BackupFilesPlugin extends Plugin {
    @PluginMethod public void exportFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("filename", "malang-voices.json"));
        startActivityForResult(call, intent, "fileCreated");
    }
    @ActivityCallback private void fileCreated(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject response = new JSObject(); response.put("saved", false); call.resolve(response); return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData())) {
            if (output == null) throw new IllegalStateException("파일을 열 수 없어요.");
            output.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8));
            JSObject response = new JSObject(); response.put("saved", true); call.resolve(response);
        } catch (Exception error) { call.reject("파일 저장 실패", error); }
    }
}
