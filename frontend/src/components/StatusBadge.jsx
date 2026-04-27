export default function StatusBadge({ status }) {
  const s = (status || 'to-do').toLowerCase();
  const cls = s === 'done' ? 'done' : s === 'in-progress' ? 'in-progress' : 'to-do';
  return <span className={`badge ${cls}`}>{s}</span>;
}
