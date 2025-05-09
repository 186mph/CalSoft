import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { schedulingService } from '@/lib/services/schedulingService';
import { 
  TechnicianSkill,
  PortalType
} from '@/lib/types/scheduling';
import { User } from '@/lib/types/auth';
import { Button } from '@/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Select from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { 
  UserCircle, 
  Save, 
  Plus, 
  XCircle, 
  Award, 
  Wrench, 
  Clock, 
  CalendarClock,
  AlertTriangle,
  Shield
} from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface TechnicianProfileManagementProps {
  portalType: PortalType;
  division?: string;
}

// Skill creation/edit form
interface SkillForm {
  userId: string;
  skillName: string;
  proficiencyLevel: number;
  certification: boolean;
  certificationDate: string; 
  expirationDate: string;
  notes: string;
}

export function TechnicianProfileManagement({ portalType, division }: TechnicianProfileManagementProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [technicianData, setTechnicianData] = useState<User | null>(null);
  const [skills, setSkills] = useState<TechnicianSkill[]>([]);
  const [hasAdminPermission, setHasAdminPermission] = useState<boolean | null>(null);
  
  // Form states
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  
  const [skillForm, setSkillForm] = useState<SkillForm>({
    userId: '',
    skillName: '',
    proficiencyLevel: 3,
    certification: false,
    certificationDate: '',
    expirationDate: '',
    notes: ''
  });

  // Perform a quick permission check
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Try to perform a simple admin query
        const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
        
        if (error) {
          console.log('User does not have admin permissions:', error);
          setHasAdminPermission(false);
        } else {
          console.log('User has admin permissions');
          setHasAdminPermission(true);
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
        setHasAdminPermission(false);
      }
    };
    
    if (user) {
      checkPermissions();
    }
  }, [user]);

  // Fetch all technicians for the division
  useEffect(() => {
    const fetchTechnicians = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching technicians for division:', division);
        // Get all users with technician role in this portal
        const { data: userData, error: userError } = await supabase
          .from('auth.users')
          .select('id, email, raw_user_meta_data')
          .eq('raw_user_meta_data->>role', 'NETA Technician')
          .order('raw_user_meta_data->>name');
        
        if (userError) {
          console.error("Error accessing auth.users table:", userError);
          console.log("Attempting to use auth.admin.listUsers() instead...");
          
          // Try alternative approach with auth schema
          const { data: userData2, error: userError2 } = await supabase.auth.admin.listUsers();
          
          if (userError2) {
            console.error("Error fetching technicians with admin API:", userError2);
            setError("Failed to load technicians list. This may be due to missing permissions.");
            return;
          }
          
          console.log("Admin API returned users:", userData2?.users?.length || 0);
          
          // Filter for technicians
          const techUsers = userData2.users.filter(u => {
            const isTech = u.user_metadata?.role === 'NETA Technician';
            const inDivision = !division || u.user_metadata?.division === division;
            return isTech && inDivision;
          });
          
          console.log("Filtered technicians:", techUsers.length);
          setTechnicians(techUsers as User[]);
          
          // Set current user as selected if they're a technician
          const currentUserAsTech = techUsers.find(tech => tech.id === user?.id);
          if (currentUserAsTech) {
            setSelectedTechnician(currentUserAsTech.id);
            setTechnicianData(currentUserAsTech as User);
            setSkillForm(prev => ({ ...prev, userId: currentUserAsTech.id }));
          } else if (techUsers.length > 0) {
            setSelectedTechnician(techUsers[0].id);
            setTechnicianData(techUsers[0] as User);
            setSkillForm(prev => ({ ...prev, userId: techUsers[0].id }));
          }
        } else {
          console.log("Successfully fetched users from auth.users:", userData?.length || 0);
          
          // Format the data to match User type
          const formattedUsers = userData.map(u => ({
            id: u.id,
            email: u.email,
            user_metadata: u.raw_user_meta_data,
            app_metadata: {},
            aud: '',
            created_at: ''
          })) as User[];
          
          // Filter for division if specified
          const filteredUsers = division 
            ? formattedUsers.filter(u => u.user_metadata?.division === division)
            : formattedUsers;
            
          console.log("Filtered users by division:", filteredUsers.length);
          setTechnicians(filteredUsers);
          
          // Set current user as selected if they're a technician
          const currentUserAsTech = filteredUsers.find(tech => tech.id === user?.id);
          if (currentUserAsTech) {
            setSelectedTechnician(currentUserAsTech.id);
            setTechnicianData(currentUserAsTech);
            setSkillForm(prev => ({ ...prev, userId: currentUserAsTech.id }));
          } else if (filteredUsers.length > 0) {
            setSelectedTechnician(filteredUsers[0].id);
            setTechnicianData(filteredUsers[0]);
            setSkillForm(prev => ({ ...prev, userId: filteredUsers[0].id }));
          }
        }
      } catch (err) {
        console.error("Exception in fetchTechnicians:", err);
        setError("An unexpected error occurred while loading technicians. Check browser console for details.");
        setTechnicians([]); // Ensure empty array to trigger "No Technicians" message
      } finally {
        setIsLoading(false);
      }
    };

    fetchTechnicians();
  }, [user, division, portalType]);

  // Fetch skills when selected technician changes
  useEffect(() => {
    const fetchSkills = async () => {
      if (!selectedTechnician) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await schedulingService.getTechnicianSkills(selectedTechnician, portalType);
        if (error) {
          console.error("Error fetching skills:", error);
          setError("Failed to load technician skills.");
        } else {
          setSkills(data || []);
        }
        
        // Update technician data
        const selectedTech = technicians.find(t => t.id === selectedTechnician);
        setTechnicianData(selectedTech || null);
      } catch (err) {
        console.error("Exception fetching skills:", err);
        setError("An unexpected error occurred while loading skills.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSkills();
  }, [selectedTechnician, portalType, technicians]);

  // Form handlers
  const handleTechnicianChange = (techId: string) => {
    setSelectedTechnician(techId);
    setSkillForm(prev => ({ ...prev, userId: techId }));
  };

  const handleAddSkill = async () => {
    setIsLoading(true);
    try {
      const skillData = {
        user_id: skillForm.userId,
        skill_name: skillForm.skillName,
        proficiency_level: skillForm.proficiencyLevel,
        certification: skillForm.certification ? 'true' : 'false',
        certification_date: skillForm.certificationDate || undefined,
        expiration_date: skillForm.expirationDate || undefined,
        notes: skillForm.notes,
        portal_type: portalType,
      };
      
      const { error } = await schedulingService.saveTechnicianSkill(skillData);
      
      if (error) {
        console.error("Error adding skill:", error);
        setError("Failed to save skill.");
      } else {
        // Refresh skills
        const { data: newData } = await schedulingService.getTechnicianSkills(
          selectedTechnician, 
          portalType
        );
        setSkills(newData || []);
        setShowSkillForm(false);
        // Reset form
        setSkillForm({
          userId: selectedTechnician,
          skillName: '',
          proficiencyLevel: 3,
          certification: false,
          certificationDate: '',
          expirationDate: '',
          notes: ''
        });
        setEditingSkillId(null);
      }
    } catch (err) {
      console.error("Exception adding skill:", err);
      setError("An unexpected error occurred while saving skill.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!window.confirm('Are you sure you want to delete this skill?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await schedulingService.deleteTechnicianSkill(skillId);
      if (error) {
        console.error("Error deleting skill:", error);
        setError("Failed to delete skill.");
      } else {
        setSkills(skills.filter(s => s.id !== skillId));
      }
    } catch (err) {
      console.error("Exception deleting skill:", err);
      setError("An unexpected error occurred while deleting skill.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSkill = (skill: TechnicianSkill) => {
    setSkillForm({
      userId: skill.user_id,
      skillName: skill.skill_name,
      proficiencyLevel: skill.proficiency_level || 3,
      certification: skill.certification === 'true',
      certificationDate: skill.certification_date || '',
      expirationDate: skill.expiration_date || '',
      notes: skill.notes || ''
    });
    setEditingSkillId(skill.id);
    setShowSkillForm(true);
  };

  // Get certification status including approaching expiration
  const getCertificationStatus = (skill: TechnicianSkill): { status: 'valid' | 'approaching' | 'expired'; daysRemaining?: number } => {
    if (!skill.expiration_date) return { status: 'valid' };
    
    const today = dayjs();
    const expirationDate = dayjs(skill.expiration_date);
    const daysRemaining = expirationDate.diff(today, 'day');
    
    if (daysRemaining < 0) return { status: 'expired', daysRemaining: 0 };
    if (daysRemaining < 30) return { status: 'approaching', daysRemaining };
    return { status: 'valid', daysRemaining };
  };

  // Get color class based on proficiency level
  const getProficiencyColor = (level: number | undefined): string => {
    switch(level || 3) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-green-100 text-green-800';
      case 5: return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get proficiency label
  const getProficiencyLabel = (level: number | undefined): string => {
    switch(level || 3) {
      case 1: return 'Novice';
      case 2: return 'Beginner';
      case 3: return 'Intermediate';
      case 4: return 'Advanced';
      case 5: return 'Expert';
      default: return 'Unknown';
    }
  };

  // Prepare options for the technician select
  const technicianOptions = technicians.map(tech => ({
    value: tech.id,
    label: tech.user_metadata?.name || tech.email || 'Unknown'
  }));

  return (
    <div className="container mx-auto px-4 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-6">
          <CardTitle className="text-xl font-bold">Technician Profile Management</CardTitle>
          <div className="flex space-x-2">
            <Select
              value={selectedTechnician}
              onChange={(e) => handleTechnicianChange(e.target.value)}
              options={technicianOptions}
              className="w-[220px]"
              aria-label="Select Technician"
              disabled={isLoading || technicians.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md">
              {error}
              <button className="ml-2 text-red-600" onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          {hasAdminPermission === false && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start">
                <Shield className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-800">Missing Admin Permissions</h3>
                  <p className="text-amber-700 mt-1">
                    This component requires admin permissions to access the user list. Your current access level doesn't allow 
                    managing technicians. Contact your administrator for assistance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {technicians.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-md">
              <UserCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <h3 className="text-lg font-medium mb-1">No Technicians Found</h3>
              <p className="text-gray-600 mb-4">
                To use this feature, you need to add users with the "NETA Technician" role.
              </p>
              <div className="text-left max-w-lg mx-auto">
                <h4 className="font-medium mb-1">How to add technicians:</h4>
                <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                  <li>Go to your Supabase Authentication dashboard</li>
                  <li>Create new users or edit existing users</li>
                  <li>Set their user metadata to include <code className="px-1 py-0.5 bg-gray-100 rounded">{'{"role": "NETA Technician"}'}</code></li>
                  <li>Optionally assign them to a division with <code className="px-1 py-0.5 bg-gray-100 rounded">{'{"division": "division_name"}'}</code></li>
                  <li>Refresh this page to see the technicians</li>
                </ol>
              </div>
            </div>
          ) : (
            <>
              {/* Technician Profile Information */}
              {technicianData && (
                <div className="mb-6">
                  <div className="flex items-start space-x-6">
                    <div className="p-2 bg-blue-50 rounded-full">
                      <UserCircle className="h-16 w-16 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {technicianData.user_metadata?.name || 'Unknown'}
                      </h2>
                      <p className="text-gray-600">{technicianData.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          {technicianData.user_metadata?.role || 'Technician'}
                        </Badge>
                        {technicianData.user_metadata?.division && (
                          <Badge className="bg-purple-100 text-purple-800">
                            {technicianData.user_metadata.division}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Tabs defaultValue="skills">
                <TabsList className="mb-4">
                  <TabsTrigger value="skills">Skills & Certifications</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule & Availability</TabsTrigger>
                  <TabsTrigger value="assignments">Job Assignments</TabsTrigger>
                </TabsList>

                <TabsContent value="skills">
                  <div className="mb-4 flex justify-end">
                    <Button
                      onClick={() => {
                        setShowSkillForm(true);
                        setEditingSkillId(null);
                        setSkillForm({
                          userId: selectedTechnician,
                          skillName: '',
                          proficiencyLevel: 3,
                          certification: false,
                          certificationDate: '',
                          expirationDate: '',
                          notes: ''
                        });
                      }}
                      disabled={!selectedTechnician || isLoading}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Skill
                    </Button>
                  </div>

                  {showSkillForm && (
                    <Card className="mb-6 border-2 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-md">
                          {editingSkillId ? 'Edit Skill' : 'Add New Skill'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Skill Name
                            </label>
                            <input
                              type="text"
                              value={skillForm.skillName}
                              onChange={(e) => setSkillForm({
                                ...skillForm,
                                skillName: e.target.value
                              })}
                              placeholder="e.g., Circuit Troubleshooting, Cable Testing"
                              className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Proficiency Level
                            </label>
                            <Select
                              value={skillForm.proficiencyLevel.toString()}
                              onChange={(e) => setSkillForm({
                                ...skillForm,
                                proficiencyLevel: parseInt(e.target.value)
                              })}
                              options={[
                                { value: '1', label: '1 - Novice' },
                                { value: '2', label: '2 - Beginner' },
                                { value: '3', label: '3 - Intermediate' },
                                { value: '4', label: '4 - Advanced' },
                                { value: '5', label: '5 - Expert' }
                              ]}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Certification
                            </label>
                            <Select
                              value={skillForm.certification.toString()}
                              onChange={(e) => setSkillForm({
                                ...skillForm,
                                certification: e.target.value === 'true'
                              })}
                              options={[
                                { value: 'true', label: 'Yes - Certified' },
                                { value: 'false', label: 'No - Experience Only' }
                              ]}
                            />
                          </div>
                          {skillForm.certification && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Certification Date
                                </label>
                                <input
                                  type="date"
                                  value={skillForm.certificationDate}
                                  onChange={(e) => setSkillForm({
                                    ...skillForm,
                                    certificationDate: e.target.value
                                  })}
                                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Expiration Date
                                </label>
                                <input
                                  type="date"
                                  value={skillForm.expirationDate}
                                  onChange={(e) => setSkillForm({
                                    ...skillForm,
                                    expirationDate: e.target.value
                                  })}
                                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                />
                              </div>
                            </>
                          )}
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={skillForm.notes}
                              onChange={(e) => setSkillForm({
                                ...skillForm,
                                notes: e.target.value
                              })}
                              placeholder="Additional details about experience or certification"
                              className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 min-h-[100px]"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowSkillForm(false);
                              setEditingSkillId(null);
                            }}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddSkill}
                            disabled={isLoading || !skillForm.skillName}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {editingSkillId ? 'Update Skill' : 'Save Skill'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-4">
                    {isLoading ? (
                      <p>Loading skills...</p>
                    ) : skills.length === 0 ? (
                      <p>No skills or certifications recorded for this technician.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {skills.map((skill) => {
                          const certStatus = getCertificationStatus(skill);
                          return (
                            <Card 
                              key={skill.id} 
                              className="border border-gray-200 hover:shadow-md transition-shadow"
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between">
                                  <div>
                                    <div className="flex items-center">
                                      <h3 className="font-semibold text-lg">{skill.skill_name}</h3>
                                      <Badge className={`ml-2 ${getProficiencyColor(skill.proficiency_level)}`}>
                                        {getProficiencyLabel(skill.proficiency_level)}
                                      </Badge>
                                    </div>
                                    
                                    {/* Certification info */}
                                    {skill.certification && (
                                      <div className="mt-2">
                                        <div className="flex items-center text-sm text-gray-600">
                                          <Award className="h-4 w-4 mr-1" />
                                          <span>
                                            Certified: {skill.certification_date ? dayjs(skill.certification_date).format('MMM D, YYYY') : 'Yes'}
                                          </span>
                                        </div>
                                        
                                        {skill.expiration_date && (
                                          <div className="flex items-center text-sm mt-1">
                                            <CalendarClock className="h-4 w-4 mr-1" />
                                            <span className={
                                              certStatus.status === 'expired' ? 'text-red-600' : 
                                              certStatus.status === 'approaching' ? 'text-amber-600' : 
                                              'text-gray-600'
                                            }>
                                              Expires: {dayjs(skill.expiration_date).format('MMM D, YYYY')} 
                                              {certStatus.status === 'approaching' && certStatus.daysRemaining && (
                                                <span className="ml-1 font-medium">
                                                  (in {certStatus.daysRemaining} days)
                                                </span>
                                              )}
                                              {certStatus.status === 'expired' && (
                                                <span className="ml-1 font-medium">
                                                  (EXPIRED)
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Notes (if any) */}
                                    {skill.notes && (
                                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 truncate max-w-md">
                                        {skill.notes}
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditSkill(skill)}
                                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Wrench className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteSkill(skill.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="schedule">
                  <div className="p-4 bg-gray-50 rounded-md text-center">
                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium mb-1">Schedule Management</h3>
                    <p className="text-gray-600 mb-3">
                      View and manage technician availability in the Schedule Management page.
                    </p>
                    <Button
                      onClick={() => navigate(`/${division}/schedule`)}
                    >
                      Go to Schedule Management
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="assignments">
                  <div className="p-4 bg-gray-50 rounded-md text-center">
                    <Award className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium mb-1">Job Assignment Management</h3>
                    <p className="text-gray-600 mb-3">
                      View and manage technician job assignments in the Job Assignment page.
                    </p>
                    <Button
                      onClick={() => navigate(`/${division}/assignments`)}
                    >
                      Go to Job Assignments
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}