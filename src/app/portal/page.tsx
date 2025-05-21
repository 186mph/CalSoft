import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "../../components/ui/Button"
import Card from "../../components/ui/Card"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/Card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/Tabs"
import { Badge } from "../../components/ui"
import { ChevronRight, Building, MapPin, Bell, User as UserIcon, Settings, LogOut, FileText, Eye, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../lib/AuthContext"
import { useDivision } from '../../App'
import { ThemeToggle } from '../../components/theme/theme-toggle'
import { SettingsPopup } from '../../components/ui/SettingsPopup'
import { ProfileView } from "@/components/profile/ProfileView"
import { AboutPopup } from "@/components/ui/AboutPopup"
import { WelcomePopup } from "@/components/ui/WelcomePopup"
import { usePermissions } from '@/hooks/usePermissions'
import { Portal } from '@/lib/roles'
import { ChatButton } from '@/components/chat/ChatButton'
import { ShortcutDisplay } from '@/components/shortcuts/ShortcutDisplay'

export default function PortalLanding() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [isProfileViewOpen, setIsProfileViewOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { setDivision } = useDivision();
  const { isAdmin, checkPortalAccess } = usePermissions();

  // Initialize showShortcuts from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('showShortcuts');
    if (savedPreference !== null) {
      setShowShortcuts(savedPreference === 'true');
    }
  }, []);

  // Save showShortcuts preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('showShortcuts', showShortcuts.toString());
  }, [showShortcuts]);

  useEffect(() => {
    const division = searchParams.get('division');
    if (division) {
      // Set the active tab based on the division
      if (['north_alabama', 'tennessee', 'georgia', 'international'].includes(division)) {
        setActiveTab("tech");
      } else if (['calibration', 'armadillo', 'scavenger'].includes(division)) {
        setActiveTab("tech");
      } else if (['office_admin', 'sales', 'engineering'].includes(division)) {
        setActiveTab("admin");
      }
    }
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/login';
    } finally {
      setIsSigningOut(false);
    }
  };

  const handlePortalClick = (portalName: string, url?: string) => {
    // Map portal names to their corresponding portal types
    const portalMap: Record<string, Portal> = {
      "Sales Portal": "sales",
      "NETA Portal": "neta",
      "Lab Portal": "lab",
      "HR Portal": "hr",
      "Office Admins Portal": "office",
      "Engineering Portal": "engineering",
      "Scavenger Portal": "scavenger" // Scavenger portal has its own portal type
    };

    // Map portal names to their URLs if not provided
    const portalUrls: Record<string, string> = {
      "Sales Portal": "/sales-dashboard",
      "NETA Portal": "/neta",
      "Lab Portal": "/lab",
      "HR Portal": "/hr",
      "Office Admins Portal": "/office",
      "Engineering Portal": "/engineering", // Updated to use the new engineering page
      "Scavenger Portal": "/scavenger"
    };

    const portalType = portalMap[portalName];
    if (portalType && !checkPortalAccess(portalType)) {
      setPopupContent("Your current role does not have access to this portal. Please request an updated role and await admin approval.");
      setShowPopup(true);
      return;
    }

    // Update the division based on which portal is clicked
    if (portalName === "Engineering Portal") {
      setDivision("engineering");
    } else if (portalName === "Sales Portal") {
      setDivision("sales");
    } else if (portalName === "Lab Portal") {
      setDivision("lab");
    } else if (portalType) {
      setDivision(portalType);
    }

    // Navigate to the selected portal
    if (url) {
      if (url.startsWith('http')) {
        window.location.href = url;
      } else {
        navigate(url);
      }
    } else if (portalUrls[portalName]) {
      navigate(portalUrls[portalName]);
    } else {
      setPopupContent(`${portalName} is currently in development`);
      setShowPopup(true);
    }
  };

  const handleDivisionClick = (division: string) => {
    try {
      console.log('handleDivisionClick called with division:', division);
      
      // Map divisions to their corresponding portal types
      const divisionMap: Record<string, Portal> = {
        'north_alabama': 'neta',
        'tennessee': 'neta',
        'georgia': 'neta',
        'international': 'neta',
        'calibration': 'lab',
        'armadillo': 'lab',
        'scavenger': 'scavenger',
        'office_admin': 'office',
        'sales': 'sales',
        'engineering': 'engineering'
      };

      const portalType = divisionMap[division];
      if (portalType && !checkPortalAccess(portalType)) {
        setPopupContent("Your current role does not have access to this portal. Please request an updated role and await admin approval.");
        setShowPopup(true);
        return;
      }
      
      // Set the division in context
      setDivision(division);
      console.log('Division set in context');
      
      // Verify the division was set
      const savedDivision = localStorage.getItem('selectedDivision');
      console.log('Verified division in localStorage:', savedDivision);
      
      // Construct the target path
      const targetPath = `/${division}/dashboard`;
      console.log('Navigating to:', targetPath);
      
      // Navigate to the dashboard
      navigate(targetPath);
    } catch (error) {
      console.error('Error in handleDivisionClick:', error);
      setPopupContent("Your current role does not have access to this portal. Please request an updated role and await admin approval.");
      setShowPopup(true);
    }
  };

  const handleOtherPortalClick = (path: string) => {
    setDivision(null);
    navigate(path);
  };

  const handleViewProfile = () => {
    setIsProfileMenuOpen(false);
    setIsProfileViewOpen(true);
  };

  const handleSettings = () => {
    setIsProfileMenuOpen(false);
    setSettingsMenuOpen(true);
  };

  const handleAbout = () => {
    setIsProfileMenuOpen(false);
    setIsAboutOpen(true);
  };
  
  const handleWelcome = () => {
    setIsWelcomeOpen(true);
  };

  // Handle backdrop click for the generic popup
  const handleGenericPopupBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click is directly on the backdrop itself
    if (e.target === e.currentTarget) {
      setShowPopup(false);
    }
  };

  // Toggle shortcuts visibility
  const toggleShortcuts = () => {
    setShowShortcuts(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-dark-background dark:text-dark-800">
      {/* Standard Header */}
      <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-sm dark:bg-dark-150/75 dark:border-dark-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo */}
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AMP%20Logo-FdmXGeXuGBlr2AcoAFFlM8AqzmoyM1.png"
              alt="AMP Logo"
              className="h-12"
            />
            {/* Right side - user menu */}
            <div className="flex items-center">
              <ChatButton />
              <div className="relative" ref={profileMenuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-10 h-10 hover:bg-gray-100 dark:hover:bg-dark-50 p-0 overflow-hidden"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                >
                  {user?.user_metadata?.profileImage ? (
                    <img
                      src={user.user_metadata.profileImage}
                      alt="Profile"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-5 w-5 text-gray-600 dark:text-dark-400" />
                  )}
                </Button>
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-md bg-white dark:bg-dark-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-dark-200">
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-900">
                          {user?.user_metadata?.name || 'User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-dark-400 truncate">
                          {user?.user_metadata?.role || 'No role assigned'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-dark-500 truncate mt-1">
                          {user?.email || 'Loading...'}
                        </p>
                      </div>
                      <button
                        onClick={handleViewProfile}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-[#f26722] hover:bg-gray-100 dark:hover:bg-dark-50"
                      >
                        <Eye className="mr-3 h-5 w-5 text-gray-400 dark:text-[#f26722]" />
                        View Profile
                      </button>
                      <button
                        onClick={handleSettings}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-[#f26722] hover:bg-gray-100 dark:hover:bg-dark-50"
                      >
                        <Settings className="mr-3 h-5 w-5 text-gray-400 dark:text-[#f26722]" />
                        Settings
                      </button>
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-[#f26722] hover:bg-gray-100 dark:hover:bg-dark-50"
                      >
                        <LogOut className="mr-3 h-5 w-5 text-gray-400 dark:text-[#f26722]" />
                        {isSigningOut ? 'Signing out...' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Popup */}
      <SettingsPopup 
        isOpen={settingsMenuOpen} 
        onClose={() => setSettingsMenuOpen(false)} 
        onAbout={handleAbout}
        currentUser={{
          name: user?.user_metadata?.name,
          email: user?.email,
          role: user?.user_metadata?.role
        }}
      />
      
      <ProfileView 
        isOpen={isProfileViewOpen} 
        onClose={() => setIsProfileViewOpen(false)} 
      />
      
      <AboutPopup 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
      />
      
      <WelcomePopup 
        isOpen={isWelcomeOpen} 
        onClose={() => setIsWelcomeOpen(false)}
        isNewUser={false} 
        userEmail={user?.email}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gray-50 dark:bg-dark-100 dark:border-dark-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16">
            <div className="inline-flex px-2.5 py-1 rounded-full bg-orange-50 text-orange-500 dark:bg-dark-700/20 dark:text-white text-sm font-medium mb-6">
              Welcome
            </div>
            <h1 className="text-[56px] font-bold tracking-tight text-gray-900 dark:text-white mb-4">AMP Portal System</h1>
            <p className="text-lg text-gray-600 dark:text-white mb-8 max-w-[640px]">
              Access the tools and resources you need through our streamlined portal system.
            </p>
            <div className="flex gap-3">
              <Button 
                className="bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 px-8 text-base rounded-full inline-flex items-center whitespace-nowrap"
                onClick={handleWelcome}
              >
                Get Started <span className="ml-1">›</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-11 px-5 text-base rounded-md border-gray-200 text-gray-600 hover:text-gray-900 dark:border-dark-300 dark:text-white dark:hover:text-white dark:hover:bg-dark-700/20"
                onClick={handleAbout}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* User Shortcuts Section */}
      <div className="mt-10 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-2 px-4 sm:px-6 lg:px-8">
          <h3 className="text-lg font-medium">My Shortcuts</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleShortcuts} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            {showShortcuts ? (
              <>Hide <ChevronUp className="ml-1 h-4 w-4" /></>
            ) : (
              <>Show <ChevronDown className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
        {showShortcuts && <ShortcutDisplay />}
      </div>

      {/* Portal Section */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="space-y-3 text-center mb-16">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">Select Your Portal</h2>
          <p className="text-lg text-gray-600 dark:text-white max-w-2xl mx-auto">
            Choose the appropriate portal to access specialized tools and resources.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-12">
            <TabsList className="inline-flex bg-gray-100 dark:bg-dark-200 p-1.5 rounded-lg gap-1">
              <TabsTrigger value="all" className="px-6 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-dark-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">All Portals</TabsTrigger>
              <TabsTrigger value="tech" className="px-6 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-dark-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">Technician</TabsTrigger>
              <TabsTrigger value="admin" className="px-6 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-dark-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">Administrative</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* NETA Technician Group */}
              {/* North Alabama Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-rose-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-rose-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">North Alabama Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Field services and operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">NETA Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Work orders</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Field</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Scheduling</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical resources</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('north_alabama')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Tennessee Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-emerald-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Tennessee Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Field services and operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">NETA Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Work orders</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Field</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Scheduling</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical resources</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('tennessee')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Georgia Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-blue-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-blue-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Georgia Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Field services and operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">NETA Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Work orders</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Field</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Scheduling</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical resources</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('georgia')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* International Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-sky-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-sky-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">International Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">International operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">NETA Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Global projects</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">International</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Resource coordination</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical support</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('international')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Other Technician Group */}
              {/* Calibration Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-indigo-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-indigo-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Calibration Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Calibration services and management</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Lab Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Calibration orders</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Service</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Equipment tracking</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Inventory</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical resources</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('calibration')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Armadillo Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-amber-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-amber-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Armadillo Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Specialized field services</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Lab Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Service requests</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Field</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Equipment management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Assets</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical support</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('armadillo')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Scavenger Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-purple-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-purple-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Scavenger Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Specialized technical operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Scavs</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Operations</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Technical</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Resource planning</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Equipment tracking</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Assets</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('scavenger')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Admin Group */}
              {/* HR Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-rose-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-rose-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">HR Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Human resources management</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">HR Reps</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Employee management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">HR</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Benefits administration</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Admin</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Policy management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Documents</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handlePortalClick("HR Portal", '/hr')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Office Admins Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-violet-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-violet-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Office Admins Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Administrative operations and management</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Office Admins</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Office management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Admin</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Resource allocation</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Administrative tasks</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Operations</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handlePortalClick("Office Admins Portal", '/office')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Other Roles Group */}
              {/* Sales Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-emerald-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Sales Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Sales operations and management</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Sales Reps</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Sales pipeline</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Sales</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Customer management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">CRM</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Opportunity tracking</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Pipeline</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handlePortalClick("Sales Portal", '/sales-dashboard')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Engineering Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-cyan-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-cyan-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Engineering Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Engineering and technical resources</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Engineering</Badge>
                </CardHeader>
                
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Design approval</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Workflow</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical documentation</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Library</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Standards compliance</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Updates</Badge>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handlePortalClick("Engineering Portal", '/engineering/dashboard')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tech">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* NETA Technician Group */}
              {/* North Alabama Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-rose-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-rose-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">North Alabama Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Field services and operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">NETA Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Work orders</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Field</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Scheduling</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical resources</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('north_alabama')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Tennessee Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-emerald-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Tennessee Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Field services and operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">NETA Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Work orders</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Field</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Scheduling</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical resources</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('tennessee')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Georgia Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-blue-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-blue-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Georgia Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Field services and operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">NETA Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Work orders</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Field</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Scheduling</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical resources</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('georgia')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* International Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-sky-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-sky-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">International Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">International operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">NETA Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Global projects</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">International</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Resource coordination</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical support</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('international')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Other Technician Group */}
              {/* Calibration Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-indigo-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-indigo-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Calibration Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Calibration services and management</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Lab Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Calibration orders</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Service</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Equipment tracking</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Inventory</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical resources</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('calibration')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Armadillo Division */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-amber-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-amber-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Armadillo Division</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Specialized field services</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Lab Technicians</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Service requests</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Field</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Equipment management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Assets</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical support</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Support</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('armadillo')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Scavenger Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-purple-50 dark:bg-dark-700/20">
                      <MapPin className="h-5 w-5 text-purple-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Scavenger Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Specialized technical operations</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Scavs</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Operations</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Technical</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Resource planning</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Equipment tracking</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Assets</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handleDivisionClick('scavenger')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="admin">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Admin Portal - Only visible to admins */}
              {isAdmin && (
                <Card className="border border-gray-200 dark:border-dark-300">
                  <CardHeader className="flex flex-row items-start justify-between p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-full bg-purple-50 dark:bg-dark-700/20">
                        <Shield className="h-5 w-5 text-purple-500 dark:text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Admin Portal</CardTitle>
                        <CardDescription className="text-sm text-gray-500 dark:text-white/70">System administration and management</CardDescription>
                      </div>
                    </div>
                    <Badge className="!bg-purple-500 !text-white px-2.5 py-1 text-xs font-medium">Admin Only</Badge>
                  </CardHeader>
                  <CardContent className="px-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-white">User management</span>
                        <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Users</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-white">Role management</span>
                        <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Roles</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-white">System settings</span>
                        <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Settings</Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="px-6 pb-6 pt-0">
                    <Button 
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                      onClick={() => handleOtherPortalClick('/admin-dashboard')}
                    >
                      Access Portal <span className="ml-1">›</span>
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* HR Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-rose-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-rose-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">HR Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Human resources management</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">HR Reps</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Employee management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">HR</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Benefits administration</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Admin</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Policy management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Documents</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handlePortalClick("HR Portal", '/hr')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Office Admins Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-violet-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-violet-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Office Admins Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Administrative operations and management</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Office Admins</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Office management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Admin</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Resource allocation</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Planning</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Administrative tasks</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Operations</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handlePortalClick("Office Admins Portal", '/office')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Other Roles Group */}
              {/* Sales Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-emerald-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Sales Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Sales operations and management</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Sales Reps</Badge>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Sales pipeline</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Sales</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Customer management</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">CRM</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Opportunity tracking</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Pipeline</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handlePortalClick("Sales Portal", '/sales-dashboard')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Engineering Portal */}
              <Card className="border border-gray-200 dark:border-dark-300">
                <CardHeader className="flex flex-row items-start justify-between p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-cyan-50 dark:bg-dark-700/20">
                      <Building className="h-5 w-5 text-cyan-500 dark:text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">Engineering Portal</CardTitle>
                      <CardDescription className="text-sm text-gray-500 dark:text-white/70">Engineering and technical resources</CardDescription>
                    </div>
                  </div>
                  <Badge className="!bg-[#f26722] !text-white px-2.5 py-1 text-xs font-medium">Engineering</Badge>
                </CardHeader>
                
                <CardContent className="px-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Design approval</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Workflow</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Technical documentation</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Library</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-white">Standards compliance</span>
                      <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 text-gray-500 dark:text-white bg-gray-50 dark:bg-dark-700/20">Updates</Badge>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className="w-full bg-[#f26722] hover:bg-[#f26722]/90 text-white h-11 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm"
                    onClick={() => handlePortalClick("Engineering Portal", '/engineering/dashboard')}
                  >
                    Access Portal <span className="ml-1">›</span>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Popup */}
      {showPopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleGenericPopupBackdropClick} // Add onClick here
        >
          <div 
            className="bg-white dark:bg-dark-150 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the content
          >
            <div className="text-gray-900 dark:text-dark-900 mb-4 text-center">{popupContent}</div>
            <div className="flex justify-center">
              <Button 
                className="bg-[#f26722] hover:bg-[#f26722]/90 text-white px-8 py-2 rounded-md dark:bg-amp-gold-600 dark:hover:bg-amp-gold-700"
                onClick={() => setShowPopup(false)}
              >
                Okay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 