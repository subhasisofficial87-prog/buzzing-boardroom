import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  nickname: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSend, nickname }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col border border-border rounded-lg bg-card overflow-hidden h-48">
      <div className="px-3 py-2 border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
        Chat
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No messages yet</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="text-xs">
            <span className="font-semibold text-foreground">
              {msg.sender === nickname ? 'You' : msg.sender}:
            </span>{' '}
            <span className="text-foreground/80">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-1 p-2 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="h-7 text-xs"
        />
        <Button size="sm" onClick={handleSend} className="h-7 text-xs px-3">
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatBox;
