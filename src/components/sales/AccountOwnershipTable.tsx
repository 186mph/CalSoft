import React, { useState, useEffect } from 'react';
import { Table, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { AccountOwnership, Territory } from '../../types/sales';
import { fetchAccountOwnershipsByTerritory } from '../../services/territoryService';
import { formatDate } from '../../utils/formatters';

interface AccountOwnershipTableProps {
  territory: Territory;
  onUpdate?: () => void;
}

const AccountOwnershipTable: React.FC<AccountOwnershipTableProps> = ({ territory, onUpdate }) => {
  const [accounts, setAccounts] = useState<AccountOwnership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [territory.id]);

  const loadAccounts = async () => {
    if (!territory) return;

    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchAccountOwnershipsByTerritory(territory.id);
      setAccounts(data);
    } catch (err) {
      setError('Failed to load account ownerships. Please try again.');
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <Button onClick={loadAccounts} variant="outline-danger">Try Again</Button>
      </Alert>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h4>Account Ownership for {territory.name}</h4>
      </Card.Header>
      <Card.Body>
        {accounts.length === 0 ? (
          <Alert variant="info">
            No accounts assigned to this territory yet.
          </Alert>
        ) : (
          <Table responsive striped hover>
            <thead>
              <tr>
                <th>Account</th>
                <th>Owner</th>
                <th>Assigned Date</th>
                <th>Last Interaction</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.accountId}>
                  <td className="font-weight-bold">{account.accountName}</td>
                  <td>{account.ownerName}</td>
                  <td>{formatDate(account.assignedDate)}</td>
                  <td>
                    {account.lastInteractionDate 
                      ? formatDate(account.lastInteractionDate)
                      : <span className="text-muted">No recent interaction</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

export default AccountOwnershipTable; 