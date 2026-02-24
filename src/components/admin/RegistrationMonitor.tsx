// src\components\admin\RegistrationMonitor.tsx
import { useState, useEffect } from 'react';
import { supabase, Event, Registration, Department, ISTMember } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import {
  Loader, Download, CheckCircle, XCircle, Search,
  User, Mail, Phone, Clock, Hash, ImageIcon, ChevronDown, ChevronUp, Users, FileDown, Building2
} from 'lucide-react';

const IST_DISCOUNT_PER_MEMBER = 20;

export function RegistrationMonitor() {
  const { profile } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<Record<string, any[]>>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [istEnrollments, setIstEnrollments] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('admin-all-regs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const [regsRes, evtsRes, deptRes, istRes] = await Promise.all([
      supabase.from('registrations').select('*').order('registered_at', { ascending: false }),
      supabase.from('events').select('*').order('title'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('ist_members').select('enrollment_number'),
    ]);
    setRegistrations(regsRes.data || []);
    setEvents(evtsRes.data || []);
    setDepartments(deptRes.data || []);
    setIstEnrollments(new Set((istRes.data || []).map((d: any) => d.enrollment_number.toUpperCase())));
    setLoading(false);
  };

  const toggleExpand = async (reg: Registration) => {
    if (expandedReg === reg.id) { setExpandedReg(null); return; }
    setExpandedReg(reg.id);
    if (reg.payment_screenshot_url && !screenshotUrls[reg.id]) {
      const { data } = await supabase.storage.from('payment-screenshots').createSignedUrl(reg.payment_screenshot_url, 3600);
      if (data?.signedUrl) setScreenshotUrls(prev => ({ ...prev, [reg.id]: data.signedUrl }));
    }
    if (!members[reg.id]) {
      const { data } = await supabase.from('registration_members').select('*').eq('registration_id', reg.id).order('member_order');
      if (data) setMembers(prev => ({ ...prev, [reg.id]: data }));
    }
  };

  const handleForceApprove = async (reg: Registration) => {
    if (!confirm(`Force approve registration for ${reg.name}?`)) return;
    setActionLoading(true);
    try {
      await supabase.from('registrations').update({ status: 'confirmed', reviewed_by: profile!.id, reviewed_at: new Date().toISOString() }).eq('id', reg.id);
      await supabase.from('audit_log').insert({ registration_id: reg.id, action: 'force_approved', performed_by: profile!.id, metadata: { admin_override: true } });
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceReject = async () => {
    if (!showRejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await supabase.from('registrations').update({ status: 'rejected', rejection_reason: rejectReason.trim(), reviewed_by: profile!.id, reviewed_at: new Date().toISOString() }).eq('id', showRejectModal);
      await supabase.from('audit_log').insert({ registration_id: showRejectModal, action: 'force_rejected', performed_by: profile!.id, reason: rejectReason.trim(), metadata: { admin_override: true } });
      setShowRejectModal(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (reg: Registration) => {
    if (!confirm(`Delete registration for ${reg.name}?`)) return;
    await supabase.from('registrations').delete().eq('id', reg.id);
    fetchData();
  };

  const getMemberCountForType = (type: string): number => {
    switch (type) {
      case 'solo': return 1;
      case 'duo': return 2;
      case 'trio': return 3;
      case 'quad': return 4;
      case 'group': return 5; // default group; actual count from team_members
      default: return 1;
    }
  };

  const getRegFee = (r: Registration): number => {
    const evt = events.find(e => e.id === r.event_id);
    if (!evt || evt.registration_fee <= 0) return 0;
    const memberCount = r.registration_type === 'group'
      ? (r.team_members?.length || 0) + 1  // team_members + primary
      : getMemberCountForType(r.registration_type);
    return evt.registration_fee * memberCount;
  };

  const getISTDiscountForReg = (r: Registration): number => {
    // Primary registrant college_id
    let istCount = 0;
    if (r.college_id && istEnrollments.has(r.college_id.trim().toUpperCase())) istCount++;
    // Team members from registration_members (if loaded) — but we use members[r.id]
    const regMembers = members[r.id];
    if (regMembers && regMembers.length > 0) {
      // Skip index 0 (primary already counted via r.college_id)
      regMembers.slice(1).forEach((m: any) => {
        if (m.college_id && istEnrollments.has(m.college_id.trim().toUpperCase())) istCount++;
      });
    }
    return istCount * IST_DISCOUNT_PER_MEMBER;
  };

  const getNetFee = (r: Registration): number => {
    return Math.max(0, getRegFee(r) - getISTDiscountForReg(r));
  };

  const buildCSVContent = (regs: Registration[]) => {
    const header = ['Registration ID', 'Name', 'Email', 'Phone', 'College ID', 'Type', 'Team Name', 'Event', 'Department', 'Fee/Person (₹)', 'Members', 'Gross Amount (₹)', 'IST Discount (₹)', 'Net Amount (₹)', 'Transaction Ref', 'Status', 'Registered At', 'Reviewed At'];
    const rows = regs.map(r => {
      const evt = events.find(e => e.id === r.event_id);
      const dept = evt?.department_id ? departments.find(d => d.id === evt.department_id) : null;
      const memberCount = r.registration_type === 'group'
        ? (r.team_members?.length || 0) + 1
        : getMemberCountForType(r.registration_type);
      const grossFee = (evt?.registration_fee ?? 0) * memberCount;
      // IST discount: check primary college_id (team member college_ids not in CSV without expand)
      let istCount = 0;
      if (r.college_id && istEnrollments.has(r.college_id.trim().toUpperCase())) istCount++;
      const regMembers = members[r.id];
      if (regMembers && regMembers.length > 0) {
        regMembers.slice(1).forEach((m: any) => {
          if (m.college_id && istEnrollments.has(m.college_id.trim().toUpperCase())) istCount++;
        });
      }
      const istDiscount = istCount * IST_DISCOUNT_PER_MEMBER;
      const netFee = Math.max(0, grossFee - istDiscount);
      return [
        r.registration_id,
        `"${r.name}"`,
        r.email,
        r.phone,
        r.college_id || '',
        r.registration_type,
        `"${r.team_name || ''}"`,
        `"${evt?.title || ''}"`,
        `"${dept?.name || 'General'}"`,
        evt?.registration_fee ?? 0,
        memberCount,
        grossFee,
        istDiscount,
        netFee,
        r.transaction_reference || '',
        r.status,
        new Date(r.registered_at).toLocaleString(),
        r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : '',
      ];
    });
    return [header, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllCSV = () => {
    const csv = buildCSVContent(filteredRegs);
    downloadCSV(csv, `all-registrations-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const exportByDepartment = (deptId?: string) => {
    if (deptId) {
      // Single department
      const dept = departments.find(d => d.id === deptId);
      const deptEventIds = events.filter(e => e.department_id === deptId).map(e => e.id);
      const deptRegs = filteredRegs.filter(r => deptEventIds.includes(r.event_id));
      const csv = buildCSVContent(deptRegs);
      downloadCSV(csv, `registrations-${dept?.code || 'dept'}-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // Download all departments as separate files
      // General (no department)
      const generalEventIds = events.filter(e => !e.department_id).map(e => e.id);
      const generalRegs = filteredRegs.filter(r => generalEventIds.includes(r.event_id));
      if (generalRegs.length > 0) {
        downloadCSV(buildCSVContent(generalRegs), `registrations-GENERAL-${new Date().toISOString().split('T')[0]}.csv`);
      }
      // Each department
      departments.forEach(dept => {
        const deptEventIds = events.filter(e => e.department_id === dept.id).map(e => e.id);
        const deptRegs = filteredRegs.filter(r => deptEventIds.includes(r.event_id));
        if (deptRegs.length > 0) {
          downloadCSV(buildCSVContent(deptRegs), `registrations-${dept.code}-${new Date().toISOString().split('T')[0]}.csv`);
        }
      });
    }
    setShowExportMenu(false);
  };

  const filteredRegs = registrations.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterEvent && r.event_id !== filterEvent) return false;
    if (filterDepartment) {
      const evt = events.find(e => e.id === r.event_id);
      if (filterDepartment === '__none__') {
        if (evt?.department_id) return false;
      } else {
        if (evt?.department_id !== filterDepartment) return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.registration_id.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount = filteredRegs.reduce((sum, r) => {
    return sum + getRegFee(r);
  }, 0);

  const statusBadge = (status: string) => {
    const s: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${s[status] || s.pending}`}>{status === 'confirmed' ? 'Approved' : status}</span>;
  };

  if (loading) return <div className="text-center py-8"><Loader className="animate-spin text-indigo-600 mx-auto" size={32} /></div>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">All Registrations ({filteredRegs.length})</h2>
          {totalAmount > 0 && <p className="text-sm text-gray-500 mt-0.5">Total Amount: <span className="font-bold text-green-700">₹{totalAmount.toLocaleString()}</span></p>}
        </div>

        {/* Export dropdown */}
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <Download size={16} className="mr-1" /> Export CSV <ChevronDown size={14} className="ml-1" />
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 w-64 animate-fadeIn">
                <button onClick={exportAllCSV} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-800">
                  <FileDown size={15} className="text-green-600" /> Export All (Unified)
                </button>
                <button onClick={() => exportByDepartment()} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-800">
                  <Building2 size={15} className="text-indigo-600" /> Export Each Dept (Separate)
                </button>
                <div className="border-t border-gray-100 my-1" />
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase text-gray-400 tracking-wider">By Department</p>
                {departments.map(d => {
                  const count = filteredRegs.filter(r => {
                    const evt = events.find(e => e.id === r.event_id);
                    return evt?.department_id === d.id;
                  }).length;
                  return (
                    <button key={d.id} onClick={() => exportByDepartment(d.id)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between text-gray-700">
                      <span>{d.name}</span>
                      <span className="text-xs text-gray-400">{count}</span>
                    </button>
                  );
                })}
                {(() => {
                  const genCount = filteredRegs.filter(r => {
                    const evt = events.find(e => e.id === r.event_id);
                    return !evt?.department_id;
                  }).length;
                  return genCount > 0 ? (
                    <button onClick={() => {
                      const generalEventIds = events.filter(e => !e.department_id).map(e => e.id);
                      const generalRegs = filteredRegs.filter(r => generalEventIds.includes(r.event_id));
                      downloadCSV(buildCSVContent(generalRegs), `registrations-GENERAL-${new Date().toISOString().split('T')[0]}.csv`);
                      setShowExportMenu(false);
                    }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between text-gray-700">
                      <span>General (No Dept)</span>
                      <span className="text-xs text-gray-400">{genCount}</span>
                    </button>
                  ) : null;
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Search name, email, or reg ID..." />
        </div>
        <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          <option value="__none__">General (No Dept)</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm max-w-[200px]">
          <option value="">All Events</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {filteredRegs.length === 0 ? (
        <div className="text-center py-12 card">
          <Users className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No registrations found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRegs.map(reg => {
            const evt = events.find(e => e.id === reg.event_id);
            return (
              <div key={reg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button onClick={() => toggleExpand(reg)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{reg.name}</p>
                      <p className="text-xs text-gray-500">{reg.registration_id} · {evt?.title || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(reg.status)}
                    {expandedReg === reg.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>
                {expandedReg === reg.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                      <span className="flex items-center text-gray-600"><Mail size={13} className="mr-1.5 text-gray-400" />{reg.email}</span>
                      <span className="flex items-center text-gray-600"><Phone size={13} className="mr-1.5 text-gray-400" />{reg.phone}</span>
                      <span className="flex items-center text-gray-600"><Hash size={13} className="mr-1.5 text-gray-400" />{reg.college_id || 'N/A'}</span>
                      <span className="flex items-center text-gray-600"><Users size={13} className="mr-1.5 text-gray-400" />{reg.registration_type} {reg.team_name && `(${reg.team_name})`}</span>
                      <span className="flex items-center text-gray-600"><Clock size={13} className="mr-1.5 text-gray-400" />{new Date(reg.registered_at).toLocaleString()}</span>
                      {reg.transaction_reference && <span className="flex items-center text-gray-600"><Hash size={13} className="mr-1.5 text-gray-400" />Txn: {reg.transaction_reference}</span>}
                    </div>
                    {members[reg.id] && members[reg.id].length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Members</p>
                        {members[reg.id].map((m: any) => (
                          <p key={m.id} className="text-sm text-gray-700">{m.member_order}. {m.member_name} {m.email && `(${m.email})`} {m.college_id && `- ${m.college_id}`}</p>
                        ))}
                      </div>
                    )}
                    {screenshotUrls[reg.id] && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Payment Screenshot</p>
                        <img src={screenshotUrls[reg.id]} alt="Payment" className="max-h-48 rounded-lg border" />
                      </div>
                    )}
                    {reg.status === 'rejected' && reg.rejection_reason && (
                      <div className="bg-red-50 rounded-lg p-2 mb-3 text-sm text-red-700"><strong>Rejection:</strong> {reg.rejection_reason}</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {reg.status !== 'confirmed' && (
                        <button onClick={() => handleForceApprove(reg)} disabled={actionLoading} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-green-300 flex items-center">
                          <CheckCircle size={14} className="mr-1" /> Force Approve
                        </button>
                      )}
                      {reg.status !== 'rejected' && (
                        <button onClick={() => { setShowRejectModal(reg.id); setRejectReason(''); }} disabled={actionLoading} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-red-300 flex items-center">
                          <XCircle size={14} className="mr-1" /> Force Reject
                        </button>
                      )}
                      <button onClick={() => handleDelete(reg)} className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Force Reject Registration</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4" rows={3} placeholder="Rejection reason (required)..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleForceReject} disabled={!rejectReason.trim() || actionLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:bg-red-300">
                {actionLoading ? 'Rejecting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
