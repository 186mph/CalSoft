import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, ListGroup, Form, Modal } from 'react-bootstrap';
import { FaPlus, FaPencilAlt, FaTrash, FaExclamationTriangle, FaQuestionCircle, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { format } from 'date-fns';
import { useAuth } from '../../lib/AuthContext';
import {
  getSurveyTemplates,
  getSurveyTemplateById,
  createSurveyTemplate,
  updateSurveyTemplate,
  deleteSurveyTemplate,
  getSurveyQuestions,
  createSurveyQuestion,
  updateSurveyQuestion,
  deleteSurveyQuestion,
  SurveyTemplate,
  SurveyQuestion
} from '../../services/customerService';

// Define a proper type for question types
type QuestionType = 'rating' | 'text' | 'multiple_choice' | 'boolean';

const SurveyTemplates: React.FC = () => {
  // State variables
  const { user } = useAuth();
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<SurveyQuestion | null>(null);
  
  // Form states
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    is_active: true,
    auto_send: false,
    frequency: ''
  });
  
  const [questionForm, setQuestionForm] = useState({
    question: '',
    question_type: 'rating' as QuestionType,
    required: true,
    options: [] as string[]
  });
  
  // Option for multiple choice questions
  const [currentOption, setCurrentOption] = useState('');
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState('');
  
  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);
  
  // Load questions when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      loadQuestions(selectedTemplate.id);
    }
  }, [selectedTemplate]);
  
  // Load templates
  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    
    try {
      const templatesData = await getSurveyTemplates(true);
      setTemplates(templatesData);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load survey templates');
    } finally {
      setLoading(false);
    }
  };
  
  // Load questions for a template
  const loadQuestions = async (templateId: string) => {
    setLoading(true);
    setError('');
    
    try {
      const questionsData = await getSurveyQuestions(templateId);
      setQuestions(questionsData);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load survey questions');
    } finally {
      setLoading(false);
    }
  };
  
  // Open template modal for create/edit
  const openTemplateModal = (template?: SurveyTemplate) => {
    if (template) {
      setTemplateForm({
        title: template.title,
        description: template.description || '',
        is_active: template.is_active,
        auto_send: template.auto_send,
        frequency: template.frequency || ''
      });
      setIsEditMode(true);
    } else {
      setTemplateForm({
        title: '',
        description: '',
        is_active: true,
        auto_send: false,
        frequency: ''
      });
      setIsEditMode(false);
    }
    
    setShowTemplateModal(true);
  };
  
  // Open question modal for create/edit
  const openQuestionModal = (question?: SurveyQuestion) => {
    if (!selectedTemplate) return;
    
    if (question) {
      setQuestionForm({
        question: question.question,
        question_type: question.question_type as QuestionType,
        required: question.required,
        options: question.options?.options || []
      });
      setCurrentQuestion(question);
      setIsEditMode(true);
    } else {
      setQuestionForm({
        question: '',
        question_type: 'rating',
        required: true,
        options: []
      });
      setCurrentQuestion(null);
      setIsEditMode(false);
    }
    
    setCurrentOption('');
    setShowQuestionModal(true);
  };
  
  // Handle template form change
  const handleTemplateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setTemplateForm({ ...templateForm, [name]: checked });
    } else {
      setTemplateForm({ ...templateForm, [name]: value });
    }
  };
  
  // Handle question form change
  const handleQuestionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setQuestionForm({ ...questionForm, [name]: checked });
    } else {
      setQuestionForm({ ...questionForm, [name]: value });
    }
  };
  
  // Save template
  const handleSaveTemplate = async () => {
    if (!templateForm.title.trim()) {
      setError('Template title is required');
      return;
    }
    
    if (!user) {
      setError('You must be logged in to save templates');
      return;
    }
    
    try {
      setLoading(true);
      
      if (isEditMode && selectedTemplate) {
        await updateSurveyTemplate(selectedTemplate.id, templateForm);
      } else {
        const newTemplate = await createSurveyTemplate({
          ...templateForm,
          created_by: user.id
        });
        
        setSelectedTemplate(newTemplate);
      }
      
      // Reload templates
      await loadTemplates();
      
      // Close modal
      setShowTemplateModal(false);
      setSuccessMessage(isEditMode ? 'Template updated successfully' : 'Template created successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save survey template');
    } finally {
      setLoading(false);
    }
  };
  
  // Add option to multiple choice question
  const handleAddOption = () => {
    if (!currentOption.trim()) return;
    
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, currentOption.trim()]
    });
    
    setCurrentOption('');
  };
  
  // Remove option from multiple choice question
  const handleRemoveOption = (index: number) => {
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.filter((_, i) => i !== index)
    });
  };
  
  // Save question
  const handleSaveQuestion = async () => {
    if (!questionForm.question.trim()) {
      setError('Question text is required');
      return;
    }
    
    if (questionForm.question_type === 'multiple_choice' && questionForm.options.length < 2) {
      setError('Multiple choice questions must have at least 2 options');
      return;
    }
    
    if (!selectedTemplate) return;
    
    try {
      setLoading(true);
      
      // Prepare options field for multiple choice questions
      const options = questionForm.question_type === 'multiple_choice' 
        ? { options: questionForm.options }
        : undefined;
      
      if (isEditMode && currentQuestion) {
        await updateSurveyQuestion(currentQuestion.id, {
          ...questionForm,
          options
        });
      } else {
        await createSurveyQuestion({
          ...questionForm,
          template_id: selectedTemplate.id,
          order_index: questions.length,
          options
        });
      }
      
      // Reload questions
      await loadQuestions(selectedTemplate.id);
      
      // Close modal
      setShowQuestionModal(false);
      setSuccessMessage(isEditMode ? 'Question updated successfully' : 'Question added successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error saving question:', err);
      setError('Failed to save question');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete template
  const handleDeleteTemplate = async (template: SurveyTemplate) => {
    if (!window.confirm(`Are you sure you want to delete the template "${template.title}"? This will also delete all associated questions and surveys.`)) return;
    
    try {
      setLoading(true);
      
      await deleteSurveyTemplate(template.id);
      
      // If deleted template is selected, clear selection
      if (selectedTemplate && selectedTemplate.id === template.id) {
        setSelectedTemplate(null);
        setQuestions([]);
      }
      
      // Reload templates
      await loadTemplates();
      
      setSuccessMessage('Template deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete question
  const handleDeleteQuestion = async (question: SurveyQuestion) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      setLoading(true);
      
      await deleteSurveyQuestion(question.id);
      
      // Reload questions
      if (selectedTemplate) {
        await loadQuestions(selectedTemplate.id);
      }
      
      setSuccessMessage('Question deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting question:', err);
      setError('Failed to delete question');
    } finally {
      setLoading(false);
    }
  };
  
  // Reorder question (move up/down)
  const handleReorderQuestion = async (question: SurveyQuestion, direction: 'up' | 'down') => {
    if (!selectedTemplate) return;
    
    const currentIndex = questions.findIndex(q => q.id === question.id);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < questions.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return; // Can't move further
    }
    
    try {
      setLoading(true);
      
      // Swap order_index with adjacent question
      const adjacentQuestion = questions[newIndex];
      
      await updateSurveyQuestion(question.id, {
        order_index: adjacentQuestion.order_index
      });
      
      await updateSurveyQuestion(adjacentQuestion.id, {
        order_index: question.order_index
      });
      
      // Reload questions
      await loadQuestions(selectedTemplate.id);
    } catch (err) {
      console.error('Error reordering questions:', err);
      setError('Failed to reorder questions');
    } finally {
      setLoading(false);
    }
  };
  
  // Render loading spinner
  if (loading && !templates.length) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" />
      </Container>
    );
  }
  
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
        <h4>Survey Templates</h4>
        <Button 
          variant="primary" 
          onClick={() => openTemplateModal()}
        >
          <FaPlus className="me-1" /> Create Template
        </Button>
      </div>
      
      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Templates</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {templates.length > 0 ? (
                <ListGroup variant="flush">
                  {templates.map((template) => (
                    <ListGroup.Item 
                      key={template.id} 
                      action 
                      active={selectedTemplate?.id === template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-bold">
                          {template.title}
                          {!template.is_active && (
                            <small className="ms-2 text-muted">(Inactive)</small>
                          )}
                        </div>
                        {template.description && (
                          <small className="text-muted d-block">{template.description}</small>
                        )}
                      </div>
                      <div>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-1 text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTemplateModal(template);
                          }}
                        >
                          <FaPencilAlt />
                        </Button>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-1 text-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template);
                          }}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No templates available</p>
                  <Button 
                    variant="primary" 
                    onClick={() => openTemplateModal()}
                  >
                    <FaPlus className="me-1" /> Create First Template
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header className="bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  {selectedTemplate ? `Questions for "${selectedTemplate.title}"` : 'Questions'}
                </h5>
                {selectedTemplate && (
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => openQuestionModal()}
                  >
                    <FaPlus className="me-1" /> Add Question
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {selectedTemplate ? (
                questions.length > 0 ? (
                  <ListGroup variant="flush">
                    {questions.map((question, index) => (
                      <ListGroup.Item 
                        key={question.id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div className="w-100">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center">
                              <span className="me-2 fw-bold">{index + 1}.</span>
                              <span>{question.question}</span>
                              {question.required && (
                                <small className="ms-2 text-danger">*</small>
                              )}
                            </div>
                            <div>
                              {index > 0 && (
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="p-1 text-secondary"
                                  onClick={() => handleReorderQuestion(question, 'up')}
                                >
                                  <FaArrowUp />
                                </Button>
                              )}
                              {index < questions.length - 1 && (
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="p-1 text-secondary"
                                  onClick={() => handleReorderQuestion(question, 'down')}
                                >
                                  <FaArrowDown />
                                </Button>
                              )}
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="p-1 text-primary"
                                onClick={() => openQuestionModal(question)}
                              >
                                <FaPencilAlt />
                              </Button>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="p-1 text-danger"
                                onClick={() => handleDeleteQuestion(question)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </div>
                          <div className="d-flex align-items-center">
                            <small className="text-muted me-2">Type:</small>
                            <small className="text-primary">
                              {question.question_type === 'rating' ? 'Rating (1-10)' : 
                               question.question_type === 'text' ? 'Text Response' : 
                               question.question_type === 'multiple_choice' ? 'Multiple Choice' : 
                               'Yes/No'}
                            </small>
                          </div>
                          {question.question_type === 'multiple_choice' && question.options?.options && (
                            <div className="mt-1">
                              <small className="text-muted">Options:</small>
                              <div className="d-flex flex-wrap mt-1">
                                {question.options.options.map((option, i) => (
                                  <span 
                                    key={i}
                                    className="badge bg-light text-dark me-1 mb-1"
                                  >
                                    {option}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted">No questions in this template</p>
                    <Button 
                      variant="primary" 
                      onClick={() => openQuestionModal()}
                    >
                      <FaPlus className="me-1" /> Add First Question
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">Select a template to view or add questions</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Template Modal */}
      <Modal show={showTemplateModal} onHide={() => setShowTemplateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{isEditMode ? 'Edit Template' : 'Create Template'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={templateForm.title}
                onChange={handleTemplateFormChange}
                placeholder="Enter template title"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={templateForm.description}
                onChange={handleTemplateFormChange}
                placeholder="Enter template description (optional)"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="is_active"
                name="is_active"
                label="Active"
                checked={templateForm.is_active}
                onChange={handleTemplateFormChange}
              />
              <Form.Text className="text-muted">
                Inactive templates won't be available for new surveys
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="auto_send"
                name="auto_send"
                label="Auto-send"
                checked={templateForm.auto_send}
                onChange={handleTemplateFormChange}
              />
              <Form.Text className="text-muted">
                Automatically send surveys based on frequency
              </Form.Text>
            </Form.Group>
            
            {templateForm.auto_send && (
              <Form.Group className="mb-3">
                <Form.Label>Frequency</Form.Label>
                <Form.Select
                  name="frequency"
                  value={templateForm.frequency}
                  onChange={handleTemplateFormChange}
                >
                  <option value="">Select frequency</option>
                  <option value="after_job">After job completion</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </Form.Select>
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTemplateModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveTemplate}
          >
            {isEditMode ? 'Update Template' : 'Create Template'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Question Modal */}
      <Modal show={showQuestionModal} onHide={() => setShowQuestionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{isEditMode ? 'Edit Question' : 'Add Question'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Question</Form.Label>
              <Form.Control
                type="text"
                name="question"
                value={questionForm.question}
                onChange={handleQuestionFormChange}
                placeholder="Enter your question"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Question Type</Form.Label>
              <Form.Select
                name="question_type"
                value={questionForm.question_type}
                onChange={handleQuestionFormChange}
              >
                <option value="rating">Rating (1-10)</option>
                <option value="text">Text Response</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="boolean">Yes/No</option>
              </Form.Select>
            </Form.Group>
            
            {questionForm.question_type === 'multiple_choice' && (
              <Form.Group className="mb-3">
                <Form.Label>Options</Form.Label>
                <div className="d-flex mb-2">
                  <Form.Control
                    type="text"
                    value={currentOption}
                    onChange={(e) => setCurrentOption(e.target.value)}
                    placeholder="Add an option"
                    className="me-2"
                  />
                  <Button 
                    variant="primary" 
                    onClick={handleAddOption}
                    disabled={!currentOption.trim()}
                  >
                    Add
                  </Button>
                </div>
                
                {questionForm.options.length > 0 ? (
                  <ListGroup>
                    {questionForm.options.map((option, index) => (
                      <ListGroup.Item 
                        key={index}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <span>{option}</span>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 text-danger"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <FaTrash />
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <Alert variant="warning">
                    <FaExclamationTriangle className="me-2" />
                    Add at least two options for multiple choice questions
                  </Alert>
                )}
              </Form.Group>
            )}
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="required"
                name="required"
                label="Required"
                checked={questionForm.required}
                onChange={handleQuestionFormChange}
              />
              <Form.Text className="text-muted">
                Respondents must answer required questions
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQuestionModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveQuestion}
            disabled={
              !questionForm.question.trim() || 
              (questionForm.question_type === 'multiple_choice' && questionForm.options.length < 2)
            }
          >
            {isEditMode ? 'Update Question' : 'Add Question'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SurveyTemplates; 