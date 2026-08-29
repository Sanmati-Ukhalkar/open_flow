import React, { useState, useEffect } from 'react';
import { X, Users, Mail, Shield, UserPlus, Loader2 } from 'lucide-react';

interface OrgSettingsModalProps {
  token: string;
  activeOrg: any;
  onClose: () => void;
}

export default function OrgSettingsModal({ token, activeOrg, onClose }: OrgSettingsModalProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${activeOrg.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMembers(data.members || []);
        setInvites(data.invites || []);
      } else {
        setErrorMsg(data.error?.message || 'Failed to fetch members.');
      }
    } catch (e) {
      setErrorMsg('Network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrg.id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInviting(true);

    try {
      const res = await fetch(`/api/orgs/${activeOrg.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInviteEmail('');
        fetchMembers();
      } else {
        setErrorMsg(data.error?.message || 'Failed to send invite.');
      }
    } catch (e) {
      setErrorMsg('Network error.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm select-none">
      <div className="w-[500px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20">
              <Users className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Team Settings</h2>
              <p className="text-[10px] text-zinc-500">{activeOrg.name} — Role: {activeOrg.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {errorMsg && (
            <div className="text-[11px] text-rose-350 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          {activeOrg.role === 'owner' && (
            <form onSubmit={handleInvite} className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Invite Member
              </h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="Email Address"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-sky-500/50"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-sky-500/50"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Invite'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Members & Invites
            </h3>
            
            <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-900/20">
              {loading ? (
                <div className="p-8 flex justify-center text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : members.length === 0 && invites.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">No members found.</div>
              ) : (
                <div className="divide-y divide-zinc-850/50">
                  {members.map((m: any, i: number) => (
                    <div key={`m-${i}`} className="flex items-center justify-between p-3 px-4 hover:bg-zinc-900/40">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase">
                          {m.email.substring(0, 2)}
                        </div>
                        <span className="text-xs text-zinc-300">{m.email}</span>
                      </div>
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 uppercase">
                        {m.role}
                      </span>
                    </div>
                  ))}
                  
                  {invites.map((inv: any, i: number) => (
                    <div key={`i-${i}`} className="flex items-center justify-between p-3 px-4 hover:bg-zinc-900/40 opacity-70">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-zinc-800/50 border border-dashed border-zinc-700 flex items-center justify-center">
                          <Mail className="w-3 h-3 text-zinc-500" />
                        </div>
                        <span className="text-xs text-zinc-400">{inv.email}</span>
                        <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded ml-2">Pending</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/50 uppercase">
                        {inv.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
