import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ParentApp } from './App';
import { PAGE } from './ui';
import '../styles.css';

// the parent page scrolls normally and allows text selection (unlike the child app)
document.body.style.overflow = 'auto';
document.body.style.userSelect = 'auto';
// one page colour everywhere, also behind the floating nav and under the system bars
document.documentElement.style.background = PAGE;
document.body.style.background = PAGE;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ParentApp />
  </StrictMode>,
);
