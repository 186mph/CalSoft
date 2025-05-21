import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { TerritorySalesRep, Territory } from '../../types/sales';
import { fetchSalesRepsByTerritory, assignSalesRepToTerritory, removeSalesRepFromTerritory } from '../../services/territoryService';

interface SalesRepAssignmentProps {
  territory: Territory;
  onUpdate?: () => void;
}

const SalesRepAssignment: React.FC<SalesRepAssignmentProps> = ({ territory, onUpdate }) => {
  const [salesReps, setSalesReps] = useState<TerritorySalesRep[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    loadSalesReps();
  }, [territory.id]);

  const loadSalesReps = async () => {
    if (!territory) return;

    setLoading(true);
    setError(null);
    
    try {
      const reps = await fetchSalesRepsByTerritory(territory.id);
      setSalesReps(reps);
    } catch (err) {
      setError('Failed to load sales representatives. Please try again.');
      console.error('Error loading sales reps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRep = async (salesRepId: string) => {
    setActionLoading(true);
    setError(null);
    
    try {
      await assignSalesRepToTerritory(territory.id, salesRepId);
      
      // Refresh the list
      loadSalesReps();
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError('Failed to assign sales rep to territory. Please try again.');
      console.error('Error assigning sales rep:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRep = async (salesRepId: string) => {
    if (!confirm('Are you sure you want to remove this sales rep from the territory?')) {
      return;
    }
    
    setActionLoading(true);
    setError(null);
    
    try {
      await removeSalesRepFromTerritory(territory.id, salesRepId);
      
      // Refresh the list
      loadSalesReps();
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError('Failed to remove sales rep from territory. Please try again.');
      console.error('Error removing sales rep:', err);
    } finally {
      setActionLoading(false);
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
        <Button onClick={loadSalesReps} variant="outline-danger">Try Again</Button>
      </Alert>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h4>Sales Representatives for {territory.name}</h4>
      </Card.Header>
      <Card.Body>
        {salesReps.length === 0 ? (
          <Alert variant="info">
            No sales representatives assigned to this territory yet.
          </Alert>
        ) : (
          <Table responsive striped hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Performance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesReps.map((rep) => (
                <tr key={rep.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      {rep.profileImage && (
                        <img 
                          src={rep.profileImage} 
                          alt={rep.name} 
                          className="rounded-circle mr-2" 
                          style={{ width: '32px', height: '32px' }} 
                        />
                      )}
                      <span>{rep.name}</span>
                    </div>
                  </td>
                  <td>{rep.email}</td>
                  <td>{rep.role}</td>
                  <td>
                    {rep.performance && (
                      <div>
                        ${rep.performance.achieved.toLocaleString()} / ${rep.performance.quota.toLocaleString()}
                        <div className="progress" style={{ height: '6px' }}>
                          <div 
                            className="progress-bar" 
                            role="progressbar" 
                            style={{ 
                              width: `${Math.min((rep.performance.achieved / rep.performance.quota) * 100, 100)}%`,
                              backgroundColor: 
                                (rep.performance.achieved / rep.performance.quota) >= 1 
                                  ? '#28a745' 
                                  : (rep.performance.achieved / rep.performance.quota) >= 0.75 
                                    ? '#17a2b8' 
                                    : '#ffc107'
                            }} 
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => handleRemoveRep(rep.id)}
                      disabled={actionLoading}
                    >
                      Remove
                    </Button>
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

export default SalesRepAssignment; 