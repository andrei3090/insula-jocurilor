import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ParentApp } from './App';
import '../styles.css';

// the parent page scrolls normally and allows text selection (unlike the child app)
document.body.style.overflow = 'auto';
document.body.style.userSelect = 'auto';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ParentApp />
  </StrictMode>,
);
