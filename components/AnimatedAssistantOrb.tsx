import React, { useEffect, useRef, type CSSProperties } from 'react';
import './AnimatedAssistantOrb.css';

export type AssistantOrbState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface AnimatedAssistantOrbProps {
  state: AssistantOrbState;
  onClick: () => void;
  size?: number;
  tone?: 'deep' | 'soft';
}

type OrbStyle = CSSProperties & {
  '--orb-size': string;
  '--orb-scale': number;
  '--audio-level': number;
};

export function AnimatedAssistantOrb({ state, onClick, size = 170, tone = 'deep' }: AnimatedAssistantOrbProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state !== 'listening' || !navigator.mediaDevices?.getUserMedia) return;

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animationFrame = 0;
    let cancelled = false;
    let smoothedLevel = 0;

    const connectMicrophone = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.82;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);

        const updateAudioLevel = () => {
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            sum += normalized * normalized;
          }
          const level = Math.min(1, Math.sqrt(sum / samples.length) * 7.5);
          smoothedLevel += (level - smoothedLevel) * 0.22;
          const element = buttonRef.current;
          if (element) {
            element.style.setProperty('--audio-level', smoothedLevel.toFixed(3));
            element.style.setProperty('--orb-scale', (1.018 + smoothedLevel * 0.075).toFixed(3));
          }
          animationFrame = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
      } catch {
        buttonRef.current?.style.setProperty('--orb-scale', '1.025');
      }
    };

    void connectMicrophone();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== 'closed') void audioContext.close();
      buttonRef.current?.style.setProperty('--audio-level', '0');
      buttonRef.current?.style.setProperty('--orb-scale', '1');
    };
  }, [state]);

  const style: OrbStyle = {
    '--orb-size': `${size}px`,
    '--orb-scale': 1,
    '--audio-level': 0,
  };

  return (
    <button
      ref={buttonRef}
      className={`animated-assistant-orb animated-assistant-orb--${state} animated-assistant-orb--${tone}`}
      style={style}
      type="button"
      onClick={onClick}
      aria-label={state === 'listening' ? 'Stop listening' : 'Open Caremate Assistant'}
    >
      <span className="animated-assistant-orb__aura" aria-hidden="true" />
      <span className="animated-assistant-orb__pulse animated-assistant-orb__pulse--one" aria-hidden="true" />
      <span className="animated-assistant-orb__pulse animated-assistant-orb__pulse--two" aria-hidden="true" />
      <span className="animated-assistant-orb__pulse animated-assistant-orb__pulse--three" aria-hidden="true" />
      <span className="animated-assistant-orb__sphere" aria-hidden="true">
        <span className="animated-assistant-orb__material">
          {Array.from({ length: 8 }, (_, index) => (
            <span className={`animated-assistant-orb__blob animated-assistant-orb__blob--${index + 1}`} key={index} />
          ))}
        </span>
        <span className="animated-assistant-orb__depth" />
        <span className="animated-assistant-orb__refraction" />
        <span className="animated-assistant-orb__highlight" />
        <span className="animated-assistant-orb__sparkle animated-assistant-orb__sparkle--one" />
        <span className="animated-assistant-orb__sparkle animated-assistant-orb__sparkle--two" />
      </span>
    </button>
  );
}

export default AnimatedAssistantOrb;
