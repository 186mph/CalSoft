import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Table, 
  Badge, 
  Button, 
  Alert, 
  Spinner, 
  Modal,
  ProgressBar
} from 'react-bootstrap';
import { FaEdit, FaTrash, FaUserPlus, FaChartLine } from 'react-icons/fa';
import { Territory } from '@/types/sales';
import { 
  fetchTerritories, 
  deleteTerritory, 
  fetchSalesRepsByTerritory
} from '@/services/territoryService';
import { formatCurrency } from '@/utils/formatters';

interface TerritoryListProps {
  onEdit: (territory: Territory) => void;
  onCreateNew?: () => void;
}

const TerritoryList: React.FC<TerritoryListProps> = ({ onEdit, onCreateNew }) => {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [territoryToDelete, setTerritoryToDelete] = useState<Territory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  useEffect(() => {
    loadTerritories();
  }, []);

  const loadTerritories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTerritories();
      setTerritories(data);
    } catch (err) {
      setError('Failed to load territories. Please try again later.');
      console.error('Error loading territories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (territory: Territory) => {
    setTerritoryToDelete(territory);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!territoryToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deleteTerritory(territoryToDelete.id);
      setShowDeleteModal(false);
      setTerritoryToDelete(null);
      // Refresh the list
      await loadTerritories();
    } catch (err) {
      setError(`Failed to delete territory: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error deleting territory:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const calculateProgressPercentage = (current: number, target: number): number => {
    if (target <= 0) return 0;
    const percentage = (current / target) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  const getProgressVariant = (percentage: number): string => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'danger';
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
        <Button onClick={loadTerritories} variant="outline-danger">Try Again</Button>
      </Alert>
    );
  }

  return (
    <div className="territory-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Territories</h2>
        {onCreateNew && (
          <Button variant="primary" onClick={onCreateNew}>
            Create New Territory
          </Button>
        )}
      </div>

      {territories.length === 0 ? (
        <Alert variant="info">
          No territories found. {onCreateNew ? "Click the button above to create your first territory." : ""}
        </Alert>
      ) : (
        <Table responsive striped hover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Region</th>
              <th>Sales Reps</th>
              <th>Accounts</th>
              <th>Revenue Progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {territories.map((territory) => {
              const progressPercentage = calculateProgressPercentage(
                territory.revenue.current, 
                territory.revenue.target
              );
              const progressVariant = getProgressVariant(progressPercentage);
              
              return (
                <tr key={territory.id}>
                  <td>
                    <div className="d-flex flex-column">
                      <strong>{territory.name}</strong>
                      <small className="text-muted">{territory.description}</small>
                    </div>
                  </td>
                  <td>
                    <Badge bg="secondary" className="me-1">{territory.region}</Badge>
                  </td>
                  <td>
                    <Badge bg="info">{territory.assignedSalesReps.length} reps</Badge>
                  </td>
                  <td>
                    <Badge bg="secondary">{territory.accounts} accounts</Badge>
                    <Badge bg="warning" className="ms-1">{territory.opportunities} opportunities</Badge>
                  </td>
                  <td style={{ width: '20%' }}>
                    <div className="d-flex flex-column">
                      <small className="mb-1">
                        {formatCurrency(territory.revenue.current)} of {formatCurrency(territory.revenue.target)}
                      </small>
                      <ProgressBar 
                        variant={progressVariant} 
                        now={progressPercentage} 
                        label={`${Math.round(progressPercentage)}%`}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => onEdit(territory)}
                        title="Edit Territory"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteClick(territory)}
                        title="Delete Territory"
                      >
                        <FaTrash />
                      </Button>
                      <Link 
                        to={`/territories/${territory.id}/manage-sales-reps`} 
                        className="btn btn-outline-info btn-sm"
                        title="Manage Sales Reps"
                      >
                        <FaUserPlus />
                      </Link>
                      <Link 
                        to={`/territories/${territory.id}/performance`} 
                        className="btn btn-outline-success btn-sm"
                        title="View Performance"
                      >
                        <FaChartLine />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the territory "{territoryToDelete?.name}"? 
          This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : 'Delete Territory'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TerritoryList; 