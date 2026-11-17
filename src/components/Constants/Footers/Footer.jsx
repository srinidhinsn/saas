import React from 'react';

const TEKHAWK_LOGO_PATH = '/logo.png';

const FooterShared = () => {
  return (
    <footer className="w-full mt-auto flex justify-end bg-surface pointer-events-none">
      <div className="flex items-center gap-3 px-5 py-3 ">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Powered by
          </span>
        </div>
        <img
          src={TEKHAWK_LOGO_PATH}
          alt="Tekhawk"
          className="h-9 max-w-[80px] object-contain"
        />
      </div>
    </footer>
  );
};

export default FooterShared;