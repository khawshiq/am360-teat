import React from "react";
import Logo from "./Logo";

// Shared frame for all auth screens (login, register, forgot, reset) so they
// stay visually consistent: centered card, logo mark, title + subtitle, footer.
export default function AuthShell({
  title, subtitle, children, footer,
}: {
  /** ReactNode, not string, so a screen can highlight one word: `Welcome <em>back!</em>`.
   *  <em> is styled as the brand colour — emphasis that still means emphasis with CSS off. */
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <Logo height={46} />
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="auth-foot">{footer}</div>}
      </div>
    </div>
  );
}
