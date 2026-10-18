package com.malang.wordplay;

import android.speech.tts.TextToSpeech;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {
    private TextToSpeech tts;
    private boolean ready = false;
    @Override public void load() {
        getActivity().runOnUiThread(() -> tts = new TextToSpeech(getContext(), status -> ready = status == TextToSpeech.SUCCESS));
    }
    @PluginMethod public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!ready || tts == null) { call.reject("기기 음성을 준비하지 못했어요."); return; }
            String text = call.getString("text", "");
            int languageStatus = tts.setLanguage(Locale.forLanguageTag(call.getString("language", "ko-KR")));
            if (languageStatus < 0) { call.reject("기기에 해당 언어 음성을 설치해 주세요."); return; }
            tts.setSpeechRate(call.getFloat("rate", 0.9f));
            int status = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "malang");
            if (status == TextToSpeech.ERROR) call.reject("음성 재생 실패"); else call.resolve();
        });
    }
    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { if (tts != null) tts.stop(); call.resolve(); });
    }
    @Override protected void handleOnPause() { if (tts != null) tts.stop(); }
    @Override protected void handleOnDestroy() { if (tts != null) tts.shutdown(); }
}
