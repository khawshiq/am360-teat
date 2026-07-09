import React from "react";

// Shared frame for all auth screens (login, register, forgot, reset) so they
// stay visually consistent: centered card, logo mark, title + subtitle, footer.
export default function AuthShell({
  title, subtitle, children, footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <div className="logo">
            <span className="mark">A</span>
            <span>AM<span className="grad"> 360</span></span>
          </div>
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="auth-foot">{footer}</div>}
      </div>
    </div>
  );
}
