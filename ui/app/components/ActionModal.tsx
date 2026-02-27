import React, { useState } from 'react';
import { Button } from '@dynatrace/strato-components/buttons';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Paragraph } from '@dynatrace/strato-components/typography';
import { Modal } from '@dynatrace/strato-components-preview/overlays';
import { CheckmarkIcon, CriticalIcon } from '@dynatrace/strato-icons';
import { useWorkflowTrigger } from '../hooks/useWorkflowTrigger';
import type { NetworkAction } from '../types/network';

const spinKeyframes = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

interface ActionModalProps {
  show: boolean;
  onDismiss: () => void;
  action: NetworkAction;
}

export const ActionModal = ({ show, onDismiss, action }: ActionModalProps) => {
  const { trigger, status, error, reset } = useWorkflowTrigger();
  const [confirmed, setConfirmed] = useState(false);

  const handleClose = () => {
    setConfirmed(false);
    reset();
    onDismiss();
  };

  const handleConfirm = async () => {
    setConfirmed(true);
    await trigger({ workflowId: action.workflowId, params: action.params });
  };

  const footer =
    status === 'success' || status === 'error' ? (
      <Button onClick={handleClose}>Close</Button>
    ) : (
      <Flex gap={8}>
        <Button variant="emphasized" onClick={handleConfirm} disabled={status === 'loading'}>
          {status === 'loading' ? 'Running…' : 'Confirm'}
        </Button>
        <Button onClick={handleClose} disabled={status === 'loading'}>
          Cancel
        </Button>
      </Flex>
    );

  return (
    <>
      <style>{spinKeyframes}</style>
      <Modal show={show} onDismiss={handleClose} title={`${action.icon} ${action.label}`} size="small" footer={footer}>
      {!confirmed && <Paragraph>{action.confirmMessage}</Paragraph>}

      {status === 'loading' && (
        <Flex gap={8} alignItems="center">
          <span style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>{action.icon}</span>
          <Paragraph>Deploying agent…</Paragraph>
        </Flex>
      )}

      {status === 'success' && (
        <Flex gap={8} alignItems="center">
          <CheckmarkIcon />
          <Paragraph>{action.successMessage}</Paragraph>
        </Flex>
      )}

      {status === 'error' && (
        <Flex gap={8} alignItems="center">
          <CriticalIcon />
          <Paragraph>Error: {error}</Paragraph>
        </Flex>
      )}
    </Modal>
    </>
  );
};
