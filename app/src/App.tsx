import { BrowserRouter, Route, Routes } from 'react-router';
import { Theme } from '@radix-ui/themes';

import '@radix-ui/themes/styles.css';
import '#app/App.css';

import { HomePage } from '#app/pages/HomePage';
import { ResumePage } from '#app/pages/ResumePage';

export function App() {
  return (
    <BrowserRouter>
      <Theme>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="*" element={null} />
        </Routes>
      </Theme>
    </BrowserRouter>
  );
}
