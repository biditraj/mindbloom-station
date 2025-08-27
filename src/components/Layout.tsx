import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Settings, 
  LogOut,
  Heart,
  Brain,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { student, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { id: 'mood', label: 'Mood Check-in', icon: Heart, path: '/' },
    { id: 'history', label: 'Mood History', icon: Calendar, path: '/history' },
    { id: 'statistics', label: 'Your Mood Statistics', icon: TrendingUp, path: '/mood-statistics' },
    { id: 'insights', label: 'Insights', icon: Brain, path: '/insights' },
    { id: 'chat', label: 'Peer Support', icon: MessageCircle, path: '/chat' },
    ...(student?.role === 'admin' ? [
      { id: 'dashboard', label: 'Admin Dashboard', icon: Settings, path: '/admin' }
    ] : [])
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="flex h-full">
        
        {/* Compact Sidebar */}
        <motion.div 
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          className="w-64 p-4 flex flex-col bg-white/80 backdrop-blur-sm border-r border-gray-200/50 overflow-y-auto"
        >
          {/* Compact User Profile */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
            <div className="relative">
              <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white shadow-lg">
                <AvatarFallback className="text-white font-bold">
                  {student?.anonymous_id?.slice(0, 2).toUpperCase() || 'IG'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"></div>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{student?.anonymous_id || 'Iddika Gaspar'}</h3>
              <p className="text-xs text-slate-500">Wellness Tracker</p>
            </div>
          </div>

          {/* Compact Navigation Menu */}
          <nav className="space-y-2 mb-6 flex-1">
            {navigationItems.map((item, index) => (
              <motion.div key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="ghost"
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full justify-start gap-3 h-10 rounded-lg transition-all duration-200 text-sm ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${location.pathname === item.path ? 'text-white' : ''}`} />
                  <span className="font-medium">{item.label}</span>
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

        {/* Main Content Area */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default Layout;