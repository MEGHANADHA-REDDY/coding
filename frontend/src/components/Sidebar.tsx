'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileCode,
  ClipboardList,
  Users,
  Send,
  AlertTriangle,
  Trophy,
  CircleDot,
} from 'lucide-react';

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/problems', label: 'Problems', icon: FileCode },
  { href: '/admin/quizzes', label: 'Quizzes', icon: CircleDot },
  { href: '/admin/exams', label: 'Exams', icon: ClipboardList },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/submissions', label: 'Submissions', icon: Send },
  { href: '/admin/violations', label: 'Violations', icon: AlertTriangle },
  { href: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const studentLinks = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/submissions', label: 'My Submissions', icon: Send },
  { href: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
];

interface SidebarProps {
  role: 'admin' | 'student';
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === 'admin' ? adminLinks : studentLinks;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-57px)] p-4">
      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
