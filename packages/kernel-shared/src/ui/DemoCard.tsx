import '#shared/ui/DemoCard.css';

export function DemoCard() {
  return (
    <section className="demoCard__root">
      <div className="demoCard__header">
        <div className="demoCard__dot" aria-hidden="true" />
        <div>
          <div className="demoCard__title">@website-kernel/demo</div>
          <div className="demoCard__subtitle">
            这个组件同时验证：TSX + 普通 CSS + Tailwind CSS
          </div>
        </div>
      </div>

      <div className="demoCard__body">
        <div className="demoCard__row">
          <span className="demoCard__label">普通 CSS:</span>
          <span className="demoCard__pill demoCard__pill--plain">OK</span>
        </div>

        <div className="demoCard__row">
          <span className="demoCard__label">Tailwind:</span>
          <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            OK
          </span>
        </div>
      </div>
    </section>
  );
}
