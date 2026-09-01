/**
 * Entry point.
 *
 * Stylesheet order matters: the tokens have to be defined before the component
 * layer and the layout read them, or every `var(--color-*)` resolves to the
 * initial value on first paint.
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/layout.css';

import {reportFirebaseStatus} from '@/config/firebase';
import {logEnvironment} from '@/config/env';
import {App} from '@/App';

// Say once, before anything renders, which API this build resolved to and what
// Firebase configuration it found. Pointing at the wrong API is the most
// common deployment mistake and is otherwise invisible.
logEnvironment();
reportFirebaseStatus();

const container = document.getElementById('root');
if (container === null) {
  throw new Error('index.html is missing its #root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
