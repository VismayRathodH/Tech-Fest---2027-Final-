//  src\components\admin\ISTMemberManager.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase, ISTMember } from '../../lib/supabase';
import {
  Loader, Upload, Trash2, Search, Plus, Users, AlertCircle, CheckCircle, FileText, X
} from 'lucide-react';

export function ISTMemberManager() {
  const [members, setMembers] = useState<ISTMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addResult, setAddResult] = useState<{ added: number; duplicates: number; errors: number } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('ist_members')
      .select('*')
      .order('added_at', { ascending: false });
    setMembers(data || []);
    setLoading(false);
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    setAddLoading(true);
    setAddResult(null);

    // Parse: one enrollment per line, optionally "enrollment,name"
    const lines = bulkText.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
    const entries = lines.map(line => {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      return {
        enrollment_number: parts[0].toUpperCase(),
        student_name: parts[1] || '',
      };
    });

    // De-duplicate within the batch
    const unique = new Map<string, { enrollment_number: string; student_name: string }>();
    entries.forEach(e => {
      if (e.enrollment_number && !unique.has(e.enrollment_number)) {
        unique.set(e.enrollment_number, e);
      }
    });

    let added = 0;
    let duplicates = 0;
    let errors = 0;

    // Insert in batches of 50
    const batch = Array.from(unique.values());
    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error, data } = await supabase
        .from('ist_members')
        .upsert(chunk, { onConflict: 'enrollment_number', ignoreDuplicates: true })
        .select();
      if (error) {
        errors += chunk.length;
      } else {
        added += data?.length || 0;
        duplicates += chunk.length - (data?.length || 0);
      }
    }

    setAddResult({ added, duplicates, errors });
    setAddLoading(false);
    fetchMembers();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    // Support CSV and plain text
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
    // Skip header if it looks like one
    const firstLine = lines[0]?.toLowerCase() || '';
    const start = (firstLine.includes('enrollment') || firstLine.includes('roll') || firstLine.includes('name')) ? 1 : 0;
    setBulkText(lines.slice(start).join('\n'));
    setShowAddModal(true);

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this IST member?')) return;
    setDeleteLoading(id);
    await supabase.from('ist_members').delete().eq('id', id);
    setMembers(prev => prev.filter(m => m.id !== id));
    setDeleteLoading(null);
  };

  const handleClearAll = async () => {
    if (!confirm(`Delete ALL ${members.length} IST members? This cannot be undone.`)) return;
    setLoading(true);
    // Delete all
    const ids = members.map(m => m.id);
    for (let i = 0; i < ids.length; i += 100) {
      await supabase.from('ist_members').delete().in('id', ids.slice(i, i + 100));
    }
    setMembers([]);
    setLoading(false);
  };

  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.enrollment_number.toLowerCase().includes(q) || m.student_name.toLowerCase().includes(q);
  });

  if (loading) return <div className="text-center py-8"><Loader className="animate-spin text-indigo-600 mx-auto" size={32} /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">IST Members ({members.length})</h2>
          <p className="text-sm text-gray-500">Members get ₹20 discount per person on registration fees</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddModal(true); setBulkText(''); setAddResult(null); }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={16} className="mr-1" /> Add Members
          </button>
          <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer">
            <Upload size={16} className="mr-1" /> Upload CSV
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={handleFileUpload} />
          </label>
          {members.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              <Trash2 size={16} className="mr-1" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="Search by enrollment number or name..."
        />
      </div>

      {/* Member List */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 card">
          <Users className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">{members.length === 0 ? 'No IST members added yet.' : 'No matches found.'}</p>
          {members.length === 0 && (
            <p className="text-sm text-gray-400 mt-1">Click "Add Members" to paste enrollment numbers in bulk.</p>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Enrollment Number</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Student Name</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Added At</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m, idx) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-2.5 text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-2.5 font-mono font-medium text-gray-900">{m.enrollment_number}</td>
                  <td className="px-5 py-2.5 text-gray-700">{m.student_name || '—'}</td>
                  <td className="px-5 py-2.5 text-gray-500 text-xs">{new Date(m.added_at).toLocaleDateString()}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deleteLoading === m.id}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add IST Members</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-3">
              Paste enrollment numbers below — one per line. Optionally add student name after a comma:
            </p>
            <div className="bg-gray-50 rounded-lg p-2 mb-3 text-xs text-gray-500 font-mono">
              <p>ENR-2024-001,John Doe</p>
              <p>ENR-2024-002,Jane Smith</p>
              <p>ENR-2024-003</p>
            </div>

            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:ring-indigo-500"
              placeholder="Paste enrollment numbers here..."
            />

            <p className="text-xs text-gray-400 mt-1 mb-4">
              {bulkText.split(/[\n\r]+/).filter(l => l.trim()).length} entries detected
            </p>

            {addResult && (
              <div className={`rounded-lg p-3 mb-4 text-sm ${addResult.errors > 0 ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`}>
                <p className="flex items-center gap-1">
                  {addResult.errors > 0 ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                  <strong>{addResult.added}</strong> added, <strong>{addResult.duplicates}</strong> duplicates skipped
                  {addResult.errors > 0 && <>, <strong>{addResult.errors}</strong> errors</>}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary text-sm">
                Close
              </button>
              <button
                onClick={handleBulkAdd}
                disabled={addLoading || !bulkText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center"
              >
                {addLoading ? <><Loader className="animate-spin mr-1" size={16} /> Adding...</> : <><Plus size={16} className="mr-1" /> Add All</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
