import React from 'react';
import Layout from '@/components/Layout';
import VideoChat from '@/components/VideoChat';
import DemoVideoChat from '@/components/DemoVideoChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, TestTube } from 'lucide-react';

const ChatPage = () => {
  const isMobile = useIsMobile();
  
  return (
    <Layout>
      <div className={`bg-white/80 backdrop-blur-sm min-h-full ${isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`mb-6 pb-4 border-b border-gray-200/60 ${isMobile ? 'mb-4 pb-3' : ''}`}>
          <h1 className={`font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent ${isMobile ? 'text-xl' : 'text-2xl'}`}>Peer Support Video Chat</h1>
          <p className={`text-slate-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Connect with peers for anonymous video support</p>
        </div>
        
        <Tabs defaultValue="live" className="w-full">
          <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <TabsTrigger value="live" className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
              <Video className="h-4 w-4" />
              {isMobile ? 'Live Chat' : 'Live Video Chat'}
            </TabsTrigger>
            <TabsTrigger value="demo" className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
              <TestTube className="h-4 w-4" />
              {isMobile ? 'Test' : 'Camera Test'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="live">
            <VideoChat />
          </TabsContent>
          
          <TabsContent value="demo">
            <div className={isMobile ? 'mb-3' : 'mb-4'}>
              <h3 className={`font-semibold mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>Camera & Microphone Test</h3>
              <p className={`text-muted-foreground ${isMobile ? 'text-xs mb-3' : 'text-sm mb-4'}`}>
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