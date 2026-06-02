import React, { useState } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send } from 'lucide-react';

const CustomerChat = ({ clientId, token }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi 👋 How can I help you today?'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      role: 'user',
      text: message
    };

    setMessages(prev => [...prev, userMessage]);

    const currentMessage = message;
    setMessage('');
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/chat`,
        {
          message: currentMessage
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: res.data.reply
        }
      ]);

    } catch (err) {
      console.error(err);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Something went wrong.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 bg-action-primary text-white p-4 rounded-full shadow-xl"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-5 w-80 h-[500px] bg-white rounded-2xl shadow-2xl border z-50 flex flex-col">

          {/* Header */}
          <div className="p-4 border-b font-bold text-white bg-action-primary rounded-t-2xl">
            AI Assistant
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[80%] p-3 rounded-2xl text-sm
                  ${msg.role === 'user'
                    ? 'ml-auto bg-action-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                  }`}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className="bg-gray-100 text-sm p-3 rounded-2xl w-fit">
                Typing...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask something..."
              className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  sendMessage();
                }
              }}
            />

            <button
              onClick={sendMessage}
              className="bg-action-primary text-white p-2 rounded-xl"
            >
              <Send size={18} />
            </button>
          </div>

        </div>
      )}
    </>
  );
};

export default CustomerChat;