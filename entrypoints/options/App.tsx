import React, { useEffect, useState } from 'react';
import { getSupabaseConfig, setSupabaseConfig, getSupabaseClient, clearSupabaseConfig } from '../../lib/supabase/client';
import { getSyncMode, setSyncMode, runSync } from '../../lib/db/sync';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function OptionsApp() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncMode, setSyncModeState] = useState<'local' | 'supabase'>('local');
  const [user, setUser] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const config = await getSupabaseConfig();
      if (config) {
        setUrl(config.url);
        setAnonKey(config.anonKey);
      }
      const mode = await getSyncMode();
      setSyncModeState(mode);
      const client = await getSupabaseClient();
      if (client) {
        const { data: { user: u } } = await client.auth.getUser();
        setUser(u?.email ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const handleSaveConfig = async () => {
    await setSupabaseConfig(url.trim(), anonKey.trim());
    setMessage('Supabase config saved.');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSignIn = async () => {
    const client = await getSupabaseClient();
    if (!client) {
      setMessage('Save Supabase URL and Anon Key first.');
      return;
    }
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setMessage('Sign in failed: ' + error.message);
      return;
    }
    setUser(data.user?.email ?? null);
    setMessage('Signed in.');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSignOut = async () => {
    const client = await getSupabaseClient();
    if (client) await client.auth.signOut();
    setUser(null);
    setMessage('Signed out.');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSyncMode = async (mode: 'local' | 'supabase') => {
    await setSyncMode(mode);
    setSyncModeState(mode);
    setMessage(`Sync mode: ${mode}`);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSyncNow = async () => {
    const result = await runSync();
    if (result.error) setMessage('Sync error: ' + result.error);
    else setMessage('Sync completed.');
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-xl">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl space-y-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-xl font-semibold">MyZotero Settings</h1>

      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}

      <section>
        <h2 className="text-lg font-medium mb-2">Storage &amp; sync</h2>
        <div className="flex gap-2">
          <Button
            variant={syncMode === 'local' ? 'default' : 'outline'}
            onClick={() => handleSyncMode('local')}
          >
            Local only
          </Button>
          <Button
            variant={syncMode === 'supabase' ? 'default' : 'outline'}
            onClick={() => handleSyncMode('supabase')}
          >
            Supabase sync
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Use Supabase to sync your library across machines. Set URL and key below, then sign in.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Supabase</h2>
        <div className="space-y-2">
          <label className="block text-sm">Project URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxx.supabase.co"
          />
          <label className="block text-sm">Anon (public) key</label>
          <Input
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJ..."
            type="password"
          />
          <Button onClick={handleSaveConfig}>Save config</Button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Sign in</h2>
        {user ? (
          <p className="text-sm">Signed in as {user}. <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button></p>
        ) : (
          <div className="space-y-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
            />
            <Button onClick={handleSignIn}>Sign in</Button>
          </div>
        )}
      </section>

      {syncMode === 'supabase' && user && (
        <section>
          <Button onClick={handleSyncNow}>Sync now</Button>
        </section>
      )}
    </div>
  );
}
