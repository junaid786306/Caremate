import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AnimatedAssistantOrb, { type AssistantOrbState } from './AnimatedAssistantOrb';

declare global {
  interface Window {
    openCarematePopup?: () => void;
  }
}

function AssistantOrbMount() {
  const [state, setState] = useState<AssistantOrbState>('idle');

  useEffect(() => {
    const updateState = (event: Event) => {
      const detail = (event as CustomEvent<{ state: AssistantOrbState }>).detail;
      if (detail?.state) setState(detail.state);
    };
    window.addEventListener('caremate-orb-state', updateState);
    return () => window.removeEventListener('caremate-orb-state', updateState);
  }, []);

  useEffect(() => {
    const subtitle = document.getElementById('caremate-assistant-subtitle');
    if (subtitle) {
      subtitle.textContent = state === 'listening'
        ? 'Listening...'
        : state === 'speaking'
          ? 'Speaking...'
          : 'Tap to talk';
    }
  }, [state]);

  return (
    <AnimatedAssistantOrb
      state={state}
      onClick={() => { window.location.href = 'caremate_voice_assistant.html'; }}
    />
  );
}

const mount = document.getElementById('caremate-assistant-orb-root');
if (mount) createRoot(mount).render(<AssistantOrbMount />);
