'use client';
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Database,
  ExternalLink,
  Globe2,
  KeyRound,
  Link2,
  Loader2,
  Network,
  Save,
  Server,
  ShieldCheck,
} from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import type { ConnectionProfile } from '@/lib/connections';
import { useLocale } from './locale';
import { Panel, Select, readJson } from './ui';
type Profile = ConnectionProfile & {
  rest: ConnectionProfile['rest'] & { secretConfigured?: boolean };
  mcp: ConnectionProfile['mcp'] & { secretConfigured?: boolean };
};
const empty: Profile = {
  activeSource: 'neon',
  rest: { url: '', auth: 'basic', username: '', secret: '', mdx: '' },
  mcp: { url: '', auth: 'ibm-api-key', username: '', secret: '' },
};
const sample = `SELECT\n  { [Measure].[Measure].[Amount_EUR] } ON 0,\n  NON EMPTY\n  { [Period].[Period].[2026-09] }\n  * { [Entity].[Entity].[Germany] }\n  * { [Department].[Department].[Commercial] }\n  * { [Product].[Product].[Job advertising] }\n  * { [Account].[Account].[Revenue] }\n  * { [Version].[Version].[Actual], [Version].[Version].[Budget], [Version].[Version].[Forecast] } ON 1\nFROM [Finance_Plan]`;
type Tool = {
  name: string;
  description: string;
  readOnly: boolean;
  inputSchema: unknown;
};
export function Connections({
  data,
  onRefresh,
}: {
  data: DashboardData;
  onRefresh: () => void;
}) {
  const { t, num } = useLocale(),
    [profile, setProfile] = useState<Profile>(empty),
    [tools, setTools] = useState<Tool[]>([]),
    [busy, setBusy] = useState(''),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [restTested, setRestTested] = useState(false),
    [mcpTested, setMcpTested] = useState(false),
    [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
    fetch('/api/connections')
      .then(readJson)
      .then((r) => setProfile(r.profile))
      .catch(() => setError('connectionFailed'));
  }, []);
  const update = (kind: 'rest' | 'mcp', field: string, value: string) => {
    setProfile((p) => ({ ...p, [kind]: { ...p[kind], [field]: value } }));
    if (kind === 'rest') setRestTested(false);
    else setMcpTested(false);
    setMessage('');
    setError('');
  };
  async function action(type: 'save' | 'test-rest' | 'test-mcp') {
    setBusy(type);
    setError('');
    setMessage('');
    try {
      const r = await readJson(
        await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: type, profile }),
        })
      );
      if (type === 'save') {
        setProfile(r.profile);
        setMessage(t('savedConnection'));
        onRefresh();
      }
      if (type === 'test-rest') {
        setRestTested(true);
        setMessage(`${t('restVerified')} · ${num(r.rowCount)} ${t('records')}`);
      }
      if (type === 'test-mcp') {
        setMcpTested(true);
        setTools(r.tools);
        setMessage(
          `${t('mcpVerified')} · ${num(r.tools.length)} ${t('tools')}`
        );
      }
    } catch {
      setError(t('connectionFailed'));
    } finally {
      setBusy('');
    }
  }
  const authOptions = [
    { value: 'basic', label: t('basic') },
    { value: 'ibm-api-key', label: t('ibmKey') },
    { value: 'bearer', label: t('bearer') },
  ];
  const fields = (kind: 'rest' | 'mcp') => (
    <>
      <label className="field">
        <span>{t(kind === 'rest' ? 'restUrl' : 'mcpUrl')}</span>
        <input
          type="url"
          value={profile[kind].url}
          onChange={(e) => update(kind, 'url', e.target.value)}
          placeholder={
            kind === 'rest'
              ? 'https://your-tm1-host/api/v1'
              : 'https://your-ibm-host/api/tenant/v0/agentic-ai/ibm-pa-tools/mcp'
          }
          autoComplete="off"
        />
      </label>
      <Select
        label={t('auth')}
        value={profile[kind].auth}
        onChange={(value) => update(kind, 'auth', value)}
        options={authOptions}
      />
      {profile[kind].auth === 'basic' && (
        <label className="field">
          <span>{t('username')}</span>
          <input
            value={profile[kind].username}
            onChange={(e) => update(kind, 'username', e.target.value)}
            autoComplete="off"
          />
        </label>
      )}
      <label className="field">
        <span>
          {t('credential')}{' '}
          {profile[kind].secretConfigured && (
            <small className="favourable">
              <KeyRound size={12} />
              {t('secretSet')}
            </small>
          )}
        </span>
        <input
          type="password"
          value={profile[kind].secret}
          onChange={(e) => update(kind, 'secret', e.target.value)}
          placeholder={
            profile[kind].secretConfigured ? t('keepCredential') : ''
          }
          autoComplete="new-password"
        />
      </label>
    </>
  );
  return (
    <>
      <div className="connection-cards">
        <div className="connection-card">
          <div className="card-icon">
            <Network />
          </div>
          <h2>{t('ibmTitle')}</h2>
          <span
            className={`status ${data.status.tm1 === 'connected' ? 'good' : ''}`}
          >
            {t(data.status.tm1)}
          </span>
          <p>{t(data.status.mode === 'live' ? 'liveNote' : 'sourceNote')}</p>
        </div>
        <div className="connection-card">
          <div className="card-icon">
            <Database />
          </div>
          <h2>Neon PostgreSQL</h2>
          <span
            className={`status ${data.status.databaseConnected ? 'good' : ''}`}
          >
            {t(data.status.databaseConnected ? 'connected' : 'unreachable')}
          </span>
          <p>{t('storage')}</p>
        </div>
        <div className="connection-card">
          <div className="card-icon">
            <Globe2 />
          </div>
          <h2>Vercel</h2>
          <span className="status good">{t('running')}</span>
          <p>{t('hosting')}</p>
        </div>
      </div>
      <div className="note privacy-note">
        <ShieldCheck size={20} />
        {t('connectionPrivacy')}
      </div>
      <div className="two-columns">
        <Panel
          title={t('restTitle')}
          subtitle={t('restHelp')}
          actions={
            <span className={`tag ${restTested ? 'good' : ''}`}>
              {t(restTested ? 'connected' : 'notTested')}
            </span>
          }
        >
          <div className="connection-form">
            {fields('rest')}
            <label className="field">
              <span>{t('mdx')}</span>
              <textarea
                rows={8}
                value={profile.rest.mdx}
                onChange={(e) => update('rest', 'mdx', e.target.value)}
                spellCheck={false}
              />
            </label>
            <div className="action-row">
              <button
                className="text-button"
                onClick={() => update('rest', 'mdx', sample)}
              >
                {t('sampleMdx')}
              </button>
              <button
                className="secondary"
                disabled={!!busy || !profile.rest.url || !profile.rest.mdx}
                onClick={() => action('test-rest')}
              >
                {busy === 'test-rest' ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Link2 size={16} />
                )}{' '}
                {t('testRest')}
              </button>
            </div>
            <p className="note">{t('sampleMdxNote')}</p>
          </div>
        </Panel>
        <Panel
          title={t('mcpTitle')}
          subtitle={t('mcpHelp')}
          actions={
            <span className={`tag ${mcpTested ? 'good' : ''}`}>
              {t(mcpTested ? 'connected' : 'notTested')}
            </span>
          }
        >
          <div className="connection-form">
            {fields('mcp')}
            <button
              className="secondary"
              disabled={!!busy || !profile.mcp.url}
              onClick={() => action('test-mcp')}
            >
              {busy === 'test-mcp' ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Network size={16} />
              )}{' '}
              {t('testMcp')}
            </button>
            <a
              className="text-button"
              href="https://www.ibm.com/docs/en/planning-analytics/3.1.0?topic=assistant-mcp-tools"
              target="_blank"
              rel="noreferrer"
            >
              {t('docs')} <ExternalLink size={14} />
            </a>
          </div>
        </Panel>
      </div>
      <div className="settings-save">
        <Select
          label={t('activeSource')}
          value={profile.activeSource}
          onChange={(value) =>
            setProfile((p) => ({
              ...p,
              activeSource: value as 'neon' | 'rest',
            }))
          }
          options={[
            { value: 'neon', label: `Neon · ${t('synthetic')}` },
            { value: 'rest', label: `TM1 REST · ${t('live')}` },
          ]}
        />
        <button
          className="primary"
          disabled={!!busy}
          onClick={() => action('save')}
        >
          {busy === 'save' ? (
            <Loader2 className="spin" size={17} />
          ) : (
            <Save size={17} />
          )}{' '}
          {t('saveConnection')}
        </button>
        {message && (
          <p role="status" className="favourable">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="inline-error">
            {t(error)}
          </p>
        )}
      </div>
      <Panel title={t('tools')} subtitle={t('mcpHelp')}>
        {tools.length ? (
          <div className="tool-list">
            {tools.map((tool) => (
              <details key={tool.name}>
                <summary>
                  <code>{tool.name}</code>
                  <span className="tag">
                    {t(tool.readOnly ? 'readOnly' : 'restricted')}
                  </span>
                </summary>
                <p>{tool.description}</p>
                <pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
              </details>
            ))}
          </div>
        ) : (
          <p className="empty">{t('noTools')}</p>
        )}
      </Panel>
      <Panel title={t('endpoints')} subtitle={t('appMcpNote')}>
        <div className="endpoint-row">
          <Server size={20} />
          <div>
            <strong>{t('appRest')}</strong>
            <code>{origin}/api/dashboard</code>
          </div>
        </div>
        <div className="endpoint-row">
          <Network size={20} />
          <div>
            <strong>{t('appMcp')}</strong>
            <code>{origin}/api/mcp</code>
          </div>
        </div>
        <div className="architecture">
          <span>{t('workspace')}</span>
          <i>→</i>
          <span>{t('server')}</span>
          <i>→</i>
          <span>TM1 REST / Neon</span>
          <i>→</i>
          <span>{t('financeEngine')}</span>
          <i>↔</i>
          <span>MCP</span>
        </div>
      </Panel>
    </>
  );
}
