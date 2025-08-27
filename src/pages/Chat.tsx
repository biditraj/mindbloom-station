import React from 'react';
import Layout from '@/components/Layout';
import VideoChat from '@/components/VideoChat';
import DemoVideoChat from '@/components/DemoVideoChat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, TestTube } from 'lucide-react';

const ChatPage = () => {
  return (
    <Layout>
      <div className="p-4 bg-white/80 backdrop-blur-sm min-h-full">
        <div className="mb-6 pb-4 border-b border-gray-200/60">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Peer Support Video Chat</h1>
          <p className="text-slate-600 text-sm">Connect with peers for anonymous video support</p>
        </div>
        
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Live Video Chat
            </TabsTrigger>
            <TabsTrigger value="demo" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Camera Test
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="live">
            <VideoChat />
          </TabsContent>
          
          <TabsContent value="demo">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Camera & Microphone Test</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Test your camera and microphone before joining a live video chat.
              </p>
            </div>
            <DemoVideoChat />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ChatPage;