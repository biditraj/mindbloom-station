import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { MessageCircle, Send, Users, Heart, Shield } from 'lucide-react';

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
  const { student } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (student) {
      connectToChat();
    }
    return () => {
      // Cleanup subscription
      supabase.removeAllChannels();
    };
  }, [student, currentRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectToChat = async () => {
    if (!student) return;

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
    if (!newMessage.trim() || !student) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: student.id,
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

  if (!student) {
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
                Anonymous support from fellow students
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
                    message.sender_id === student.id ? 'justify-end' : 'justify-start'
                  } fade-in-up`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      message.sender_id === student.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {message.sender_id === student.id 
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
      <Card className="mood-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Chat Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>Be kind and supportive to fellow students</p>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>Your identity remains anonymous for privacy</p>
            </div>
            <div className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>Share experiences and coping strategies</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2">Crisis Resources</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Crisis Text Line: Text HOME to 741741</p>
              <p>National Suicide Prevention Lifeline: 988</p>
              <p>Campus Counseling Services: Available 24/7</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2">Quick Tips</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Take deep breaths when stressed</p>
              <p>• Break tasks into smaller steps</p>
              <p>• Practice self-compassion</p>
              <p>• Reach out when you need support</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PeerSupportChat;