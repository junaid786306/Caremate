import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AnimatedAssistantOrb, { type AssistantOrbState } from './AnimatedAssistantOrb';
import './CaremateVoiceAssistant.css';

type RecognitionEvent = Event & {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

const fallbackReply = 'I could not reach the assistant right now. Please try again in a moment.';

function CaremateVoiceAssistant() {
  const [state, setState] = useState<AssistantOrbState>('idle');
  const [userText, setUserText] = useState('');
  const [assistantText, setAssistantText] = useState('How can I help you today?');
  const [input, setInput] = useState('');
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const transcriptRef = useRef('');
  const aliveRef = useRef(true);

  useEffect(() => () => {
    aliveRef.current = false;
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const speakReply = (reply: string) => {
    if (!aliveRef.current) return;
    setAssistantText(reply);
    setState('speaking');
    if (!('speechSynthesis' in window)) {
      globalThis.setTimeout(() => aliveRef.current && setState('idle'), 1400);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(reply);
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    utterance.onend = () => aliveRef.current && setState('idle');
    utterance.onerror = () => aliveRef.current && setState('idle');
    window.speechSynthesis.speak(utterance);
  };

  const askAssistant = async (message: string) => {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    recognitionRef.current?.abort();
    setUserText(cleanMessage);
    setAssistantText('Thinking...');
    setState('speaking');
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant: 'caremate', message: cleanMessage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || fallbackReply);
      speakReply(data.reply || fallbackReply);
    } catch (error) {
      speakReply(error instanceof Error ? error.message : fallbackReply);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState('idle');
    setAssistantText('Tap the orb when you are ready.');
  };

  const startListening = () => {
    window.speechSynthesis?.cancel();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setAssistantText('Voice listening is unavailable here. You can type below.');
      setState('idle');
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    transcriptRef.current = '';
    setUserText('');
    setAssistantText('Listening...');
    setState('listening');

    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      transcriptRef.current = transcript.trim();
      setUserText(transcriptRef.current);
    };
    recognition.onerror = () => {
      setState('idle');
      setAssistantText('I could not hear that. Tap to try again.');
    };
    recognition.onend = () => {
      const transcript = transcriptRef.current;
      recognitionRef.current = null;
      if (transcript) void askAssistant(transcript);
      else setState('idle');
    };
    try {
      recognition.start();
    } catch {
      setState('idle');
      setAssistantText('Microphone access could not start.');
    }
  };

  const handleOrbClick = () => {
    if (state === 'listening') stopListening();
    else if (state === 'speaking') {
      window.speechSynthesis?.cancel();
      setState('idle');
      setAssistantText('Tap the orb when you are ready.');
    } else startListening();
  };

  const submitTypedMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput('');
    void askAssistant(message);
  };

  const status = state === 'listening' ? 'Listening...' : state === 'speaking' ? 'Speaking...' : 'Tap to talk';

  return (
    <main className={`voice-assistant voice-assistant--${state}`}>
      <header className="voice-assistant__header">
        <button className="voice-control voice-control--quiet" type="button" onClick={() => { window.location.href = 'home_dashboard.html'; }} aria-label="Go back">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        </button>
        <div className="voice-assistant__identity">
          <strong>Caremate Assistant</strong>
        </div>
        <span className="voice-assistant__online" aria-label="Assistant is ready" />
      </header>

      <section className="voice-assistant__stage" aria-live="polite">
        <div className="voice-assistant__halo" aria-hidden="true" />
        <AnimatedAssistantOrb state={state} onClick={handleOrbClick} size={224} />
        <div className="voice-assistant__copy">
          {userText && <p className="voice-assistant__user-text">“{userText}”</p>}
          <p className="voice-assistant__reply">{assistantText}</p>
        </div>
        <div className={`voice-assistant__status voice-assistant__status--${state}`}>
          <span />
          {status}
        </div>
      </section>

      <footer className="voice-assistant__footer">
        <form className="voice-assistant__chatbar" onSubmit={submitTypedMessage}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Caremate Assistant" aria-label="Message Caremate Assistant" />
          <button className={`voice-assistant__chat-mic voice-assistant__chat-mic--${state}`} type="button" onClick={handleOrbClick} aria-label={status}>
            <span className="material-symbols-outlined" aria-hidden="true">mic</span>
          </button>
          <button className="voice-assistant__chat-send" type="submit" aria-label="Send message" disabled={!input.trim()}>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
          </button>
        </form>
      </footer>
    </main>
  );
}

const root = document.getElementById('caremate-voice-assistant-root');
if (root) createRoot(root).render(<CaremateVoiceAssistant />);
