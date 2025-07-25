import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, ListGroup, ProgressBar, Tabs, Tab, Form, Modal } from 'react-bootstrap';
import { FaStar, FaCheck, FaEnvelope, FaPlus, FaPencilAlt, FaTrash, FaChartLine, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import { format } from 'date-fns';
import {
  getCustomerSatisfactionScore,
  getCustomerSurveys,
  getSurveyTemplates,
  createCustomerSurvey,
  sendCustomerSurvey,
  deleteCustomerSurvey,
  CustomerSatisfactionScore,
  CustomerSurvey,
  SurveyTemplate
} from '../../services/customerService';

interface CustomerSatisfactionProps {
  customerId: string;
  customerEmail?: string;
}

// Define extension of CustomerSurvey interface to include additional fields used in the component
interface ExtendedCustomerSurvey extends CustomerSurvey {
  status: 'draft' | 'sent' | 'completed' | 'expired';
  satisfaction_score?: number | null;
  template?: {
    title: string;
  };
  expires_at?: string;
}

const CustomerSatisfaction: React.FC<CustomerSatisfactionProps> = ({ customerId, customerEmail = '' }) => {
  // State variables
  const [satisfactionScore, setSatisfactionScore] = useState<CustomerSatisfactionScore | null>(null);
  const [surveys, setSurveys] = useState<ExtendedCustomerSurvey[]>([]);
  const [surveyTemplates, setSurveyTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal states
  const [showNewSurveyModal, setShowNewSurveyModal] = useState(false);
  const [showSendSurveyModal, setShowSendSurveyModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<ExtendedCustomerSurvey | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingSurvey, setSendingSurvey] = useState(false);

  // Success message state
  const [successMessage, setSuccessMessage] = useState('');
  
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load satisfaction score
      const scoreData = await getCustomerSatisfactionScore(customerId);
      setSatisfactionScore(scoreData);
      
      // Load surveys
      const surveysData = await getCustomerSurveys(customerId);
      setSurveys(surveysData as ExtendedCustomerSurvey[]);
      
      // Load survey templates
      const templatesData = await getSurveyTemplates();
      setSurveyTemplates(templatesData);
      
      // Set default template if available
      if (templatesData.length > 0) {
        setSelectedTemplateId(templatesData[0].id);
      }
      
      // Set default email if available
      if (customerEmail) {
        setEmailAddress(customerEmail);
      }
    } catch (err) {
      console.error('Error loading satisfaction data:', err);
      setError('Failed to load customer satisfaction data');
    } finally {
      setLoading(false);
    }
  }, [customerId, customerEmail]);
  
  // Load data
  useEffect(() => {
    if (customerId) {
      loadData();
    }
  }, [customerId, loadData]);
  
  // Handle creating a new survey
  const handleCreateSurvey = async () => {
    if (!selectedTemplateId) {
      setError('Please select a survey template');
      return;
    }
    
    try {
      setLoading(true);
      
      const newSurvey = {
        customer_id: customerId,
        template_id: selectedTemplateId,
        status: 'draft' as const,
        created_by: 'system' // Adding the required field
      };
      
      await createCustomerSurvey(newSurvey);
      
      // Reload surveys
      await loadData();
      
      // Close modal
      setShowNewSurveyModal(false);
      setSuccessMessage('Survey created successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error creating survey:', err);
      setError('Failed to create survey');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle sending a survey
  const handleSendSurvey = async () => {
    if (!selectedSurvey) return;
    
    try {
      setSendingSurvey(true);
      
      await sendCustomerSurvey(selectedSurvey.id);
      
      // Reload surveys
      await loadData();
      
      // Close modal
      setShowSendSurveyModal(false);
      setSelectedSurvey(null);
      setSuccessMessage('Survey sent successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error sending survey:', err);
      setError('Failed to send survey');
    } finally {
      setSendingSurvey(false);
    }
  };
  
  // Handle deleting a survey
  const handleDeleteSurvey = async (survey: ExtendedCustomerSurvey) => {
    if (!window.confirm('Are you sure you want to delete this survey?')) return;
    
    try {
      setLoading(true);
      
      await deleteCustomerSurvey(survey.id);
      
      // Reload surveys
      await loadData();
      
      setSuccessMessage('Survey deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting survey:', err);
      setError('Failed to delete survey');
    } finally {
      setLoading(false);
    }
  };
  
  // Render loading spinner
  if (loading && !surveys.length && !satisfactionScore) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" />
      </Container>
    );
  }
  
  // Get score color based on score value
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'danger';
  };
  
  // Render star rating
  const renderStarRating = (score: number, max: number = 10) => {
    const percentage = (score / max) * 100;
    return (
      <div className="d-flex align-items-center">
        <div className="me-2">
          <ProgressBar 
            now={percentage} 
            variant={getScoreColor(score)} 
            style={{ height: '8px', width: '120px' }} 
          />
        </div>
        <span className="fw-bold">{score.toFixed(1)}</span>
        <FaStar className="ms-1 text-warning" />
      </div>
    );
  };
  
  return (
    <Container fluid className="mt-3">
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage('')} dismissible>
          {successMessage}
        </Alert>
      )}
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Customer Satisfaction</h4>
        <Button 
          variant="primary" 
          onClick={() => setShowNewSurveyModal(true)}
          disabled={surveyTemplates.length === 0}
        >
          <FaPlus className="me-1" /> Create Survey
        </Button>
      </div>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => k && setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="overview" title="Overview">
          <Row>
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Satisfaction Score</h5>
                </Card.Header>
                <Card.Body>
                  {satisfactionScore ? (
                    <>
                      <div className="text-center mb-4">
                        <h1 className={`display-4 text-${getScoreColor(satisfactionScore.avg_score)}`}>
                          {satisfactionScore.avg_score.toFixed(1)}
                        </h1>
                        <p>Average Satisfaction Rating</p>
                      </div>
                      
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                          <span>Completed Surveys</span>
                          <Badge bg="primary" pill>
                            {satisfactionScore.completed_surveys}
                          </Badge>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                          <span>Total Surveys</span>
                          <Badge bg="secondary" pill>
                            {satisfactionScore.total_surveys}
                          </Badge>
                        </ListGroup.Item>
                        {satisfactionScore.last_survey_date && (
                          <ListGroup.Item className="d-flex justify-content-between align-items-center">
                            <span>Last Survey Date</span>
                            <span className="text-muted">
                              {format(new Date(satisfactionScore.last_survey_date), 'PP')}
                            </span>
                          </ListGroup.Item>
                        )}
                      </ListGroup>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted mb-0">No satisfaction data available yet</p>
                      <p className="text-muted">Create and send a survey to collect feedback</p>
                      <Button 
                        variant="primary" 
                        onClick={() => setShowNewSurveyModal(true)}
                        disabled={surveyTemplates.length === 0}
                      >
                        <FaPlus className="me-1" /> Create First Survey
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Recent Surveys</h5>
                </Card.Header>
                <Card.Body className="p-0">
                  {surveys.length > 0 ? (
                    <ListGroup variant="flush">
                      {surveys.slice(0, 5).map((survey) => (
                        <ListGroup.Item key={survey.id} className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-bold">{survey.template?.title || 'Untitled Survey'}</div>
                            <small className="text-muted">
                              <FaCalendarAlt className="me-1" /> 
                              {format(new Date(survey.created_at), 'PP')}
                            </small>
                          </div>
                          <div>
                            <Badge 
                              bg={
                                survey.status === 'completed' ? 'success' : 
                                survey.status === 'sent' ? 'warning' : 
                                survey.status === 'expired' ? 'danger' : 'secondary'
                              } 
                              className="me-2"
                            >
                              {survey.status}
                            </Badge>
                            {survey.satisfaction_score !== null && survey.satisfaction_score !== undefined && (
                              <Badge bg={getScoreColor(survey.satisfaction_score)} pill>
                                {survey.satisfaction_score} <FaStar size="0.7em" />
                              </Badge>
                            )}
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted">No surveys available</p>
                    </div>
                  )}
                </Card.Body>
                {surveys.length > 5 && (
                  <Card.Footer className="bg-white">
                    <Button 
                      variant="link" 
                      className="p-0" 
                      onClick={() => setActiveTab('surveys')}
                    >
                      View all surveys
                    </Button>
                  </Card.Footer>
                )}
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="surveys" title="Surveys">
          <Card>
            <Card.Header className="bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">All Surveys</h5>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowNewSurveyModal(true)}
                  disabled={surveyTemplates.length === 0}
                >
                  <FaPlus className="me-1" /> Create Survey
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {surveys.length > 0 ? (
                <ListGroup variant="flush">
                  {surveys.map((survey) => (
                    <ListGroup.Item key={survey.id}>
                      <Row className="align-items-center">
                        <Col md={4}>
                          <h6 className="mb-0">{survey.template?.title || 'Untitled Survey'}</h6>
                          <small className="text-muted">
                            Created: {format(new Date(survey.created_at), 'PP')}
                          </small>
                        </Col>
                        <Col md={3}>
                          <Badge 
                            bg={
                              survey.status === 'completed' ? 'success' : 
                              survey.status === 'sent' ? 'warning' : 
                              survey.status === 'expired' ? 'danger' : 'secondary'
                            }
                          >
                            {survey.status.toUpperCase()}
                          </Badge>
                          {survey.status === 'sent' && survey.expires_at && (
                            <div>
                              <small className="text-muted">
                                Expires: {format(new Date(survey.expires_at), 'PP')}
                              </small>
                            </div>
                          )}
                        </Col>
                        <Col md={2}>
                          {survey.satisfaction_score !== null && survey.satisfaction_score !== undefined ? (
                            renderStarRating(survey.satisfaction_score)
                          ) : (
                            <span className="text-muted">No score yet</span>
                          )}
                        </Col>
                        <Col md={3} className="text-end">
                          {survey.status === 'draft' && (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="me-2"
                              onClick={() => {
                                setSelectedSurvey(survey);
                                setShowSendSurveyModal(true);
                                if (customerEmail) {
                                  setEmailAddress(customerEmail);
                                }
                              }}
                            >
                              <FaEnvelope className="me-1" /> Send
                            </Button>
                          )}
                          {(survey.status === 'draft' || survey.status === 'sent') && (
                            <Button 
                              variant="danger" 
                              size="sm"
                              onClick={() => handleDeleteSurvey(survey)}
                            >
                              <FaTrash />
                            </Button>
                          )}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No surveys available</p>
                  <Button 
                    variant="primary" 
                    onClick={() => setShowNewSurveyModal(true)}
                    disabled={surveyTemplates.length === 0}
                  >
                    <FaPlus className="me-1" /> Create First Survey
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      
      {/* New Survey Modal */}
      <Modal show={showNewSurveyModal} onHide={() => setShowNewSurveyModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Survey</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {surveyTemplates.length === 0 ? (
            <Alert variant="warning">
              <FaExclamationTriangle className="me-2" />
              No survey templates available. Please create a template first.
            </Alert>
          ) : (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Survey Template</Form.Label>
                <Form.Select 
                  value={selectedTemplateId} 
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  {surveyTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Select a template for the survey
                </Form.Text>
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNewSurveyModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateSurvey}
            disabled={!selectedTemplateId || surveyTemplates.length === 0}
          >
            Create Survey
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Send Survey Modal */}
      <Modal show={showSendSurveyModal} onHide={() => setShowSendSurveyModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Send Survey</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control 
                type="email" 
                value={emailAddress} 
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Enter email address"
                required
              />
              <Form.Text className="text-muted">
                The survey will be sent to this email address
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSendSurveyModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSendSurvey}
            disabled={!emailAddress || sendingSurvey}
          >
            {sendingSurvey ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Sending...
              </>
            ) : (
              <>
                <FaEnvelope className="me-1" /> Send Survey
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CustomerSatisfaction; 