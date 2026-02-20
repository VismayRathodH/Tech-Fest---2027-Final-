import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, LogOut, Home, Search, Shield, LayoutDashboard, Menu, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export function Layout() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-4 left-4 right-4 z-50 bg-white/80 backdrop-blur-md shadow-lg border border-gray-100 rounded-[2rem]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
              <Calendar className="text-indigo-600" size={28} />
              <span className="text-xl font-bold text-indigo-600">TechFest 2026</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-indigo-600 transition-all flex items-center text-sm font-medium px-3 py-2 rounded-xl hover:bg-indigo-50/80 active:scale-95"
              >
                <Home size={16} className="mr-1.5" />
                Home
              </Link>
              <Link
                to="/track"
                className="text-gray-600 hover:text-indigo-600 transition-all flex items-center text-sm font-medium px-3 py-2 rounded-xl hover:bg-indigo-50/80 active:scale-95"
              >
                <Search size={16} className="mr-1.5" />
                Track Status
              </Link>
              <Link
                to="/help"
                className="text-gray-600 hover:text-indigo-600 transition-all flex items-center text-sm font-medium px-3 py-2 rounded-xl hover:bg-indigo-50/80 active:scale-95"
              >
                <HelpCircle size={16} className="mr-1.5" />
                Help
              </Link>

              {session && profile?.role === 'coordinator' && (
                <Link
                  to="/coordinator"
                  className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center text-sm font-medium px-3 py-2 rounded-lg hover:bg-indigo-50"
                >
                  <LayoutDashboard size={16} className="mr-1.5" />
                  Dashboard
                </Link>
              )}

              {session && profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center text-sm font-medium px-3 py-2 rounded-lg hover:bg-indigo-50"
                >
                  <Shield size={16} className="mr-1.5" />
                  Admin
                </Link>
              )}

              {!session ? (
                <Link to="/login" className="btn-secondary text-sm">
                  Staff Login
                </Link>
              ) : (
                <button onClick={handleLogout} className="btn-secondary text-sm flex items-center">
                  <LogOut size={16} className="mr-1.5" />
                  Logout
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-indigo-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-3 space-y-2">
              <Link
                to="/"
                className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50"
                onClick={closeMenu}
              >
                <Home size={16} className="mr-2" /> Home
              </Link>
              <Link
                to="/track"
                className="flex items-center px-3 py-2 rounded-xl text-gray-700 hover:bg-indigo-50 transition-all active:scale-95"
                onClick={closeMenu}
              >
                <Search size={16} className="mr-2" /> Track Status
              </Link>
              <Link
                to="/help"
                className="flex items-center px-3 py-2 rounded-xl text-gray-700 hover:bg-indigo-50 transition-all active:scale-95"
                onClick={closeMenu}
              >
                <HelpCircle size={16} className="mr-2" /> Help
              </Link>
              {session && profile?.role === 'coordinator' && (
                <Link
                  to="/coordinator"
                  className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50"
                  onClick={closeMenu}
                >
                  <LayoutDashboard size={16} className="mr-2" /> Dashboard
                </Link>
              )}
              {session && profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50"
                  onClick={closeMenu}
                >
                  <Shield size={16} className="mr-2" /> Admin
                </Link>
              )}
              {!session ? (
                <Link
                  to="/login"
                  className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50"
                  onClick={closeMenu}
                >
                  Staff Login
                </Link>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 w-full text-left"
                >
                  <LogOut size={16} className="mr-2" /> Logout
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="pt-28 pb-16 flex-1 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="bg-white/80 backdrop-blur-md text-gray-600 py-2 border border-gray-100 shadow-lg flex-shrink-0 m rounded-[2rem] m-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <div className="w-full flex flex-col items-center gap-6 mb-6">
            {/* College Info */}
            <div className="space-y-4 flex flex-col items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center transform rotate-45 shadow-sm">
                  <div className="transform -rotate-45">
                    <Calendar size={20} className="text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-indigo-600 tracking-tight">V.V.P. Engineering College</h2>
              </div>
              <p className="text-sm leading-relaxed max-w-md text-gray-500">
                V.V.P. Engineering College is dedicated to excellence in technical education and holistic student development.
              </p>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Location</h3>
                <p className="text-sm text-gray-500">
                  Vajdi Virda, Kalavad Road,<br />
                  Rajkot, Gujarat - 360005
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 border-y border-gray-100 py-4 w-full max-w-lg">
              <p className="font-medium">Developed and designed by</p>
              <p className="text-indigo-600 font-bold text-base mt-1">Vismay Rathod & Manav Vadhavana</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Computer Engineering Department</p>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 w-full flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} V.V.P. Engineering College. All rights reserved.
            </p>
            <p className="text-[10px] text-gray-300 font-medium uppercase tracking-tighter">
              Designed for technical excellence
            </p>
          </div>
        </div>
      </footer>
    </div >
  );
}
