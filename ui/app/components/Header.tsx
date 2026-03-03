import React from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '@dynatrace/strato-components-preview/layouts';
import {
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '@dynatrace/strato-components-preview/buttons';
import { useDemoMode } from '../hooks/useDemoMode';

export const Header = () => {
  const { demoMode, setDemoMode } = useDemoMode();

  return (
    <AppHeader>
      <AppHeader.NavItems>
        <AppHeader.AppNavLink as={Link} to="/" />
        <AppHeader.NavItem as={Link} to="/topology">
          Topology
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/devices">
          Devices
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/interfaces">
          Interfaces
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/detectors">
          Detectors
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/data">
          Data
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
