import React from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '@dynatrace/strato-components-preview/layouts';
import {
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '@dynatrace/strato-components-preview/buttons';
import { useDemoMode } from '../hooks/useDemoMode';
import { NETWORK_CATEGORIES } from '../data/networkCategories';

export const Header = () => {
  const { demoMode, setDemoMode } = useDemoMode();

  return (
    <AppHeader>
      <AppHeader.NavItems>
        <AppHeader.AppNavLink as={Link} to="/" />
        <AppHeader.NavItem as={Link} to="/topology">
          🗺️ Topology
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/devices">
          🖥️ Devices
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/interfaces">
          🔌 Interfaces
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/flows">
          🌊 Flow Analytics
        </AppHeader.NavItem>
        {NETWORK_CATEGORIES.filter(c => c.id !== 'global').map((cat) => (
          <AppHeader.NavItem key={cat.id} as={Link} to={`/category/${cat.id}`}>
            {cat.icon} {cat.title}
          </AppHeader.NavItem>
        ))}
        <AppHeader.NavItem as={Link} to="/detectors">
          🔔 Anomaly Detectors
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/data">
          Explore Data
        </AppHeader.NavItem>
      </AppHeader.NavItems>

      <AppHeader.ActionItems>
        <ToggleButtonGroup
          value={demoMode ? 'demo' : 'live'}
          onChange={(val: string) => setDemoMode(val === 'demo')}
        >
          <ToggleButtonGroupItem value="live">Live data</ToggleButtonGroupItem>
          <ToggleButtonGroupItem value="demo">Demo data</ToggleButtonGroupItem>
        </ToggleButtonGroup>
      </AppHeader.ActionItems>
    </AppHeader>
  );
};
