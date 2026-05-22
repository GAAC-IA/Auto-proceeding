"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "stopped";

export interface AudioSegment {
  blob: Blob;
  index: number;
  startTime: number; // ms since recording started
}

interface UseAudioRecorderOptions {
  /** 세그먼트 분리 간격 (ms). 기본 30초 */
  segmentIntervalMs?: number;
  /** 새 세그먼트가 준비될 때마다 호출 */
  onSegment: (segment: AudioSegment) => void;
  /** 에러 발생 시 호출 */
  onError?: (error: string) => void;
}

export function useAudioRecorder({
  segmentIntervalMs = 30_000,
  onSegment,
  onError,
}: UseAudioRecorderOptions) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const segmentIndexRef = useRef(0);
  const recordingStartRef = useRef(0);
  const segmentStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  /** 현재 MediaRecorder를 멈추고 새 세그먼트 녹음을 시작한다 */
  const rotateSegment = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;
    // 현재 세그먼트 종료 → ondataavailable 발생
    mr.stop();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      segmentIndexRef.current = 0;
      setState("recording");
      startElapsedTimer();

      const launchSegment = () => {
        const mr = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm",
        });

        const segStart = Date.now() - recordingStartRef.current;
        segmentStartRef.current = segStart;

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            onSegment({
              blob: e.data,
              index: segmentIndexRef.current++,
              startTime: segStart,
            });
          }

          // 스트림이 아직 살아있으면 다음 세그먼트 시작
          if (streamRef.current && streamRef.current.active) {
            launchSegment();
          }
        };

        mr.start();
        mediaRecorderRef.current = mr;
      };

      launchSegment();

      // 세그먼트 교체 타이머
      segmentTimerRef.current = setInterval(() => {
        rotateSegment();
      }, segmentIntervalMs);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "마이크 접근 권한이 거부되었습니다.";
      onError?.(msg);
      setState("idle");
    }
  }, [segmentIntervalMs, onSegment, onError, startElapsedTimer, rotateSegment]);

  const stopRecording = useCallback(() => {
    // 세그먼트 교체 타이머 해제
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    stopElapsedTimer();

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      // ondataavailable 에서 스트림이 inactive이면 재시작 안함
      streamRef.current?.getTracks().forEach((t) => t.stop());
      mr.stop();
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }

    streamRef.current = null;
    mediaRecorderRef.current = null;
    setState("stopped");
  }, [stopElapsedTimer]);

  const resetRecorder = useCallback(() => {
    stopRecording();
    setElapsedMs(0);
    segmentIndexRef.current = 0;
    setState("idle");
  }, [stopRecording]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
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
