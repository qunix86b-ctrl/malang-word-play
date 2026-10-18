package com.malang.wordplay;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name="MicrophoneAccess", permissions={@Permission(alias="microphone",strings={Manifest.permission.RECORD_AUDIO})})
public class MicrophoneAccessPlugin extends Plugin {
    private JSObject currentStatus() {
        JSObject result=new JSObject();
        PermissionState state=getPermissionState("microphone");
        result.put("state",state==PermissionState.GRANTED?"granted":state==PermissionState.DENIED?"denied":"prompt");
        return result;
    }
    @PluginMethod public void status(PluginCall call) {call.resolve(currentStatus());}
    @Override protected void handleOnResume(){notifyListeners("permissionStatusChanged",currentStatus());}
    @PluginMethod public void requestAccess(PluginCall call) {
        if(getPermissionState("microphone")==PermissionState.GRANTED){status(call);return;}
        requestPermissionForAlias("microphone",call,"permissionResult");
    }
    @PermissionCallback private void permissionResult(PluginCall call){status(call);}
    @PluginMethod public void openSettings(PluginCall call) {
        try {
            Intent intent=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:"+getContext().getPackageName()));
            getActivity().startActivity(intent);call.resolve();
        }catch(Exception error){call.reject("앱 설정을 열 수 없어요. 기기 설정 > 앱 > 말랑말랑 단어놀이 > 권한에서 마이크를 허용해 주세요.",error);}
    }
}
