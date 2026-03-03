// src\pages\AdminDashboardPage.tsx
import { useState, useEffect } from 'react';
import { supabase, Department, Event, Registration } from '../lib/supabase';
import { DepartmentManager } from '../components/admin/DepartmentManager';
import { EventManager } from '../components/admin/EventManager';
import { CoordinatorManager } from '../components/admin/CoordinatorManager';
import { RegistrationMonitor } from '../components/admin/RegistrationMonitor';
import { ISTMemberManager } from '../components/admin/ISTMemberManager';
import {
  BarChart3, Building2, Calendar, Users, ClipboardList,
  Settings, Key, Loader, IndianRupee, Award
} from 'lucide-react';

type Tab = 'overview' | 'departments' | 'events' | 'coordinators' | 'registrations' | 'ist-members' | 'settings';

export function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({ departments: 0, events: 0, coordinators: 0, registrations: 0, pending: 0, approved: 0, rejected: 0 });
  const [deptPayments, setDeptPayments] = useState<{ name: string; code: string; regCount: number; totalAmount: number }[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [deptRes, evtRes, coordRes, regRes, deptsDataRes, istRes, membersRes] = await Promise.all([
        supabase.from('departments').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('*'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'coordinator'),
        supabase.from('registrations').select('*').limit(5000),
        supabase.from('departments').select('*').order('name'),
        supabase.from('ist_members').select('enrollment_number').limit(5000),
        supabase.from('registration_members').select('*').limit(5000),
      ]);
      const regs: Registration[] = regRes.data || [];
      const events: Event[] = evtRes.data || [];
      const departments: Department[] = deptsDataRes.data || [];
      const istSet = new Set((istRes.data || []).map((d: any) => (d.enrollment_number as string).trim().toUpperCase()));
      const allMembers: any[] = membersRes.data || [];

      // Group members by registration ID for efficient lookup
      const membersByReg = new Map<string, any[]>();
      allMembers.forEach((m: any) => {
        if (!membersByReg.has(m.registration_id)) membersByReg.set(m.registration_id, []);
        membersByReg.get(m.registration_id)!.push(m);
      });

      setStats({
        departments: deptRes.count || 0,
        events: events.length,
        coordinators: coordRes.count || 0,
        registrations: regs.length,
        pending: regs.filter(r => r.status === 'pending').length,
        approved: regs.filter(r => r.status === 'confirmed').length,
        rejected: regs.filter(r => r.status === 'rejected').length,
      });

      // Calculate department-wise payments
      const getMemberCount = (type: string, teamMembers?: string[]): number => {
        switch (type) {
          case 'solo': return 1;
          case 'duo': return 2;
          case 'trio': return 3;
          case 'quad': return 4;
          case 'group': return (teamMembers?.length || 0) + 1;
          default: return 1;
        }
      };

      const IST_DISCOUNT = 20;
      const deptMap = new Map<string, { name: string; code: string; regCount: number; totalAmount: number }>();

      // Init departments
      departments.forEach(d => deptMap.set(d.id, { name: d.name, code: d.code, regCount: 0, totalAmount: 0 }));
      deptMap.set('__general__', { name: 'General (No Dept)', code: 'GEN', regCount: 0, totalAmount: 0 });

      let total = 0;
      regs.forEach(r => {
        const evt = events.find(e => e.id === r.event_id);
        if (!evt) return;
        const fee = evt.registration_fee || 0;
        const regMembers = membersByReg.get(r.id) || [];

        // Use registration_members if available, else fallback to team_members.length + 1
        const memberCount = regMembers.length > 0
          ? regMembers.length
          : getMemberCount(r.registration_type, r.team_members);

        const grossAmount = fee * memberCount;

        // IST discount calculation
        let istCount = 0;
        if (regMembers.length > 0) {
          // Check all members from registration_members table
          regMembers.forEach(m => {
            const collegeId = m.college_id?.trim().toUpperCase();
            if (collegeId && istSet.has(collegeId)) istCount++;
          });
        } else {
          // Fallback if members table not populated for this reg (check primary only)
          const primaryCollegeId = r.college_id?.trim().toUpperCase();
          if (primaryCollegeId && istSet.has(primaryCollegeId)) istCount++;
        }

        const discount = istCount * IST_DISCOUNT;
        const amount = Math.max(0, grossAmount - discount);
        const key = evt.department_id || '__general__';
        const entry = deptMap.get(key);
        if (entry) {
          entry.regCount += 1;
          entry.totalAmount += amount;
        }
        total += amount;
      });

      setDeptPayments(Array.from(deptMap.values()).filter(d => d.regCount > 0));
      setGrandTotal(total);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'departments', label: 'Departments', icon: Building2 },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'coordinators', label: 'Coordinators', icon: Users },
    { key: 'registrations', label: 'Registrations', icon: ClipboardList },
    { key: 'ist-members', label: 'IST Members', icon: Award },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">Manage your college event system</p>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Icon size={16} className="mr-1.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div>
          {loading ? (
            <div className="text-center py-12"><Loader className="animate-spin text-indigo-600 mx-auto" size={32} /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Departments" value={stats.departments} icon={Building2} color="bg-purple-500" />
                <StatCard label="Events" value={stats.events} icon={Calendar} color="bg-blue-500" />
                <StatCard label="Coordinators" value={stats.coordinators} icon={Users} color="bg-emerald-500" />
                <StatCard label="Registrations" value={stats.registrations} icon={ClipboardList} color="bg-orange-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-sm text-gray-500 mt-1">Pending Review</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                  <p className="text-sm text-gray-500 mt-1">Approved</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                  <p className="text-sm text-gray-500 mt-1">Rejected</p>
                </div>
              </div>

              {/* Department-wise Payment Breakdown */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <IndianRupee size={20} className="mr-2 text-green-600" />
                  Payment Summary — Department Wise
                </h3>
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Department</th>
                        <th className="text-center px-5 py-3 font-semibold text-gray-600">Registrations</th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptPayments.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-8 text-gray-400">No registrations yet</td></tr>
                      ) : (
                        deptPayments.map(dp => (
                          <tr key={dp.code} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <span className="font-medium text-gray-900">{dp.name}</span>
                              <span className="ml-2 text-xs text-gray-400">({dp.code})</span>
                            </td>
                            <td className="text-center px-5 py-3 text-gray-600">{dp.regCount}</td>
                            <td className="text-right px-5 py-3 font-bold text-gray-900">₹{dp.totalAmount.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {deptPayments.length > 0 && (
                      <tfoot>
                        <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                          <td className="px-5 py-3 font-bold text-indigo-700">Grand Total</td>
                          <td className="text-center px-5 py-3 font-bold text-indigo-600">{deptPayments.reduce((s, d) => s + d.regCount, 0)}</td>
                          <td className="text-right px-5 py-3 font-extrabold text-indigo-700 text-base">₹{grandTotal.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'departments' && <DepartmentManager />}
      {tab === 'events' && <EventManager />}
      {tab === 'coordinators' && <CoordinatorManager />}
      {tab === 'registrations' && <RegistrationMonitor />}
      {tab === 'ist-members' && <ISTMemberManager />}

      {tab === 'settings' && (
        <div className="max-w-md">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Key size={18} className="mr-2" /> Change Password
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}
              <button onClick={handleChangePassword} disabled={passwordLoading} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-indigo-300">
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="text-white" size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
