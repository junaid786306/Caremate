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

type ChatHistoryItem = {
  id: string;
  title: string;
  user: string;
  assistant: string;
  createdAt: string;
};

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
  const [typingOpen, setTypingOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('caremate-chat-history') || '[]');
    } catch {
      return [];
    }
  });
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const transcriptRef = useRef('');
  const aliveRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceModeOpenedAtRef = useRef(0);
  const displayName = localStorage.getItem('user_full_name') || localStorage.getItem('user_username') || 'Shreya';

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

  const saveConversation = (message: string, reply: string) => {
    const item: ChatHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: message.length > 42 ? `${message.slice(0, 42)}...` : message,
      user: message,
      assistant: reply,
      createdAt: new Date().toISOString(),
    };
    setChatHistory((current) => {
      const updated = [item, ...current].slice(0, 30);
      localStorage.setItem('caremate-chat-history', JSON.stringify(updated));
      return updated;
    });
  };

  const askAssistant = async (message: string) => {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    recognitionRef.current?.abort();
    setUserText(cleanMessage);
    setAssistantText('Thinking...');
    setState('processing');
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant: 'caremate', message: cleanMessage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || fallbackReply);
      const reply = data.reply || fallbackReply;
      saveConversation(cleanMessage, reply);
      speakReply(reply);
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
    // Ignore the same touch/click that switched from the keyboard composer.
    // Listening must always require a separate, deliberate tap.
    if (Date.now() - voiceModeOpenedAtRef.current < 700) return;
    if (state === 'listening') stopListening();
    else if (state === 'speaking') {
      window.speechSynthesis?.cancel();
      setState('idle');
      setAssistantText('Tap the orb when you are ready.');
    } else if (state !== 'processing') startListening();
  };

  const enterVoiceMode = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setTypingOpen(false);
    setVoiceMode(true);
    setState('idle');
    voiceModeOpenedAtRef.current = Date.now();
    setAssistantText('How can I help you today?');
  };

  const closeVoiceMode = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setState('idle');
    setVoiceMode(false);
    setTypingOpen(false);
    if (!userText) setAssistantText('How can I help you today?');
  };

  const submitTypedMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput('');
    setTypingOpen(false);
    void askAssistant(message);
  };

  const openKeyboard = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setState('idle');
    setVoiceMode(false);
    setTypingOpen(true);
    globalThis.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const startNewChat = () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setState('idle');
    setUserText('');
    setAssistantText('How can I help you today?');
    setInput('');
    setTypingOpen(false);
    setVoiceMode(false);
    setHistoryOpen(false);
  };

  const openHistoryItem = (item: ChatHistoryItem) => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setState('idle');
    setUserText(item.user);
    setAssistantText(item.assistant);
    setVoiceMode(false);
    setHistoryOpen(false);
  };

  const clearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('caremate-chat-history');
  };

  const status = state === 'listening'
    ? 'Listening...'
    : state === 'processing'
      ? 'Thinking...'
      : state === 'speaking'
        ? 'Speaking...'
        : 'Tap to talk';
  const showGreeting = !voiceMode && !typingOpen && !userText;

  return (
    <main className={`voice-assistant voice-assistant--${state} ${voiceMode ? 'voice-assistant--voice-mode' : ''} ${typingOpen ? 'voice-assistant--typing' : ''}`}>
      <header className="voice-assistant__header">
        <div className="voice-assistant__toolbar">
          <button className="voice-control voice-control--history" type="button" onClick={() => setHistoryOpen(true)} aria-label="Open chats and start a new chat">
            <span className="material-symbols-outlined" aria-hidden="true">view_sidebar</span>
          </button>
        </div>
        {showGreeting && (
          <div className="voice-assistant__profile">
            <div>
              <span>Good Evening,</span>
              <strong>{displayName}</strong>
            </div>
          </div>
        )}
      </header>

      <section className="voice-assistant__stage" aria-live="polite">
        {!typingOpen && (voiceMode || userText || assistantText !== 'How can I help you today?') && (
          <div className="voice-assistant__copy">
            {userText && <p className="voice-assistant__user-text">"{userText}"</p>}
            <p className="voice-assistant__reply">{assistantText}</p>
          </div>
        )}
      </section>

      <footer className="voice-assistant__footer">
        {typingOpen ? (
          <form className="voice-assistant__composer" onSubmit={submitTypedMessage}>
            <AnimatedAssistantOrb state="idle" onClick={enterVoiceMode} size={38} tone="soft" />
            <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask CareMate Assistant" aria-label="Message CareMate Assistant" />
            <button type="submit" aria-label="Send message" disabled={!input.trim()}>
              <span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
            </button>
          </form>
        ) : (
          <nav className="voice-assistant__nav" aria-label="Assistant navigation">
            {voiceMode ? (
              <button className="voice-assistant__mode-control" type="button" onClick={closeVoiceMode} aria-label="Close voice mode">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            ) : (
              <button type="button" onClick={() => { window.location.href = 'home_dashboard.html'; }} aria-label="Home">
                <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
              </button>
            )}
            <div className="voice-assistant__nav-orb">
              <AnimatedAssistantOrb state={state} onClick={voiceMode ? handleOrbClick : enterVoiceMode} size={voiceMode ? 116 : 68} tone="soft" />
            </div>
            <button type="button" onClick={openKeyboard} aria-label="Type a message">
              <span className="material-symbols-outlined" aria-hidden="true">keyboard</span>
            </button>
          </nav>
        )}
      </footer>

      <div className={`chat-history ${historyOpen ? 'chat-history--open' : ''}`} aria-hidden={!historyOpen}>
        <button className="chat-history__backdrop" type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" />
        <aside className="chat-history__panel" aria-label="Chat history">
          <header className="chat-history__header">
            <div>
              <span>CAREMATE</span>
              <h2>Chat history</h2>
            </div>
            <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>

          <button className="chat-history__new" type="button" onClick={startNewChat}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            New chat
          </button>

          <div className="chat-history__list">
            {chatHistory.length === 0 ? (
              <div className="chat-history__empty">
                <span className="material-symbols-outlined" aria-hidden="true">chat_bubble_outline</span>
                <strong>No conversations yet</strong>
                <p>Your Caremate chats will appear here.</p>
              </div>
            ) : chatHistory.map((item) => (
              <button className="chat-history__item" type="button" key={item.id} onClick={() => openHistoryItem(item)}>
                <span className="material-symbols-outlined" aria-hidden="true">chat_bubble</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small>
                </span>
              </button>
            ))}
          </div>

          {chatHistory.length > 0 && (
            <button className="chat-history__clear" type="button" onClick={clearHistory}>
              <span className="material-symbols-outlined" aria-hidden="true">delete_outline</span>
              Clear history
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}

const root = document.getElementById('caremate-voice-assistant-root');
if (root) createRoot(root).render(<CaremateVoiceAssistant />);
