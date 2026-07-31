import React, { useState } from 'react';
import { Waves, Mail, Lock, Loader2, ArrowRight, Plus, X, UserPlus } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: { id: string; email: string }) => void;
}

export const AuthScreen = ({ onAuthSuccess }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'team'>('individual');
  const [teamMembers, setTeamMembers] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddMember = () => setTeamMembers([...teamMembers, '']);
  const handleRemoveMember = (idx: number) => setTeamMembers(teamMembers.filter((_, i) => i !== idx));
  const handleMemberChange = (idx: number, val: string) => {
    const newMembers = [...teamMembers];
    newMembers[idx] = val;
    setTeamMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please fill in both fields.');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const validMembers = teamMembers.filter(m => m.trim().length > 0);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, accountType, teamMembers: validMembers }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        onAuthSuccess(result.token, result.user);
      } else {
        setErrorMsg(result.error?.message || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm border border-zinc-800 bg-zinc-950/65 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <Waves className="w-6 h-6 text-purple-400 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 uppercase">Open Flow</h1>
          <p className="text-[10px] text-zinc-500 max-w-[240px] leading-relaxed">
            Drag-and-drop workspace for building MCP and AI-powered DAG graphs.
          </p>
        </div>

        {/* Error Callout */}
        {errorMsg && (
          <div className="text-[11px] text-rose-350 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-lg leading-normal">
            {errorMsg}
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-550 pointer-events-none">
                <Mail className="w-3.5 h-3.5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="you@domain.com"
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-550 pointer-events-none">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('individual')}
                  className={`py-2 px-1 rounded-lg text-[10px] font-medium border transition-colors ${
                    accountType === 'individual' ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('team')}
                  className={`py-2 px-1 rounded-lg text-[10px] font-medium border transition-colors ${
                    accountType === 'team' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Team
                </button>
              </div>
            </div>
          )}

          {!isLogin && accountType === 'team' && (
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <UserPlus className="w-3 h-3" />
                Invite Team Members <span className="text-zinc-600 font-normal normal-case">(Optional)</span>
              </label>
              
              <div className="space-y-2">
                {teamMembers.map((memberEmail, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => handleMemberChange(idx, e.target.value)}
                      disabled={loading}
                      placeholder="colleague@domain.com"
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                    {teamMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="p-1.5 text-zinc-550 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={handleAddMember}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 pt-1"
              >
                <Plus className="w-3 h-3" /> Add another member
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 mt-6 rounded-lg font-semibold text-xs transition-all duration-200 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15 disabled:bg-zinc-900 disabled:text-zinc-500 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Log In' : 'Create Account'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Toggle option */}
        <div className="text-center pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
            }}
            disabled={loading}
            className="text-[10px] text-zinc-405 hover:text-purple-400 transition-colors duration-150"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
