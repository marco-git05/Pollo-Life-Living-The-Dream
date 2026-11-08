import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { scanCard } from '../api/creatures';
import { useCreatures } from '../creatures/useCreatures';
import GearButton from './GearButton';
import CreatureCard from './CreatureCard';

const formatDate = (date) => new Date(date).toLocaleString();

export default function NfcScanner({ onOpenMenu }) {
  const [scans, setScans] = useState([]);
  const [payload, setPayload] = useState('');
  const [serial, setSerial] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [lastRead, setLastRead] = useState(null);
  const [matchedCreature, setMatchedCreature] = useState(null);
  const { entry } = useCreatures();

  const loadScans = useCallback(async () => {
    try {
      setStatus('loading');
      setScans(await api('/nfc'));
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const saveScan = async (scan) => {
    const saved = await api('/nfc', { method: 'POST', body: scan });
    setScans((current) => [saved, ...current]);
  };

  const matchCreature = async (payload, serial) => {
    const result = await scanCard(payload, serial);
    setMatchedCreature(result.creature ?? null);
    if (result.creature) await reload();
  };

  const submitManual = async (event) => {
    event.preventDefault();
    if (!payload.trim()) return;
    try {
      setError('');
      await saveScan({ payload, serial, source: 'manual' });
      setPayload('');
      setSerial('');
    } catch (err) {
      setError(err.message);
    }
  };

  const readWithWebNfc = async () => {
    if (!('NDEFReader' in window)) {
      setError('Web NFC is not available in this browser. Use the bridge or enter a payload manually.');
      return;
    }
    try {
      setError('');
      setReading(true);
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.onreading = async ({ serialNumber, message }) => {
        setLastRead({ at: new Date(), kind: 'received' });
        const records = Array.from(message.records || []);
        const text = records
          .map((record) => {
            try {
              return new TextDecoder(record.encoding || 'utf-8').decode(record.data);
            } catch {
              return `[${record.recordType} record]`;
            }
          })
          .join('\n');
        if (!text) {
          if (serialNumber) {
            try {
              await saveScan({
                payload: '[UID-only tag]',
                serial: serialNumber,
                source: 'web-nfc',
              });
              await matchCreature('', serialNumber);
              setError('UID captured. This tag has no readable NDEF text or payment-card data.');
              setLastRead({ at: new Date(), kind: 'uid' });
            } catch (err) {
              setError(err.message);
            }
          } else {
            setError('Tag detected, but it has no readable NDEF text or UID.');
          }
          setReading(false);
          return;
        }
        try {
          await saveScan({ payload: text, serial: serialNumber, source: 'web-nfc' });
          await matchCreature(text, serialNumber);
          setLastRead({ at: new Date(), kind: 'payload' });
          setReading(false);
        } catch (err) {
          setError(err.message);
          setReading(false);
        }
      };
    } catch (err) {
      setError(err.message);
      setReading(false);
    }
  };

  const clearHistory = async () => {
    try {
      setError('');
      await api('/nfc', { method: 'DELETE' });
      setScans([]);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="nfc-page">
      <div className="nfc-inner">
        <header className="topbar">
          <div>
            <h1>NFC reader</h1>
            <p className="sub">Scan tags directly from Android Chrome, or enter a payload manually.</p>
          </div>
          <GearButton onClick={onOpenMenu} />
        </header>

        {error && <div className="notice warn" role="alert">{error}</div>}

        <section className="card nfc-card">
          <header className="card-head"><h2>Capture a tag</h2></header>
          <div className="card-body">
            <button type="button" className="action" onClick={readWithWebNfc} disabled={reading}>
              {reading ? 'Ready for a tag…' : 'Read with browser NFC'}
            </button>
            {reading && <p className="nfc-live-status" role="status">Web app is listening for an NFC scan.</p>}
            {lastRead && (
              <p className="nfc-success" role="status">
                ✓ NFC scan received by this web app ({lastRead.kind === 'uid' ? 'UID only' : 'NDEF payload'}) at{' '}
                {lastRead.at.toLocaleTimeString()}
              </p>
            )}
            <p className="meta">Web NFC is supported on some Android browsers. iPhone browsers can use the manual payload fallback.</p>
            <form className="nfc-form" onSubmit={submitManual}>
              <label>
                Payload
                <textarea value={payload} onChange={(event) => setPayload(event.target.value)} placeholder="Raw tag text or bridge payload" required />
              </label>
              <label>
                Serial number <span className="meta">(optional)</span>
                <input value={serial} onChange={(event) => setSerial(event.target.value)} />
              </label>
              <button type="submit" className="action">Save test scan</button>
            </form>
          </div>
        </section>

        {matchedCreature && (
          <section className="nfc-match" aria-live="polite">
            <h2>Creature unlocked</h2>
            <CreatureCard
              creature={matchedCreature}
              entry={entry(matchedCreature.type)}
              onClose={() => setMatchedCreature(null)}
              onEdit={() => {}}
            />
          </section>
        )}

        <section className="card nfc-card">
          <header className="card-head nfc-history-head">
            <h2>Scan history</h2>
            <button type="button" className="link-btn" onClick={clearHistory} disabled={!scans.length}>Clear</button>
          </header>
          <div className="card-body">
            {status === 'loading' && <p className="meta">Loading scans…</p>}
            {status === 'error' && <button type="button" className="link-btn" onClick={loadScans}>Try again</button>}
            {status === 'ready' && !scans.length && <p className="meta">No scans yet.</p>}
            {!!scans.length && (
              <ol className="nfc-history">
                {scans.map((scan) => (
                  <li key={scan._id}>
                    <time dateTime={scan.scannedAt}>{formatDate(scan.scannedAt)}</time>
                    <code>{scan.payload}</code>
                    <span className="badge">{scan.source}</span>
                    {scan.serial && <span className="meta">serial: {scan.serial}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
