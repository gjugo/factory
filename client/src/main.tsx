import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { connect } from './net';
import { useStore } from './store';
import './index.css';

connect();
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__swarmStore = useStore;
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
