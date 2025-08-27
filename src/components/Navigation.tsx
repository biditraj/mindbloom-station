import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Brain, MessageCircle, BarChart3, LogOut, User, History, TrendingUp } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const { student, logout } = useAuth();

  const menuItems = [
    { id: 'mood', label: 'Mood Check-in', icon: Heart, description: 'Track your daily mood' },
    { id: 'history', label: 'History', icon: History, description: 'View your mood history' },
    { id: 'statistics', label: 'Statistics', icon: TrendingUp, description: 'Your mood statistics' },
    { id: 'insights', label: 'Insights', icon: Brain, description: 'AI-powered recommendations' },
    { id: 'chat', label: 'Peer Support', icon: MessageCircle, description: 'Anonymous chat' },
    ...(student?.role === 'admin' ? [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Admin analytics' }
    ] : [])
  ];

  return (
    <nav className="bg-card/50 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1">
              <Heart className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">MindBloom Station</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                onClick={() => onViewChange(item.id)}
                className="flex items-center gap-2 relative group"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {item.description}
                </div>
              </Button>
            ))}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-3">
            {student && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{student.anonymous_id}</span>
                {student.role === 'admin' && (
                  <Badge variant="secondary">Admin</Badge>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden border-t border-border/50 py-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                onClick={() => onViewChange(item.id)}
                size="sm"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;