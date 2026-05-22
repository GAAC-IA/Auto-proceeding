"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "stopped";

interface UseAudioRecorderOptions {
  /** 녹음 종료 시 호출되는 콜백. 단일 전체 오디오 Blob 전달 */
  onStop?: (blob: Blob) => void;
  /** 에러 발생 시 호출 */
  onError?: (error: string) => void;
}

export function useAudioRecorder({
  onStop,
  onError,
}: UseAudioRecorderOptions) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 경과 시간 타이머
  const startElapsedTimer = useCallback(() => {
    recordingStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - recordingStartRef.current);
    }, 500);
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setState("recording");
      startElapsedTimer();

      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mr.mimeType });
        onStop?.(audioBlob);
        chunksRef.current = [];
      };

      mr.start();
      mediaRecorderRef.current = mr;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "마이크 접근 권한이 거부되었습니다.";
      onError?.(msg);
      setState("idle");
    }
  }, [onStop, onError, startElapsedTimer]);

  const stopRecording = useCallback(() => {
    stopElapsedTimer();

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    setState("stopped");
  }, [stopElapsedTimer]);

  const resetRecorder = useCallback(() => {
    stopRecording();
    setElapsedMs(0);
    setState("idle");
  }, [stopRecording]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    state,
    elapsedMs,
    startRecording,
    stopRecording,
    resetRecorder,
    isRecording: state === "recording",
  };
}
