import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader, CheckCircle, XCircle, Clock, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateRegistrationSlip, SlipData } from '../lib/generateSlipPDF';

interface TrackResult {
  registration_id: string;
  name: string;
  email: string;
  status: string;
  registration_type: string;
  team_name: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  department_name: string;
  department_code: string;
  rejection_reason: string;
  registered_at: string;
  reviewed_at: string;
}

export function TrackStatusPage() {
  const [regId, setRegId] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleSearch = async () => {
    if (!regId.trim()) return;

    setSearching(true);
    setError('');
    setResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('track_registration', {
        reg_id: regId.trim(),
      });

      if (rpcError) throw rpcError;

      if (!data || !data.registration_id) {
        setError('No registration found with this ID. Please check and try again.');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching.');
    } finally {
      setSearching(false);
    }
  };

  const handleDownloadSlip = async () => {
    if (!result) return;
    setDownloading(true);

    try {
      const { data, error } = await supabase.rpc('get_registration_slip', {
        reg_id: result.registration_id,
      });

      if (error) throw error;
      if (!data) {
        alert('Registration slip is only available for approved registrations.');
        return;
      }

      generateRegistrationSlip(data as SlipData);
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Failed to download registration slip.');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Approved' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending Review' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: status };
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 animate-fadeIn">
      <Link to="/" className="inline-flex items-center text-gray-500 hover:text-indigo-600 mb-6 text-sm">
        <ArrowLeft size={16} className="mr-1" /> Back to Home
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Track Registration</h1>
        <p className="text-gray-500 mt-2">
          Enter your registration number to check your status
        </p>
      </div>

      {/* Search */}
      <div className="card mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Registration Number
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={regId}
              onChange={e => setRegId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
              placeholder="EVT-IT-2026-123456"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !regId.trim()}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 font-medium flex items-center"
          >
            {searching ? <Loader className="animate-spin" size={18} /> : 'Search'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Status banner */}
          {(() => {
            const cfg = getStatusConfig(result.status);
            const StatusIcon = cfg.icon;
            return (
              <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-6 text-center`}>
                <StatusIcon className={`${cfg.color} mx-auto mb-3`} size={48} />
                <h2 className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Registration: <span className="font-mono font-bold">{result.registration_id}</span>
                </p>
              </div>
            );
          })()}

          {/* Details */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Registration Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-gray-900">{result.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Event</dt>
                <dd className="font-medium text-gray-900">{result.event_title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Department</dt>
                <dd className="font-medium text-gray-900">
                  {result.department_name} ({result.department_code})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Event Date</dt>
                <dd className="font-medium text-gray-900">
                  {result.event_date && new Date(result.event_date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium text-gray-900 capitalize">{result.registration_type}</dd>
              </div>
              {result.team_name && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Team</dt>
                  <dd className="font-medium text-gray-900">{result.team_name}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Registered</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(result.registered_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </dd>
              </div>
              {result.reviewed_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Reviewed</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(result.reviewed_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Rejection reason */}
          {result.status === 'rejected' && result.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h4 className="font-bold text-red-700 mb-1">Rejection Reason</h4>
              <p className="text-red-600 text-sm">{result.rejection_reason}</p>
            </div>
          )}

          {/* Download slip */}
          {result.status === 'confirmed' && (
            <button
              onClick={handleDownloadSlip}
              disabled={downloading}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center disabled:bg-green-300"
            >
              {downloading ? (
                <Loader className="animate-spin mr-2" size={18} />
              ) : (
                <Download className="mr-2" size={18} />
              )}
              Download Registration Slip (PDF)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
