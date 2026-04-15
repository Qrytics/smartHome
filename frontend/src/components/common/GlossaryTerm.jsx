import React from 'react';

export default function GlossaryTerm({ term, description }) {
  return (
    <span className="glossary-term" title={description} aria-label={`${term}: ${description}`}>
      {term}
    </span>
  );
}
