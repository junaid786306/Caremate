import React, { useEffect, useRef, type CSSProperties } from 'react';
import './AnimatedAssistantOrb.css';

export type AssistantOrbState = 'idle' | 'listening' | 'speaking';

export interface AnimatedAssistantOrbProps {
  state: AssistantOrbState;
  onClick: () => void;
  size?: number;
}

type Particle = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
  opacity: number;
};

export function AnimatedAssistantOrb({ state, onClick, size = 170 }: AnimatedAssistantOrbProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const volumeRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state !== 'listening' || !navigator.mediaDevices?.getUserMedia) {
      volumeRef.current = 0;
      return;
    }

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let audioFrame = 0;
    let cancelled = false;

    const readMicrophone = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.82;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);

        const readLevel = () => {
          if (!analyser) return;
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / samples.length);
          volumeRef.current += (Math.min(1, rms * 7.5) - volumeRef.current) * 0.28;
          audioFrame = requestAnimationFrame(readLevel);
        };
        readLevel();
      } catch {
        volumeRef.current = 0.12;
      }
    };

    readMicrophone();
    return () => {
      cancelled = true;
      cancelAnimationFrame(audioFrame);
      stream?.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== 'closed') void audioContext.close();
      volumeRef.current = 0;
    };
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let width = 170;
    let height = 170;
    const particles: Particle[] = Array.from({ length: 84 }, (_, index) => ({
      x: 0.12 + ((index * 37) % 76) / 100,
      y: 0.18 + ((index * 53) % 62) / 100,
      radius: 0.55 + (index % 4) * 0.28,
      speed: 0.12 + (index % 7) * 0.025,
      phase: index * 0.73,
      opacity: 0.18 + (index % 5) * 0.08,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width || 170;
      height = rect.height || 170;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const waveY = (x: number, time: number, layer: number, amplitude: number) => {
      const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, x / width)));
      return height * 0.52
        + Math.sin(x * (0.029 + layer * 0.0022) + time * (1.18 + layer * 0.07) + layer) * amplitude * envelope
        + Math.sin(x * 0.064 - time * 0.82 + layer * 0.42) * amplitude * 0.34 * envelope;
    };

    const draw = (timestamp: number) => {
      const time = timestamp / 1000;
      const currentState = stateRef.current;
      const listeningLevel = currentState === 'listening' ? volumeRef.current : 0;
      const voiceLevel = currentState === 'listening'
        ? listeningLevel
        : currentState === 'speaking'
          ? 0.52 + Math.sin(time * 5.2) * 0.16
          : 0.16 + Math.sin(time * 1.45) * 0.04;
      buttonRef.current?.style.setProperty('--orb-level', Math.max(0, voiceLevel).toFixed(3));
      const baseAmplitude = currentState === 'speaking' ? 42 : currentState === 'listening' ? 28 + listeningLevel * 44 : 34;
      const speed = currentState === 'listening' ? 1.82 : currentState === 'speaking' ? 1.58 : 0.86;
      const t = time * speed;

      context.clearRect(0, 0, width, height);
      const background = context.createRadialGradient(width * 0.4, height * 0.34, 3, width * 0.5, height * 0.52, width * 0.62);
      background.addColorStop(0, 'rgba(64, 92, 190, 0.76)');
      background.addColorStop(0.43, 'rgba(49, 28, 119, 0.88)');
      background.addColorStop(0.76, 'rgba(21, 22, 82, 0.91)');
      background.addColorStop(1, 'rgba(11, 15, 52, 0.94)');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      const movingLight = context.createRadialGradient(
        width * (0.42 + Math.sin(t * 0.34) * 0.13),
        height * (0.42 + Math.cos(t * 0.29) * 0.11),
        0,
        width * 0.5,
        height * 0.5,
        width * 0.58,
      );
      movingLight.addColorStop(0, `rgba(48, 235, 255, ${0.26 + voiceLevel * 0.2})`);
      movingLight.addColorStop(0.42, 'rgba(101, 66, 241, 0.2)');
      movingLight.addColorStop(0.72, 'rgba(238, 73, 255, 0.16)');
      movingLight.addColorStop(1, 'rgba(33, 20, 90, 0)');
      context.fillStyle = movingLight;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalCompositeOperation = 'lighter';
      for (const particle of particles) {
        const driftX = Math.sin(t * particle.speed + particle.phase) * 5;
        const driftY = Math.cos(t * particle.speed * 0.8 + particle.phase) * 4;
        const px = particle.x * width + driftX;
        const py = particle.y * height + driftY;
        const pulse = 0.65 + Math.sin(t * 1.4 + particle.phase) * 0.35;
        context.beginPath();
        context.fillStyle = `rgba(166, 92, 255, ${particle.opacity * pulse})`;
        context.shadowBlur = 7;
        context.shadowColor = '#a45cff';
        context.arc(px, py, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      for (let row = 0; row < 7; row += 1) {
        const rowAmplitude = 25 + row * 2.8 + voiceLevel * 18;
        for (let x = 12; x < width - 10; x += 5) {
          const envelope = Math.sin(Math.PI * x / width);
          const y = height * 0.5
            + (row - 3) * 7.2
            + Math.sin(x * (0.043 + row * 0.0018) + t * (0.52 + row * 0.06) + row * 0.7) * rowAmplitude * envelope;
          context.beginPath();
          context.fillStyle = `hsla(${250 + row * 8 + Math.sin(t * 0.3) * 12}, 100%, 72%, ${0.11 + row * 0.012})`;
          context.shadowBlur = 5;
          context.shadowColor = row < 3 ? '#55e9ff' : '#b25cff';
          context.arc(x, y, 0.7 + (row % 2) * 0.22, 0, Math.PI * 2);
          context.fill();
        }
      }

      const ribbonPalette = [
        ['rgba(70, 226, 255, 0.06)', 'rgba(115, 245, 255, 0.32)'],
        ['rgba(74, 146, 255, 0.06)', 'rgba(80, 187, 255, 0.28)'],
        ['rgba(117, 77, 255, 0.06)', 'rgba(151, 104, 255, 0.29)'],
        ['rgba(226, 70, 255, 0.05)', 'rgba(237, 104, 255, 0.26)'],
        ['rgba(48, 218, 255, 0.05)', 'rgba(95, 231, 255, 0.3)'],
        ['rgba(139, 72, 255, 0.05)', 'rgba(187, 121, 255, 0.27)'],
      ];
      ribbonPalette.forEach((palette, layer) => {
        const offset = (layer - 2.5) * 8.2;
        context.beginPath();
        for (let x = -3; x <= width + 3; x += 2) {
          const y = waveY(x, t + layer * 0.16, layer + 2, baseAmplitude * (0.74 + layer * 0.035)) + offset;
          const thickness = 3.1 + Math.sin(x * 0.045 + t + layer) * 1.5;
          if (x === -3) context.moveTo(x, y - thickness);
          else context.lineTo(x, y - thickness);
        }
        for (let x = width + 3; x >= -3; x -= 2) {
          const y = waveY(x, t + layer * 0.16, layer + 2, baseAmplitude * (0.74 + layer * 0.035)) + offset;
          const thickness = 3.1 + Math.sin(x * 0.045 + t + layer) * 1.5;
          context.lineTo(x, y + thickness);
        }
        context.closePath();
        const layerGradient = context.createLinearGradient(0, 0, width, 0);
        layerGradient.addColorStop(0, palette[0]);
        layerGradient.addColorStop(0.5, palette[1]);
        layerGradient.addColorStop(1, palette[0]);
        context.fillStyle = layerGradient;
        context.shadowBlur = 11 + voiceLevel * 9;
        context.shadowColor = layer < 2 ? '#54eaff' : '#9b5cff';
        context.fill();
      });

      for (let layer = 0; layer < 18; layer += 1) {
        context.beginPath();
        for (let x = -2; x <= width + 2; x += 2) {
          const depth = (layer - 6.5) * 1.8;
          const y = waveY(x, t + layer * 0.03, layer, baseAmplitude * (0.72 + layer * 0.018)) + depth;
          if (x === -2) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        const hue = 198 + layer * 5;
        context.strokeStyle = `hsla(${hue}, 100%, ${67 + (layer % 3) * 5}%, ${0.14 + layer * 0.012})`;
        context.lineWidth = 0.85;
        context.shadowBlur = 8;
        context.shadowColor = layer < 7 ? '#39ecff' : '#945cff';
        context.stroke();
      }

      const ribbonTop: Array<[number, number]> = [];
      const ribbonBottom: Array<[number, number]> = [];
      for (let x = -3; x <= width + 3; x += 2) {
        const center = waveY(x, t, 0, baseAmplitude);
        const thickness = 5.2 + Math.sin(x * 0.052 - t * 1.3) * 2.7 + baseAmplitude * 0.085;
        ribbonTop.push([x, center - thickness]);
        ribbonBottom.push([x, center + thickness]);
      }

      const ribbonGradient = context.createLinearGradient(0, 0, width, 0);
      ribbonGradient.addColorStop(0, 'rgba(62, 213, 255, 0.16)');
      ribbonGradient.addColorStop(0.22, 'rgba(103, 246, 255, 0.88)');
      ribbonGradient.addColorStop(0.5, 'rgba(235, 255, 255, 0.98)');
      ribbonGradient.addColorStop(0.74, 'rgba(107, 223, 255, 0.9)');
      ribbonGradient.addColorStop(1, 'rgba(181, 82, 255, 0.24)');
      context.beginPath();
      ribbonTop.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      [...ribbonBottom].reverse().forEach(([x, y]) => context.lineTo(x, y));
      context.closePath();
      context.fillStyle = ribbonGradient;
      context.shadowBlur = currentState === 'idle' ? 18 : 26;
      context.shadowColor = '#62f3ff';
      context.fill();

      context.beginPath();
      ribbonTop.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.strokeStyle = 'rgba(238, 255, 255, 0.95)';
      context.lineWidth = 1.15;
      context.shadowBlur = 14;
      context.shadowColor = '#83f7ff';
      context.stroke();
      context.restore();

      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      className={`animated-assistant-orb animated-assistant-orb--${state}`}
      style={{ '--orb-size': `${size}px` } as CSSProperties}
      type="button"
      onClick={onClick}
      aria-label="Open Caremate Assistant"
      aria-pressed={state !== 'idle'}
    >
      <span className="animated-assistant-orb__glow" aria-hidden="true" />
      <span className="animated-assistant-orb__ring" aria-hidden="true" />
      <span className="animated-assistant-orb__ring animated-assistant-orb__ring--second" aria-hidden="true" />
      <span className="animated-assistant-orb__sphere">
        <canvas ref={canvasRef} className="animated-assistant-orb__canvas" aria-hidden="true" />
        <span className="animated-assistant-orb__reflection" aria-hidden="true" />
      </span>
    </button>
  );
}

export default AnimatedAssistantOrb;
