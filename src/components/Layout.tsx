import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Settings, 
  LogOut,
  Heart,
  Brain,
  MessageCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'mood', label: 'Mood Check-in', icon: Heart, path: '/' },
    { id: 'history', label: 'Mood History', icon: Calendar, path: '/history' },
    { id: 'statistics', label: 'Your Mood Statistics', icon: TrendingUp, path: '/mood-statistics' },
    { id: 'insights', label: 'Insights', icon: Brain, path: '/insights' },
    { id: 'chat', label: 'Peer Video Chat', icon: MessageCircle, path: '/chat' },

    ...(user?.role === 'admin' ? [
      { id: 'dashboard', label: 'Admin Dashboard', icon: Settings, path: '/admin' }
    ] : [])
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const SidebarContent = () => (
    <motion.div 
      initial={!isMobile ? { x: -300, opacity: 0 } : {}}
      animate={!isMobile ? { x: 0, opacity: 1 } : {}}
      transition={!isMobile ? { duration: 0.6, type: "spring", stiffness: 100 } : {}}
      className="h-full p-4 flex flex-col bg-white/80 backdrop-blur-sm border-r border-gray-200/50 overflow-y-auto"
    >
      {/* Compact User Profile */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
        <div className="relative">
          <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white shadow-lg">
            <AvatarFallback className="text-white font-bold">
              {user?.name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"></div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 truncate">{user?.name || user?.email || 'User'}</h3>
          <p className="text-xs text-slate-500 truncate">Wellness Tracker</p>
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 h-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Compact Navigation Menu */}
      <nav className="space-y-2 mb-6 flex-1">
        {navigationItems.map((item, index) => (
          <motion.div key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              onClick={() => handleNavigation(item.path)}
              className={`w-full justify-start gap-3 h-10 rounded-lg transition-all duration-200 text-sm ${isMobile ? 'px-3' : ''} ${
                location.pathname === item.path
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80'
              }`}
            >
              <item.icon className={`h-4 w-4 ${location.pathname === item.path ? 'text-white' : ''}`} />
              <span className="font-medium truncate">{item.label}</span>
            </Button>
          </motion.div>
        ))}
      </nav>

      <Separator className="my-4 bg-slate-200" />

      {/* Compact Logout Button */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-10 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 text-sm"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Log out</span>
        </Button>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="flex h-full">
        {!isMobile ? (
          // Desktop Sidebar
          <div className="w-64">
            <SidebarContent />
          </div>
        ) : (
          // Mobile Navigation Header
          <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-6 w-6 text-orange-500" />
                <span className="font-bold text-lg bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">MindBloom</span>
              </div>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
          className={`flex-1 overflow-y-auto ${isMobile ? 'pt-20' : ''}`}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default Layout;