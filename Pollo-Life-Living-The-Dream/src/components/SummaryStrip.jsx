import { fmt } from '../utils/finance';

export default function SummaryStrip({ accounts, monthlyNet }) {
  const assets = accounts.filter((a) => a.kind === 'asset');
  const debts = accounts.filter((a) => a.kind === 'debt');
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalDebt = debts.reduce((s, a) => s + a.balance, 0);
  const net = totalAssets - totalDebt;

  const tiles = [
    { label: 'Net worth', value: fmt(net), tone: net < 0 ? 'neg' : 'pos' },
    { label: 'Cash', value: fmt(assets.reduce((s, a) => s + a.balance, 0)) },
    { label: 'Total debt', value: fmt(totalDebt), tone: 'neg' },
    {
      label: 'Monthly cash flow',
      value: `${monthlyNet >= 0 ? '+' : ''}${fmt(monthlyNet)}`,
      tone: monthlyNet >= 0 ? 'pos' : 'neg',
    },
  ];

  return (
    <div className="summary">
      {tiles.map((t) => (
        <div key={t.label} className="tile">
          <span className="tile-label">{t.label}</span>
          <span className={`tile-value ${t.tone || ''}`}>{t.value}</span>
        </div>
      ))}
    </div>
  );
}
