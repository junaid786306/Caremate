(function () {
  const script = document.currentScript;
  const assistant = script?.dataset.assistant || 'caremate';
  let recognition = null;
  let isListening = false;
  let currentTranscript = '';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function getAssistantReply(message) {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistant, message })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Assistant is unavailable.');
    }

    return data.reply || 'I am here with you, but I could not form a reply just now.';
  }

  async function submitToAssistant(text) {
    showTyping();

    try {
      const reply = await getAssistantReply(text);
      hideTyping();
      addMessage(escapeHtml(reply), false);
      return reply;
    } catch (error) {
      const message = error.message || 'Assistant is unavailable right now.';
      hideTyping();
      addMessage(escapeHtml(message), false);
      return message;
    }
  }

  window.sendMessage = async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage(escapeHtml(text), true);
    await submitToAssistant(text);
  };

  window.sendChip = async function sendChip(btn) {
    const text = btn.textContent.trim();
    addMessage(escapeHtml(text), true);
    btn.closest('.flex')?.remove();
    await submitToAssistant(text);
  };

  function getVoiceElements() {
    return {
      overlay: document.getElementById('voice-overlay'),
      userText: document.getElementById('voice-user-text'),
      aiText: document.getElementById('voice-ai-text'),
      ring1: document.getElementById('orb-ring-1'),
      ring2: document.getElementById('orb-ring-2'),
      inner: document.getElementById('orb-inner')
    };
  }

  function setVoiceText(user, assistantText) {
    const elements = getVoiceElements();
    if (elements.userText) elements.userText.textContent = user || '';
    if (elements.aiText) elements.aiText.textContent = assistantText || '';
  }

  function setOrbState(state) {
    const { ring1, ring2, inner } = getVoiceElements();
    if (!ring1 || !ring2) return;

    if (state === 'listening') {
      ring1.style.transform = 'scale(1.25)';
      ring2.style.transform = 'scale(1.45)';
      if (inner) inner.style.opacity = '0.25';
      return;
    }

    if (state === 'thinking') {
      ring1.style.transform = 'scale(0.95)';
      ring2.style.transform = 'scale(1.05)';
      if (inner) inner.style.opacity = '0.75';
      return;
    }

    if (state === 'speaking') {
      ring1.style.transform = 'scale(1.45)';
      ring2.style.transform = 'scale(1.7)';
      if (inner) inner.style.opacity = '0.9';
      return;
    }

    ring1.style.transform = 'scale(1)';
    ring2.style.transform = 'scale(1)';
    if (inner) inner.style.opacity = '';
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      setOrbState('idle');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setOrbState('speaking');
    utterance.onend = () => {
      setOrbState('idle');
      if (getVoiceElements().overlay && !getVoiceElements().overlay.classList.contains('pointer-events-none')) {
        const currentReply = getVoiceElements().aiText?.textContent || '';
        if (currentReply) setVoiceText('', 'Tap the orb and speak again.');
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  function createRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognizer = new SpeechRecognition();
    recognizer.lang = 'en-US';
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    return recognizer;
  }

  async function sendVoiceMessage(text) {
    addMessage(escapeHtml(text), true);
    setVoiceText(text, 'Thinking...');
    setOrbState('thinking');

    const reply = await submitToAssistant(text);
    setVoiceText('', reply);
    speak(reply);
  }

  function startVoiceListening() {
    if (isListening) return;

    window.speechSynthesis?.cancel();
    recognition = createRecognition();

    if (!recognition) {
      setVoiceText('', 'Voice input is not supported in this browser. Please type your message below.');
      setOrbState('idle');
      return;
    }

    currentTranscript = '';
    isListening = true;
    setVoiceText('', 'Listening...');
    setOrbState('listening');

    recognition.onresult = event => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }

      currentTranscript = (finalText || interim || currentTranscript).trim();
      setVoiceText(currentTranscript, finalText ? 'Thinking...' : 'Listening...');
    };

    recognition.onerror = event => {
      isListening = false;
      setOrbState('idle');
      const message = event.error === 'not-allowed'
        ? 'Microphone permission is blocked. Allow microphone access, then tap the orb again.'
        : 'I could not hear clearly. Tap the orb and try again.';
      setVoiceText('', message);
    };

    recognition.onend = () => {
      const spokenText = currentTranscript.trim();
      isListening = false;

      if (spokenText) {
        sendVoiceMessage(spokenText);
      } else {
        setVoiceText('', 'Tap the orb and speak.');
        setOrbState('idle');
      }
    };

    try {
      recognition.start();
    } catch (error) {
      isListening = false;
      setVoiceText('', 'Tap the orb and speak.');
      setOrbState('idle');
    }
  }

  window.openVoiceMode = function openVoiceMode() {
    const { overlay } = getVoiceElements();
    if (!overlay) return;
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    setVoiceText('', 'Listening...');
    startVoiceListening();
  };

  window.closeVoiceMode = function closeVoiceMode() {
    const { overlay } = getVoiceElements();
    recognition?.abort();
    window.speechSynthesis?.cancel();
    isListening = false;
    setOrbState('idle');
    if (overlay) overlay.classList.add('opacity-0', 'pointer-events-none');
  };

  window.toggleVoiceListening = function toggleVoiceListening() {
    if (isListening) {
      recognition?.stop();
      return;
    }

    startVoiceListening();
  };
})();
