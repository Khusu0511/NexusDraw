import { escapeHtml as eh } from '../utils/helpers';

export default function Toast({ toasts }) {
  return (
    <div id="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
