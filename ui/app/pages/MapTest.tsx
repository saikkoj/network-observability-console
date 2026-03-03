import React from 'react';
import { BubbleLayer, Location, MapView } from '@dynatrace/strato-geo';

export default function MapTest() {
  type CyberAttackEvent = {
    id: string;
    distancePrecision: number;
    severity: 'high' | 'medium' | 'low';
  } & Location;

  const cyberAttacks: CyberAttackEvent[] = [
    {
      id: 'CYB-2024-001',
      distancePrecision: 250,
      severity: 'high',
      longitude: -115.195615,
      latitude: 36.171462,
    },
    {
      id: 'CYB-2024-002',
      distancePrecision: 500,
      severity: 'medium',
      longitude: -94.556725,
      latitude: 39.104532,
    },
    {
      id: 'CYB-2024-003',
      distancePrecision: 100,
      severity: 'low',
      longitude: -73.998772,
      latitude: 40.717575,
    },
    {
      id: 'CYB-2024-004',
      distancePrecision: 50,
      severity: 'high',
      longitude: -87.773124,
      latitude: 41.786535,
    },
    {
      id: 'CYB-2024-005',
      distancePrecision: 300,
      severity: 'low',
      longitude: -122.293741,
      latitude: 47.545032,
    },
  ];

  const initialViewState = {
    longitude: -101.465989,
    latitude: 40.822381,
    zoom: 3,
  };

  return (
    <div style={{ width: '100%', height: '100vh', padding: 20 }}>
      <MapView initialViewState={initialViewState} height={400}>
        <BubbleLayer
          data={cyberAttacks}
          radius={(cyberAttack: CyberAttackEvent) => cyberAttack.distancePrecision}
          radiusRange={[10, 50]}
          scale="log"
          sizeInterpolation="zoom"
        />
      </MapView>
    </div>
  );
}
