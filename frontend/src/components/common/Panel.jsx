import React from 'react';

export default function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <header className="panel-header">
          <div className="panel-title-wrap">
            {title ? <h2 className="panel-title">{title}</h2> : null}
            {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

