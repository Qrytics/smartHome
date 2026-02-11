import React from 'react';

const TONE_CLASS = {
  neutral: 'badge',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger: 'badge badge-danger',
  info: 'badge badge-info',
};

export default function StatusBadge({ tone = 'neutral', children }) {
  const className = TONE_CLASS[tone] || TONE_CLASS.neutral;
  return <span className={className}>{children}</span>;
}

