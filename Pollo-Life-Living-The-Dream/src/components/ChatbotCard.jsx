import { useMemo, useState } from 'react';
import Card from './Card';
import { api } from '../api/client';

export default function ChatbotCard({ data }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I’m your finance companion. What would you like to understand?' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const context = useMemo(
    () =>
      data
        ? `The user's current dashboard summary is: monthly income ${data.profile.monthlyIncome}, monthly expenses ${data.profile.monthlyExpenses}, monthly debt payments ${data.profile.monthlyDebtPayments}, savings balance ${data.profile.savingsBalance}, and credit balance ${data.profile.creditBalance}.`
        : '',
    [data],
  );

  const send = async (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setError('');
    setBusy(true);
    try {
      const result = await api('/chat', {
        method: 'POST',
        body: {
          messages: [
            { role: 'system', content: `You are a concise, supportive personal-finance assistant. Do not invent account facts. ${context}` },
            ...next,
          ],
        },
      });
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      setError(err.message || 'Could not reach the chatbot. Start the chatbot server and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Ask your finance companion" area="chat">
      <div className="chatbot-messages" aria-live="polite">
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`} className={`chatbot-message ${message.role}`}>
            {message.content}
          </p>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="chatbot-form" onSubmit={send}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your money…"
          aria-label="Ask your finance companion"
          disabled={busy}
        />
        <button type="submit" className="action" disabled={busy || !input.trim()}>
          {busy ? '…' : 'Ask'}
        </button>
      </form>
    </Card>
  );
}
