"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "stopped";
export type MicrophonePermissionState =
  | "unknown"
  | "unsupported"
  | "prompt"
  | "requesting"
  | "granted"
  | "denied";

interface UseAudioRecorderOptions {
  onStop?: (blob: Blob) => void;
  onError?: (error: string) => void;
}

function getRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return (
    ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType)
    ) ?? ""
  );
}

function toPermissionState(state: PermissionState): MicrophonePermissionState {
  if (state === "granted" || state === "denied" || state === "prompt") {
    return state;
  }

  return "unknown";
}

export function useAudioRecorder({ onStop, onError }: UseAudioRecorderOptions) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [permissionState, setPermissionState] =
    useState<MicrophonePermissionState>("unknown");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPermissionState = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setPermissionState("unsupported");
      return "unsupported";
    }

    if (!navigator.permissions?.query) {
      setPermissionState("prompt");
      return "prompt";
    }

    try {
      const status = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      const nextState = toPermissionState(status.state);
      setPermissionState(nextState);

      status.onchange = () => {
        setPermissionState(toPermissionState(status.state));
      };

      return nextState;
    } catch {
      setPermissionState("prompt");
      return "prompt";
    }
  }, []);

  const startElapsedTimer = useCallback(() => {
    recordingStartRef.current = Date.now();
    setElapsedMs(0);
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
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setPermissionState("unsupported");
      onError?.("이 브라우저에서는 마이크 녹음을 지원하지 않습니다.");
      return;
    }

    try {
      setPermissionState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState("granted");

      streamRef.current = stream;
      chunksRef.current = [];
      setState("recording");
      startElapsedTimer();

      const mimeType = getRecorderMimeType();
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        chunksRef.current = [];
        onStop?.(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (error: unknown) {
      const isDenied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");

      setPermissionState(isDenied ? "denied" : "prompt");
      setState("idle");
      stopElapsedTimer();

      onError?.(
        isDenied
          ? "마이크 권한이 거부되었습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용한 뒤 다시 시도해 주세요."
          : error instanceof Error
            ? error.message
            : "마이크를 시작할 수 없습니다."
      );
    }
  }, [onStop, onError, startElapsedTimer, stopElapsedTimer]);

  const stopRecording = useCallback(() => {
    stopElapsedTimer();

    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setState("stopped");
  }, [stopElapsedTimer]);

  const resetRecorder = useCallback(() => {
    stopRecording();
    setElapsedMs(0);
    setState("idle");
  }, [stopRecording]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshPermissionState();
    }, 0);

    return () => {
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [refreshPermissionState]);

  return {
    state,
    elapsedMs,
    permissionState,
    refreshPermissionState,
    startRecording,
    stopRecording,
    resetRecorder,
    isRecording: state === "recording",
  };
}
