import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Form, Button, Card, Container, Row, Col, Badge, ListGroup, Tab, Tabs, Spinner, Alert } from 'react-bootstrap';
import { FaPhoneAlt, FaEnvelope, FaCalendarAlt, FaStickyNote, FaTags, FaUserAlt, FaCheckCircle, FaExclamationCircle, FaSync } from 'react-icons/fa';
import { format } from 'date-fns';
import { 
  createCustomerInteraction, 
  getCustomerInteractions, 
  updateCustomerInteraction,
  deleteCustomerInteraction,
  CustomerInteraction
} from '../../services/customerService';

interface CustomerInteractionsProps {
  customerId: string;
  contacts?: any[];
  className?: string;
}

const CustomerInteractions: React.FC<CustomerInteractionsProps> = ({ customerId, contacts = [], className }) => {
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentInteraction, setCurrentInteraction] = useState<CustomerInteraction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'call',
    title: '',
    description: '',
    outcome: '',
    follow_up_date: '',
    follow_up_notes: '',
    completed: false,
    associated_contact_id: '',
    tags: ''
  });
  
  // Error states
  const [formError, setFormError] = useState('');
  
  // Load interactions
  useEffect(() => {
    loadInteractions();
  }, [customerId]);
  
  const loadInteractions = async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const fetchedInteractions = await getCustomerInteractions(customerId);
      setInteractions(fetchedInteractions);
      setError('');
    } catch (err) {
      console.error('Error loading interactions:', err);
      setError('Failed to load customer interactions');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter interactions
  const filteredInteractions = interactions.filter(interaction => {
    // Search term filter
    const searchTermMatch = searchTerm === '' || 
      interaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (interaction.outcome && interaction.outcome.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Type filter
    const typeMatch = filterType === '' || interaction.type === filterType;
    
    // Completion status filter
    const completedMatch = filterCompleted === null || interaction.completed === filterCompleted;
    
    return searchTermMatch && typeMatch && completedMatch;
  });
  
  // Sort interactions by created_at (newest first)
  const sortedInteractions = [...filteredInteractions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      type: 'call',
      title: '',
      description: '',
      outcome: '',
      follow_up_date: '',
      follow_up_notes: '',
      completed: false,
      associated_contact_id: '',
      tags: ''
    });
    setFormError('');
    setEditMode(false);
    setCurrentInteraction(null);
  };
  
  // Toggle form visibility
  const toggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) resetForm();
  };
  
  // Validate form
  const validateForm = () => {
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setFormError('Description is required');
      return false;
    }
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Convert tags string to array
      const tagsArray = formData.tags 
        ? formData.tags.split(',').map(tag => tag.trim()) 
        : [];
      
      if (editMode && currentInteraction) {
        // Update existing interaction
        await updateCustomerInteraction(currentInteraction.id, {
          ...formData,
          tags: tagsArray,
          customer_id: customerId
        });
      } else {
        // Create new interaction
        await createCustomerInteraction({
          ...formData,
          tags: tagsArray,
          customer_id: customerId,
          created_by: 'Current User'
        });
      }
      
      // Reload interactions
      await loadInteractions();
      
      // Reset form and hide it
      resetForm();
      setShowForm(false);
      
    } catch (err) {
      console.error('Error saving interaction:', err);
      setFormError('Failed to save interaction');
    } finally {
      setLoading(false);
    }
  };
  
  // Edit interaction
  const handleEdit = (interaction: CustomerInteraction) => {
    setCurrentInteraction(interaction);
    setFormData({
      type: interaction.type,
      title: interaction.title,
      description: interaction.description,
      outcome: interaction.outcome || '',
      follow_up_date: interaction.follow_up_date ? new Date(interaction.follow_up_date).toISOString().split('T')[0] : '',
      follow_up_notes: interaction.follow_up_notes || '',
      completed: interaction.completed,
      associated_contact_id: interaction.associated_contact_id || '',
      tags: interaction.tags ? interaction.tags.join(', ') : ''
    });
    setEditMode(true);
    setShowForm(true);
  };
  
  // Delete interaction
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this interaction?')) return;
    
    try {
      setLoading(true);
      await deleteCustomerInteraction(id);
      await loadInteractions();
    } catch (err) {
      console.error('Error deleting interaction:', err);
      setError('Failed to delete interaction');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle interaction completion status
  const toggleCompleted = async (interaction: CustomerInteraction) => {
    try {
      await updateCustomerInteraction(interaction.id, {
        ...interaction,
        completed: !interaction.completed
      });
      await loadInteractions();
    } catch (err) {
      console.error('Error updating interaction status:', err);
      setError('Failed to update interaction status');
    }
  };
  
  // Render type icon
  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <FaPhoneAlt className="me-2" />;
      case 'email':
        return <FaEnvelope className="me-2" />;
      case 'meeting':
        return <FaCalendarAlt className="me-2" />;
      case 'note':
        return <FaStickyNote className="me-2" />;
      default:
        return null;
    }
  };
  
  // Get associated contact name
  const getContactName = (contactId: string) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown Contact';
  };
  
  return (
    <Container fluid className={`mt-3 ${className}`}>
      {error && (
        <div className="d-flex justify-content-between align-items-center mb-3 bg-light p-3 rounded border">
          <span className="text-danger"><FaExclamationCircle className="me-2" />{error}</span>
          <Button variant="outline-primary" size="sm" onClick={loadInteractions}>
            <FaSync className="me-1" /> Retry
          </Button>
        </div>
      )}
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Customer Interactions</h4>
        <Button variant="primary" onClick={toggleForm}>
          {showForm ? 'Cancel' : 'Add Interaction'}
        </Button>
      </div>
      
      {/* Filter Controls */}
      <Card className="mb-3">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group controlId="searchTerm">
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="filterType">
                <Form.Label>Type</Form.Label>
                <Form.Select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="filterCompleted">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filterCompleted === null ? '' : filterCompleted ? 'completed' : 'pending'}
                  onChange={(e) => {
                    if (e.target.value === '') setFilterCompleted(null);
                    else setFilterCompleted(e.target.value === 'completed');
                  }}
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Interaction Form */}
      {showForm && (
        <Card className="mb-3">
          <Card.Body>
            <h5>{editMode ? 'Edit Interaction' : 'New Interaction'}</h5>
            
            {formError && (
              <div className="d-flex justify-content-between align-items-center mb-3 bg-light p-3 rounded border">
                <span className="text-danger"><FaExclamationCircle className="me-2" />{formError}</span>
                <Button variant="outline-danger" size="sm" onClick={() => setFormError('')}>
                  Dismiss
                </Button>
              </div>
            )}
            
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="type">
                    <Form.Label>Type</Form.Label>
                    <Form.Select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="note">Note</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="title">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter a title"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group className="mb-3" controlId="description">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe the interaction"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group className="mb-3" controlId="outcome">
                    <Form.Label>Outcome</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="outcome"
                      value={formData.outcome}
                      onChange={handleInputChange}
                      placeholder="What was the result of this interaction?"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="follow_up_date">
                    <Form.Label>Follow-up Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="follow_up_date"
                      value={formData.follow_up_date}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="associated_contact_id">
                    <Form.Label>Associated Contact</Form.Label>
                    <Form.Select
                      name="associated_contact_id"
                      value={formData.associated_contact_id}
                      onChange={handleInputChange}
                    >
                      <option value="">None</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group className="mb-3" controlId="follow_up_notes">
                    <Form.Label>Follow-up Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="follow_up_notes"
                      value={formData.follow_up_notes}
                      onChange={handleInputChange}
                      placeholder="Notes for follow-up"
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group className="mb-3" controlId="tags">
                    <Form.Label>Tags</Form.Label>
                    <Form.Control
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="Comma-separated tags (e.g. important, sales, support)"
                    />
                    <Form.Text className="text-muted">
                      Separate tags with commas
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Check
                    type="checkbox"
                    id="completed"
                    name="completed"
                    label="Mark as completed"
                    checked={formData.completed}
                    onChange={handleInputChange}
                    className="mb-3"
                  />
                </Col>
                <Col md={12} className="text-end">
                  <Button variant="secondary" onClick={toggleForm} className="me-2">
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : 'Save'}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}
      
      {/* Interactions Timeline */}
      {loading && !showForm ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : sortedInteractions.length === 0 ? (
        <div className="text-center p-4 bg-light rounded border">
          <p className="mb-3">No interactions found.</p>
          <Button variant="primary" onClick={toggleForm}>
            Add Your First Interaction
          </Button>
        </div>
      ) : (
        <div className="timeline">
          {sortedInteractions.map((interaction) => (
            <Card key={interaction.id} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  {renderTypeIcon(interaction.type)}
                  <span className="ms-1">
                    <Badge bg={interaction.type === 'call' ? 'primary' : 
                               interaction.type === 'email' ? 'info' : 
                               interaction.type === 'meeting' ? 'warning' : 'secondary'}>
                      {interaction.type.toUpperCase()}
                    </Badge>
                  </span>
                  <h5 className="mb-0 ms-2">{interaction.title}</h5>
                  {interaction.completed && (
                    <Badge bg="success" className="ms-2">Completed</Badge>
                  )}
                </div>
                <div>
                  <Button 
                    variant={interaction.completed ? "outline-success" : "outline-secondary"}
                    size="sm"
                    className="me-2"
                    onClick={() => toggleCompleted(interaction)}
                  >
                    {interaction.completed ? <FaCheckCircle /> : <FaExclamationCircle />}
                  </Button>
                  <Button 
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() => handleEdit(interaction)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(interaction.id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <Card.Text>
                  {interaction.description}
                </Card.Text>
                
                {interaction.outcome && (
                  <div className="mt-3">
                    <h6>Outcome:</h6>
                    <p>{interaction.outcome}</p>
                  </div>
                )}
                
                <Row className="mt-3">
                  <Col>
                    <small className="text-muted">
                      <FaCalendarAlt className="me-1" /> Created: {format(new Date(interaction.created_at), 'PPP p')}
                    </small>
                  </Col>
                  
                  {interaction.follow_up_date && (
                    <Col>
                      <small className={`${new Date(interaction.follow_up_date) < new Date() && !interaction.completed ? 'text-danger' : 'text-muted'}`}>
                        <FaCalendarAlt className="me-1" /> Follow-up: {format(new Date(interaction.follow_up_date), 'PPP')}
                      </small>
                    </Col>
                  )}
                </Row>
                
                {interaction.associated_contact_id && (
                  <div className="mt-2">
                    <small className="text-muted">
                      <FaUserAlt className="me-1" /> Contact: {getContactName(interaction.associated_contact_id)}
                    </small>
                  </div>
                )}
                
                {interaction.follow_up_notes && (
                  <div className="mt-3">
                    <h6>Follow-up Notes:</h6>
                    <p>{interaction.follow_up_notes}</p>
                  </div>
                )}
                
                {interaction.tags && interaction.tags.length > 0 && (
                  <div className="mt-3">
                    <h6><FaTags className="me-1" /> Tags:</h6>
                    <div>
                      {interaction.tags.map((tag, index) => (
                        <Badge key={index} bg="info" className="me-1">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
};

export default CustomerInteractions; 