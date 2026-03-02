import React, { useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { NOC_PRIMARY_ACTIONS, NOC_SECONDARY_ACTIONS } from '../data/networkCategories';
import { ActionModal } from './ActionModal';
import type { NetworkAction } from '../types/network';

/* ── Button variant mapping by actionSeverity ─────────── */

const ActionButton = ({
  action,
  onClick,
  compact,
}: {
  action: NetworkAction;
  onClick: () => void;
  compact?: boolean;
}) => {
  const severity = action.actionSeverity ?? 'secondary';
  const variant = severity === 'danger' ? 'emphasized' : severity === 'primary' ? 'accent' : 'default';

  return (
    <Button
      variant={variant}
      onClick={onClick}
      style={{
        fontSize: compact ? 11 : 12,
        padding: compact ? '5px 10px' : '7px 14px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: compact ? 13 : 15 }}>{action.icon}</span>
      {action.label}
    </Button>
  );
};

export const NocActionBar = () => {
  const [selectedAction, setSelectedAction] = useState<NetworkAction | null>(null);
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <Flex
        flexDirection="column"
        gap={0}
        style={{
          background: Colors.Background.Surface.Default,
          borderRadius: Borders.Radius.Container.Default,
          border: `1px solid ${Colors.Border.Neutral.Default}`,
          boxShadow: BoxShadows.Surface.Raised.Rest,
          overflow: 'hidden',
        }}
      >
        {/* Primary actions row */}
        <Flex
          alignItems="center"
          gap={8}
          style={{
            padding: '10px 20px',
            borderBottom: showMore ? `1px solid ${Colors.Border.Neutral.Default}` : 'none',
          }}
        >
          <Flex alignItems="center" gap={8} style={{ marginRight: 8 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <Heading level={6} style={{ margin: 0, fontSize: 11, opacity: 0.6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Actions
            </Heading>
          </Flex>

          {NOC_PRIMARY_ACTIONS.map((action) => (
            <ActionButton
              key={action.type}
              action={action}
              onClick={() => setSelectedAction(action)}
            />
          ))}

          <div style={{ flex: 1 }} />

          <Button
            variant="default"
            onClick={() => setShowMore(!showMore)}
            style={{ fontSize: 11, padding: '3px 10px' }}
          >
            {showMore ? 'Less ▲' : 'More ▼'}
          </Button>
        </Flex>

        {/* Secondary actions row (collapsible) */}
        {showMore && (
          <Flex
            alignItems="center"
            gap={8}
            style={{
              padding: '8px 20px',
              background: 'rgba(0,0,0,0.02)',
            }}
          >
            <Paragraph style={{ fontSize: 10, opacity: 0.5, marginRight: 4, whiteSpace: 'nowrap' }}>
              Network Ops:
            </Paragraph>
            {NOC_SECONDARY_ACTIONS.map((action) => (
              <ActionButton
                key={action.type}
                action={action}
                onClick={() => setSelectedAction(action)}
                compact
              />
            ))}
          </Flex>
        )}
      </Flex>

      {/* Action Modal */}
      {selectedAction && (
        <ActionModal
          show={!!selectedAction}
          onDismiss={() => setSelectedAction(null)}
          action={selectedAction}
        />
      )}
    </>
  );
};
