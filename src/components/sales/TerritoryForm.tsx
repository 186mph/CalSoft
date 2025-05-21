import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { Territory } from '../../types/sales';
import { createTerritory, updateTerritory } from '../../services/territoryService';

interface TerritoryFormProps {
  territory?: Territory;
  onSave: (territory: Territory) => void;
  onCancel: () => void;
}

const DEFAULT_TERRITORY: Partial<Territory> = {
  name: '',
  description: '',
  region: '',
  manager: '',
  assignedSalesReps: [],
  revenue: {
    current: 0,
    target: 0
  },
  accounts: 0,
  opportunities: 0
};

const TerritoryForm: React.FC<TerritoryFormProps> = ({ 
  territory, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<Partial<Territory>>(
    territory || DEFAULT_TERRITORY
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = !!territory?.id;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'revenue.current' || name === 'revenue.target') {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData.revenue,
          [child]: parseFloat(value) || 0
        }
      });
    } else if (name === 'accounts' || name === 'opportunities') {
      setFormData({
        ...formData,
        [name]: parseInt(value, 10) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Territory name is required';
    }
    
    if (!formData.region?.trim()) {
      newErrors.region = 'Region is required';
    }
    
    if (formData.revenue?.target !== undefined && formData.revenue.target < 0) {
      newErrors['revenue.target'] = 'Target revenue cannot be negative';
    }
    
    if (formData.revenue?.current !== undefined && formData.revenue.current < 0) {
      newErrors['revenue.current'] = 'Current revenue cannot be negative';
    }
    
    if (formData.accounts !== undefined && formData.accounts < 0) {
      newErrors.accounts = 'Number of accounts cannot be negative';
    }
    
    if (formData.opportunities !== undefined && formData.opportunities < 0) {
      newErrors.opportunities = 'Number of opportunities cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      let savedTerritory: Territory;
      
      if (isEditMode && territory) {
        savedTerritory = await updateTerritory({
          ...territory,
          ...formData
        } as Territory);
      } else {
        savedTerritory = await createTerritory(formData as Territory);
      }
      
      onSave(savedTerritory);
    } catch (err) {
      setSubmitError(`Failed to ${isEditMode ? 'update' : 'create'} territory: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error saving territory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h3>{isEditMode ? 'Edit Territory' : 'Create New Territory'}</h3>
      </Card.Header>
      <Card.Body>
        {submitError && (
          <Alert variant="danger" className="mb-4">
            {submitError}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="territoryName">
                <Form.Label>Territory Name*</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  isInvalid={!!errors.name}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group controlId="territoryRegion">
                <Form.Label>Region*</Form.Label>
                <Form.Control
                  type="text"
                  name="region"
                  value={formData.region || ''}
                  onChange={handleChange}
                  isInvalid={!!errors.region}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {errors.region}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          
          <Form.Group className="mb-3" controlId="territoryDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description || ''}
              onChange={handleChange as any}
            />
          </Form.Group>
          
          <Form.Group className="mb-3" controlId="territoryManager">
            <Form.Label>Territory Manager</Form.Label>
            <Form.Control
              type="text"
              name="manager"
              value={formData.manager || ''}
              onChange={handleChange}
            />
          </Form.Group>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="territoryRevenueTarget">
                <Form.Label>Revenue Target ($)</Form.Label>
                <Form.Control
                  type="number"
                  name="revenue.target"
                  value={formData.revenue?.target || 0}
                  onChange={handleChange}
                  isInvalid={!!errors['revenue.target']}
                  min={0}
                />
                <Form.Control.Feedback type="invalid">
                  {errors['revenue.target']}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group controlId="territoryRevenueCurrent">
                <Form.Label>Current Revenue ($)</Form.Label>
                <Form.Control
                  type="number"
                  name="revenue.current"
                  value={formData.revenue?.current || 0}
                  onChange={handleChange}
                  isInvalid={!!errors['revenue.current']}
                  min={0}
                />
                <Form.Control.Feedback type="invalid">
                  {errors['revenue.current']}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="territoryAccounts">
                <Form.Label>Number of Accounts</Form.Label>
                <Form.Control
                  type="number"
                  name="accounts"
                  value={formData.accounts || 0}
                  onChange={handleChange}
                  isInvalid={!!errors.accounts}
                  min={0}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.accounts}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group controlId="territoryOpportunities">
                <Form.Label>Number of Opportunities</Form.Label>
                <Form.Control
                  type="number"
                  name="opportunities"
                  value={formData.opportunities || 0}
                  onChange={handleChange}
                  isInvalid={!!errors.opportunities}
                  min={0}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.opportunities}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Territory' : 'Create Territory'
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default TerritoryForm; 