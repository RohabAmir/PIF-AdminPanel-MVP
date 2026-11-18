import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({ viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const, ...props });

/** Minimal brand marks (lucide no longer ships brand logos). */
export const FacebookIcon = (p: P) => (
  <svg {...base(p)}><path d="M13.5 21v-7.5h2.6l.4-3H13.5V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3z" /></svg>
);
export const InstagramIcon = (p: P) => (
  <svg {...base({ fill: 'none', stroke: 'currentColor', strokeWidth: 2, ...p })}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
);
export const XIcon = (p: P) => (
  <svg {...base(p)}><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.3l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" /></svg>
);
export const LinkedinIcon = (p: P) => (
  <svg {...base(p)}><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3V9.5zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5z" /></svg>
);
export const YoutubeIcon = (p: P) => (
  <svg {...base(p)}><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z" /></svg>
);
export const TiktokIcon = (p: P) => (
  <svg {...base(p)}><path d="M16.6 3c.4 2.2 1.8 3.6 4 3.8v3.1a7.3 7.3 0 0 1-4-1.2v6.1A6 6 0 1 1 10.7 9v3.2a2.9 2.9 0 1 0 2.1 2.8V3h3.8z" /></svg>
);
