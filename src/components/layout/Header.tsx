import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Bell, LogOut } from 'lucide-react';
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAuth } from '@/lib/auth';
interface HeaderProps {
  pageTitle?: string;
}



export function signOutUser() {
 
}
export const Header = ({ pageTitle = 'Dashboard' }: HeaderProps) => {

  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
     window.location.href='/api/auth/aws-logout';
      // Cognito will redirect to postLogoutRedirectUri after this
    } catch (error) {
      console.error('Logout failed:', error);
      router.push('/login');
    }
  };

  // Get user initials
  const getUserInitials = () => {
    if (!user) return '';
    const firstInitial = user.firstName ? user.firstName[0].toUpperCase() : '';
    const lastInitial = user.lastName ? user.lastName[0].toUpperCase() : '';
    return firstInitial || lastInitial || '';
  };

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-primary">
          Guided<span style={{ color: '#ff9900' }}>Safety</span>
        </h1>
        <div className="h-6 w-px bg-border" />
        <h2 className="text-lg font-medium tracking-tight text-muted-foreground">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center space-x-2">
        <ThemeSwitcher />
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-muted">{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
