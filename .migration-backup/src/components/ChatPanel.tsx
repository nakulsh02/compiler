import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, MoreVertical, User } from 'lucide-react';
import clsx from 'clsx';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
}

const commonEmojis = ['👍', '❤️', '🎉', '😂', '✅', '🤔', '👀', '🔥'];

export function ChatPanel({ messages, currentUserId, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentGroup: { date: string; messages: ChatMessage[] } | null = null;

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (!currentGroup || currentGroup.date !== msgDate) {
        currentGroup = { date: msgDate, messages: [msg] };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(msg);
      }
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="h-full flex flex-col bg-slate-800/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <span className="text-sm font-semibold text-slate-300">Team Chat</span>
        <button className="p-1 hover:bg-slate-700 rounded text-slate-400">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={group.date}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-slate-700/50" />
              <span className="text-xs text-slate-500">
                {new Date(group.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <div className="flex-1 h-px bg-slate-700/50" />
            </div>

            {group.messages.map((message, msgIndex) => {
              const isOwn = message.user_id === currentUserId;
              const showAvatar =
                msgIndex === 0 ||
                group.messages[msgIndex - 1].user_id !== message.user_id;

              return (
                <div
                  key={message.id}
                  className={clsx(
                    'flex items-start gap-2 mb-2',
                    isOwn && 'flex-row-reverse'
                  )}
                >
                  {showAvatar ? (
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0',
                        'bg-gradient-to-br from-cyan-500 to-blue-600'
                      )}
                    >
                      {message.user?.display_name?.charAt(0).toUpperCase() || (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}

                  <div
                    className={clsx(
                      'max-w-[70%] rounded-lg px-3 py-2',
                      isOwn
                        ? 'bg-cyan-500/20 text-white'
                        : 'bg-slate-700/50 text-slate-200'
                    )}
                  >
                    {showAvatar && !isOwn && (
                      <div className="text-xs text-slate-400 mb-1">
                        {message.user?.display_name || 'User'}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div
                      className={clsx(
                        'text-[10px] mt-1',
                        isOwn ? 'text-cyan-400/60' : 'text-slate-500'
                      )}
                    >
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              showEmojis
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            )}
          >
            <Smile className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              input.trim()
                ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {showEmojis && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowEmojis(false)}
            />
            <div className="absolute bottom-16 left-4 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl z-50">
              <div className="flex gap-1">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-700 rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
