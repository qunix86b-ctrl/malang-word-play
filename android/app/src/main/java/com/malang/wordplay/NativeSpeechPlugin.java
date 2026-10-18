package com.malang.wordplay;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {
    private TextToSpeech tts;
    private boolean ready = false;
    private PluginCall pending;
    private String pendingId;
    private long utteranceNumber=0;
    private void finish(String id, boolean completed, boolean failed) {
        getActivity().runOnUiThread(()->{
            if(pending==null || !id.equals(pendingId))return;
            PluginCall call=pending;pending=null;pendingId=null;
            if(failed){call.reject("음성 재생 실패");return;}
            JSObject result=new JSObject();result.put("completed",completed);call.resolve(result);
        });
    }
    private void cancelPending(){if(pendingId!=null)finish(pendingId,false,false);}
    @Override public void load() {
        getActivity().runOnUiThread(() -> tts = new TextToSpeech(getContext(), status -> {
            ready=status==TextToSpeech.SUCCESS;
            if(ready)tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
                @Override public void onStart(String id){}
                @Override public void onDone(String id){finish(id,true,false);}
                @Override public void onError(String id){finish(id,false,true);}
                @Override public void onStop(String id,boolean interrupted){finish(id,false,false);}
            });
        }));
    }
    @PluginMethod public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!ready || tts == null) { call.reject("기기 음성을 준비하지 못했어요."); return; }
            String text = call.getString("text", "");
            int languageStatus = tts.setLanguage(Locale.forLanguageTag(call.getString("language", "ko-KR")));
            if (languageStatus < 0) { call.reject("기기에 해당 언어 음성을 설치해 주세요."); return; }
            tts.setSpeechRate(call.getFloat("rate", 0.9f));
            cancelPending();String id="malang-"+(++utteranceNumber);
            boolean wait=call.getBoolean("waitForEnd",false);
            if(wait){pending=call;pendingId=id;}
            int status = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            if(status==TextToSpeech.ERROR){if(wait)finish(id,false,true);else call.reject("음성 재생 실패");}
            else if(!wait)call.resolve();
        });
    }
    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { cancelPending();if (tts != null) tts.stop(); call.resolve(); });
    }
    @Override protected void handleOnPause() { cancelPending();if (tts != null) tts.stop(); }
    @Override protected void handleOnDestroy() { cancelPending();if (tts != null) tts.shutdown(); }
}
