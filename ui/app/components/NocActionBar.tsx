import React, { useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import { ActionIcon } from '@dynatrace/strato-icons';
import { NOC_PRIMARY_ACTIONS, NOC_SECONDARY_ACTIONS } from '../data/networkCategories';
import { ActionModal } from './ActionModal';
import type { NetworkAction } from '../types/network';
import { getIconComponent } from '../utils';

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
  const IconComp = getIconComponent(action.icon);

  return (
    <Button
      variant={variant}
      onClick={onClick}
      size={compact ? 'condensed' : 'default'}
    >
      {IconComp && <Button.Prefix><IconComp /></Button.Prefix>}
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
          flexWrap="wrap"
          style={{
            padding: '10px 20px',
            borderBottom: showMore ? `1px solid ${Colors.Border.Neutral.Default}` : 'none',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <Flex alignItems="center" gap={8} style={{ marginRight: 8 }}>
            <ActionIcon />
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
            size="condensed"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? 'Less ▲' : 'More ▼'}
          </Button>
        </Flex>

        {/* Secondary actions row (collapsible) */}
        {showMore && (
          <Flex
            alignItems="center"
            gap={8}
            flexWrap="wrap"
            style={{
              padding: '8px 20px',
              background: 'rgba(0,0,0,0.02)',
              overflow: 'hidden',
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
