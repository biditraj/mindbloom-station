import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageCircle, Send, Users, Heart, Shield, Info } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  room_id: string;
  created_at: string;
  is_anonymous: boolean;
}

const PeerSupportChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentRoom, setCurrentRoom] = useState<string>('general');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user) {
      connectToChat();
    }
    return () => {
      // Cleanup subscription
      supabase.removeAllChannels();
    };
  }, [user, currentRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectToChat = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch existing messages
      const { data: existingMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', currentRoom)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching messages:', error);
      } else if (existingMessages) {
        setMessages(existingMessages);
      }

      // Set up real-time subscription
      const channel = supabase
        .channel('chat-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${currentRoom}`
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe((status) => {
          setConnected(status === 'SUBSCRIBED');
        });

      toast({
        title: "Connected to peer support",
        description: "You are now connected anonymously with peers"
      });

    } catch (error) {
      console.error('Error connecting to chat:', error);
      toast({
        title: "Connection failed",
        description: "Unable to connect to chat",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          content: newMessage.trim(),
          room_id: currentRoom,
          is_anonymous: true
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnonymousName = (senderId: string, index: number) => {
    // Generate consistent anonymous names based on sender ID
    const colors = ['Blue', 'Green', 'Purple', 'Orange', 'Pink', 'Teal'];
    const animals = ['Butterfly', 'Dove', 'Fox', 'Bear', 'Owl', 'Deer'];
    
    const colorIndex = senderId.charCodeAt(0) % colors.length;
    const animalIndex = senderId.charCodeAt(1) % animals.length;
    
    return `${colors[colorIndex]} ${animals[animalIndex]}`;
  };

  if (!user) {
    return (
      <Card className="mood-card">
        <CardContent className="text-center py-8">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Please log in</h3>
          <p className="text-muted-foreground text-sm">
            You need to be logged in to access peer support chat.
          </p>
        </CardContent>
      </Card>
    );
  }

    return (
      <div className="flex flex-col h-full">
        {!isMobile ? (
          // Desktop Layout
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
            {/* Chat Area */}
            <Card className="mood-card lg:col-span-2 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      Peer Support Chat
                    </CardTitle>
                    <CardDescription>
                      Anonymous support from fellow users
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={connected ? "default" : "secondary"}>
                      {connected ? "Connected" : "Connecting..."}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No messages yet. Start a conversation!</p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === user.id ? 'justify-end' : 'justify-start'
                        } fade-in-up`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            message.sender_id === user.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary'
                          }`}
                        >
                          <div className="text-xs opacity-70 mb-1">
                            {message.sender_id === user.id 
                              ? 'You' 
                              : getAnonymousName(message.sender_id, index)
                            }
                          </div>
                          <div className="text-sm">{message.content}</div>
                          <div className="text-xs opacity-50 mt-1">
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message... (Stay supportive and kind)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={!connected}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !connected}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Guidelines & Support */}
            <GuidelinesPanel />
          </div>
        ) : (
          // Mobile Layout
          <div className="flex flex-col h-screen">
            {/* Mobile Header with Guidelines Sheet */}
            <div className="flex-shrink-0 p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Peer Support
                  </h2>
                  <p className="text-xs text-muted-foreground">Anonymous user chat</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={connected ? "default" : "secondary"} className="text-xs">
                    {connected ? "Connected" : "Connecting..."}
                  </Badge>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Info className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <SheetHeader>
                        <SheetTitle>Chat Guidelines</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        <GuidelinesPanel />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>

            {/* Mobile Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No messages yet. Start a conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user.id ? 'justify-end' : 'justify-start'
                    } fade-in-up`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 ${
                        message.sender_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary'
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {message.sender_id === user.id 
                          ? 'You' 
                          : getAnonymousName(message.sender_id, index)
                        }
                      </div>
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-50 mt-1">
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mobile Message Input */}
            <div className="flex-shrink-0 p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Type message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 text-base"
                  disabled={!connected}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !connected}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default PeerSupportChat;