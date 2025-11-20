// Custom hook for voice recording functionality

import { useState, useRef, useCallback } from 'react';

type RecorderErrorEvent = Event & { error?: DOMException };

interface UseVoiceRecordingOptions {
  onRecordingComplete: (audioBlob: Blob) => Promise<void>;
}

export const useVoiceRecording = ({ onRecordingComplete }: UseVoiceRecordingOptions) => {
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const discardRecordingRef = useRef(false);
  const pointerActiveRef = useRef(false);

  const stopVoiceRecording = useCallback((cancel = false) => {
    discardRecordingRef.current = cancel;
    pointerActiveRef.current = false;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (isRecordingVoice) {
      setIsRecordingVoice(false);
    }
    setRecordingTime(0);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch (error) {
        console.error('Failed to stop MediaRecorder:', error);
      }
    } else if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, [isRecordingVoice]);

  const startVoiceRecording = useCallback(async () => {
    if (isRecordingVoice) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      alert('Microphone access is not supported in this environment.');
      return;
    }

    if (typeof window !== 'undefined' && typeof MediaRecorder === 'undefined') {
      alert('Voice notes are not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      discardRecordingRef.current = false;

      // Try to find a supported MIME type for MediaRecorder
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const activeStream = mediaStreamRef.current;
        mediaStreamRef.current = null;

        if (activeStream) {
          activeStream.getTracks().forEach(track => track.stop());
        }

        mediaRecorderRef.current = null;

        const shouldDiscard = discardRecordingRef.current;
        discardRecordingRef.current = false;

        if (shouldDiscard) {
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        if (audioBlob.size > 0) {
          await onRecordingComplete(audioBlob);
        } else {
          console.warn('Audio blob is empty, recording may have failed');
        }
      };

      mediaRecorder.onerror = (event: RecorderErrorEvent) => {
        console.error('MediaRecorder error:', event);
        stopVoiceRecording(true);
      };

      // Start recording with timeslice to ensure data is available
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecordingVoice(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied. Please allow microphone access to record voice notes.');
      stopVoiceRecording(true);
    }
  }, [isRecordingVoice, onRecordingComplete, stopVoiceRecording]);

  const handleVoiceButtonMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pointerActiveRef.current = true;
    void startVoiceRecording();
  }, [startVoiceRecording]);

  const handleVoiceButtonMouseUp = useCallback(() => {
    if (pointerActiveRef.current) {
      pointerActiveRef.current = false;
      stopVoiceRecording(false);
    }
  }, [stopVoiceRecording]);

  const handleVoiceButtonMouseLeave = useCallback(() => {
    if (pointerActiveRef.current) {
      pointerActiveRef.current = false;
      stopVoiceRecording(true);
    }
  }, [stopVoiceRecording]);

  const handleVoiceButtonTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    pointerActiveRef.current = true;
    void startVoiceRecording();
  }, [startVoiceRecording]);

  const handleVoiceButtonTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (pointerActiveRef.current) {
      pointerActiveRef.current = false;
      stopVoiceRecording(false);
    }
  }, [stopVoiceRecording]);

  const handleVoiceButtonTouchCancel = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (pointerActiveRef.current) {
      pointerActiveRef.current = false;
      stopVoiceRecording(true);
    }
  }, [stopVoiceRecording]);

  return {
    isRecordingVoice,
    recordingTime,
    handleVoiceButtonMouseDown,
    handleVoiceButtonMouseUp,
    handleVoiceButtonMouseLeave,
    handleVoiceButtonTouchStart,
    handleVoiceButtonTouchEnd,
    handleVoiceButtonTouchCancel,
  };
};

