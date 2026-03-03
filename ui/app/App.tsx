import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Page } from '@dynatrace/strato-components-preview/layouts';

import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { Topology } from './pages/Topology';
import { Devices } from './pages/Devices';
import { Interfaces } from './pages/Interfaces';
import { CategoryDetail } from './pages/CategoryDetail';
import { Data } from './pages/Data';
import { AnomalyDetectors } from './pages/AnomalyDetectors';
import MapTest from './pages/MapTest';
import { DemoModeProvider } from './hooks/useDemoMode';

/* Anti-shake: prevent layout oscillation from scrollbar toggle & resize cascading */
const ANTI_SHAKE_CSS = `
  html, main, [role="main"] {
    scrollbar-gutter: stable !important;
  }
  body {
    overflow-x: hidden !important;
  }
`;

export const App = () => {
  return (
    <>
      <style>{ANTI_SHAKE_CSS}</style>
      <ErrorBoundary>
        <DemoModeProvider>
        <Routes>
          {/* MapTest rendered OUTSIDE Page to test if Page.Main kills the map */}
          <Route path="/maptest" element={<MapTest />} />
          <Route path="*" element={
            <Page>
              <Page.Header>
                <Header />
              </Page.Header>
              <Page.Main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/topology" element={<Topology />} />
                  <Route path="/devices" element={<Devices />} />
                  <Route path="/interfaces" element={<Interfaces />} />
                  <Route path="/category/:categoryId" element={<CategoryDetail />} />
                  <Route path="/detectors" element={<AnomalyDetectors />} />
                  <Route path="/data" element={<Data />} />
                </Routes>
              </Page.Main>
            </Page>
          } />
        </Routes>
      </DemoModeProvider>
    </ErrorBoundary>
    </>
  );
};
