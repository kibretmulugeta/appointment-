import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, CalendarDays, Users, Bell, User } from 'lucide-react';

export default function Sidebar() {
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/contacts', label: 'Contacts', icon: Users },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Settings', icon: User },
  ];

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800 shrink-0 hidden md:block min-h-[calc(100vh-4rem)] p-4">
      <nav className="space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
