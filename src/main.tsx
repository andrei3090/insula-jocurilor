import { registerSW } from 'virtual:pwa-register';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installPhoneFit } from './core/fit';
import { installBackHandler, useRouter } from './core/router';
import { maybeApplyUpdate, setPendingUpdate } from './core/update';
import './styles.css';

// on a phone, show the tablet layout scaled down instead of clipping it (bug B18)
installPhoneFit();
document.addEventListener('contextmenu', (e) => e.preventDefault());
installBackHandler();

if ('serviceWorker' in navigator && import.meta.env.MODE !== 'development') {
  const updateSW = registerSW({
    onNeedRefresh() {
      setPendingUpdate(updateSW);
      maybeApplyUpdate(useRouter.getState().route.name);
    },
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
