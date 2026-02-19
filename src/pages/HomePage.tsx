import { useState, useEffect } from 'react';
import { Calendar, Search, ArrowRight, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, Department } from '../lib/supabase';
import { DepartmentCard } from '../components/DepartmentCard';

export function HomePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Hero */}
      <header className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-700 text-white mx-4 sm:mx-6 lg:mx-8 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-200/50">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540575861501-7cf05a4b175a?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center mix-blend-overlay" />
        <div className="max-w-5xl mx-auto px-6 sm:px-12 py-20 sm:py-28 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
            <div className="p-6 bg-white/15 rounded-3xl backdrop-blur-xl border border-white/20 shadow-2xl animate-bounce-subtle">
              <Calendar className="text-white" size={64} />
            </div>
            <div className="flex-1">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight">
                TechFest <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">2026</span>
              </h1>
              <p className="text-indigo-100 mt-4 text-xl sm:text-2xl font-medium max-w-2xl">
                The ultimate stage for innovation, creativity, and excellence.
              </p>
              <p className="text-indigo-200/80 mt-2 text-lg">
                Explore, Participate, and Elevate your skills.
              </p>
              <div className="mt-10 flex flex-wrap justify-center sm:justify-start gap-4">
                <Link
                  to=""
                  className="btn-primary flex items-center bg-white text-indigo-900 hover:bg-indigo-50"
                >
                  <ArrowDown size={20} className="mr-2" />
                  Explore Events
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all backdrop-blur-md border border-white/20 active:scale-95"
                >
                  <Search size={20} className="mr-2" />
                  Track Registration
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Departments Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
            <p className="text-gray-500 mt-1">Select a department to view its events</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-6 text-gray-500">Loading departments...</p>
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-20 card">
            <Calendar className="mx-auto text-indigo-300 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-800">No departments yet</h3>
            <p className="text-gray-500 mt-2">Check back later for event announcements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {departments.map((dept, index) => (
              <div
                key={dept.id}
                className="flex h-full animate-fadeIn" // Apply animate-fadeIn class directly
                style={{ animationDelay: `${index * 100}ms` }} // Keep staggered delay
              >
                <DepartmentCard department={dept} />
              </div>
            ))}
          </div>
        )}

        {/* Quick info */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar size={24} className="text-indigo-600" />
            </div>
            <h3 className="font-bold text-gray-900">Browse Events</h3>
            <p className="text-sm text-gray-500 mt-1">Explore events across all departments</p>
          </div>
          <div className="card text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ArrowRight size={24} className="text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900">Register Online</h3>
            <p className="text-sm text-gray-500 mt-1">Solo, duo, trio, or group — register instantly</p>
          </div>
          <div className="card text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Search size={24} className="text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900">Track & Download</h3>
            <p className="text-sm text-gray-500 mt-1">Track status and download your registration slip</p>
          </div>
        </div>
      </main>
    </div>
  );
}
