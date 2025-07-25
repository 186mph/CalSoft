import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Users, 
  User, 
  Briefcase, 
  Map, 
  ArrowRight, 
  Plus, 
  Edit, 
  Trash, 
  ExternalLink, 
  Loader,
  Filter
} from 'lucide-react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';

import { 
  fetchTerritories, 
  fetchSalesRepsByTerritory,
  fetchAccountOwnershipsByTerritory
} from '@/services/territoryService';

import { 
  Territory, 
  TerritorySalesRep, 
  AccountOwnership 
} from '@/types/sales';

import TerritoryList from '@/components/sales/TerritoryList';
import TerritoryForm from '@/components/sales/TerritoryForm';
import SalesRepAssignment from '@/components/sales/SalesRepAssignment';
import AccountOwnershipTable from '@/components/sales/AccountOwnershipTable';

const TerritoryManagement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [salesReps, setSalesReps] = useState<TerritorySalesRep[]>([]);
  const [accounts, setAccounts] = useState<AccountOwnership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('list');
  const [showAssignmentForm, setShowAssignmentForm] = useState<boolean>(false);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);

  // Load territories on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const territoriesData = await fetchTerritories();
        setTerritories(territoriesData);
        
        // Select the first territory by default if available
        if (territoriesData.length > 0 && !selectedTerritory) {
          setSelectedTerritory(territoriesData[0]);
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load territories. Please try again later.');
        console.error('Error loading territories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshKey]);

  // Load sales reps and accounts when territory is selected
  useEffect(() => {
    const loadTerritoryDetails = async () => {
      if (!selectedTerritory) return;
      
      try {
        setLoading(true);
        
        // Load sales reps for the selected territory
        const repsData = await fetchSalesRepsByTerritory(selectedTerritory.id);
        setSalesReps(repsData);
        
        // Load accounts for the selected territory
        const accountsData = await fetchAccountOwnershipsByTerritory(selectedTerritory.id);
        setAccounts(accountsData);
        
        setError(null);
      } catch (err) {
        setError('Failed to load territory details. Please try again later.');
        console.error('Error loading territory details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTerritoryDetails();
  }, [selectedTerritory]);

  // Get unique regions for filtering
  const regions = React.useMemo(() => {
    const uniqueRegions = [...new Set(territories.map(t => t.region))];
    return uniqueRegions;
  }, [territories]);

  // Filter territories by region
  const filteredTerritories = React.useMemo(() => {
    if (regionFilter === 'all') return territories;
    return territories.filter(t => t.region === regionFilter);
  }, [territories, regionFilter]);

  const handleAddTerritory = () => {
    setSelectedTerritory(undefined);
    setShowForm(true);
  };
  
  const handleEditTerritory = (territory: Territory) => {
    setSelectedTerritory(territory);
    setShowForm(true);
  };
  
  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedTerritory(undefined);
  };
  
  const handleFormSave = () => {
    setShowForm(false);
    setSelectedTerritory(undefined);
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Calculate revenue progress
  const calculateProgress = (territory: Territory): number => {
    if (territory.revenue.target === 0) return 0;
    return Math.min(Math.round((territory.revenue.current / territory.revenue.target) * 100), 100);
  };

  if (loading && territories.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-primary" />
        <span className="ml-2">Loading territories...</span>
      </div>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h1 className="h2 mb-0">Territory Management</h1>
          <p className="text-muted">Manage sales territories and assign representatives</p>
        </Col>
        <Col xs="auto">
          {!showForm && (
            <Button variant="primary" onClick={handleAddTerritory}>
              Add New Territory
            </Button>
          )}
        </Col>
      </Row>
      
      {showForm ? (
        <TerritoryForm 
          territory={selectedTerritory}
          onSave={(territory) => handleFormSave()}
          onCancel={handleFormCancel}
        />
      ) : (
        <Card>
          <Card.Body>
            <TerritoryList 
              key={refreshKey}
              onEdit={handleEditTerritory}
              onCreateNew={handleAddTerritory}
            />
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default TerritoryManagement; 