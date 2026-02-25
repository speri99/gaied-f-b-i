"use client";

import { useEffect, useState } from "react";
import { Case } from "@/types/case";
import { ContactRecord } from "@/types/contact";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, MessageSquare, Clock, CheckCircle2, AlertCircle, RefreshCw, FileText, Copy, Plus, Trash2, FileIcon } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ContactHistory } from "@/components/contact-history/ContactHistory";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShortenedUrlService } from "@/lib/services/shortened-url.service";
import { getAuthContext } from "@/lib/auth";
import { ContactMap } from "@/components/cases/ContactMap";
import { displayCaseId } from "@/lib/utils";
import { checkPermissions } from "@/middleware/permissions";
import { parseBase62Id } from "@/lib/utils";
import { CasePhoneIndex } from "@/types/case-phone-index";
import { normalizePhoneNumber } from "@/lib/utils";
import { getCountries, CountryCode, getCountryCallingCode } from "libphonenumber-js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ExportButton } from "@/components/cases/ExportButton";

interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
}

const COUNTRY_OPTIONS = getCountries().map(country => ({
  value: country,
  label: `${country} (+${getCountryCallingCode(country)})`
}));

const PHONE_LABEL_OPTIONS = [
  { value: "Home", label: "Home" },
  { value: "Work", label: "Work" },
  { value: "Mobile", label: "Mobile" },
  { value: "Other", label: "Other" },
] as const;

export default function CaseDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseNotes, setCaseNotes] = useState<any[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [contactStats, setContactStats] = useState<{
    totalAttempts: number;
    totalAcknowledged: number;
    lastContact: Date | null;
  }>({
    totalAttempts: 0,
    totalAcknowledged: 0,
    lastContact: null,
  });
  const [users, setUsers] = useState<Record<string, { firstName: string; lastName: string }>>({});
  const [templateData, setTemplateData] = useState<WebsiteTemplate | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<CasePhoneIndex[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("US");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPhoneLabel, setNewPhoneLabel] = useState("Mobile");
  const [isNewPhonePrimary, setIsNewPhonePrimary] = useState(false);
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isLoadingPhoneNumbers, setIsLoadingPhoneNumbers] = useState(false);

  // Note dialog state
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"case" | "contact">("case");
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null);

  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);

  // Add mapCenter state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0,
  });

  const [hasLocationAccess, setHasLocationAccess] = useState(false);

  const [authContext, setAuthContext] = useState<{ tenantId: string; userId: string } | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const context = await getAuthContext();
      setAuthContext(context);
    };
    initAuth();
  }, []);

  // Fetch user details
  const fetchUserDetails = async (userId: string) => {
    if (!userId || !authContext) return null;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          "x-tenant-id": authContext.tenantId,
          "x-user-id": authContext.userId,
        }
      });
      if (!response.ok) throw new Error('Failed to fetch user details');
      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  };

  // Load essential case data
  const fetchCaseDetails = async () => {
    if (!authContext) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch case details
      const caseResponse = await fetch(`/api/cases/${params.id}`, {
        headers: {
          "x-tenant-id": authContext.tenantId,
          "x-user-id": authContext.userId,
        }
      });
      if (!caseResponse.ok) {
        const errorData = await caseResponse.json().catch(() => null);
        console.error('Failed to fetch case details:', errorData);
        throw new Error(errorData?.error || 'Failed to fetch case details');
      }
      const caseData = await caseResponse.json();
      setCaseData(caseData);

      // Fetch shortened URL if website template exists
      if (caseData.websiteTemplateId) {
        try {
          const { base62Id } = parseBase62Id(caseData.Identifier);
          const urlResponse = await fetch(`/api/shortened-urls?caseId=${base62Id}`, {
            headers: {
              "x-tenant-id": authContext.tenantId,
              "x-user-id": authContext.userId,
            }
          });
          if (urlResponse.ok) {
            const urlData = await urlResponse.json();
            if (urlData.items && urlData.items.length > 0) {
              setShortenedUrl(`https://grs.sh/${urlData.items[0].code}`);
            }
          }
        } catch (error) {
          console.error('Error fetching shortened URL:', error);
        }
      }

      // Immediately fetch user details for case managers
      if (caseData.CaseManager || caseData.BackupCaseManager) {
        const [caseManagerData, backupCaseManagerData] = await Promise.all([
          caseData.CaseManager ? fetchUserDetails(caseData.CaseManager) : Promise.resolve(null),
          caseData.BackupCaseManager ? fetchUserDetails(caseData.BackupCaseManager) : Promise.resolve(null)
        ]);

        const newUsers = { ...users };
        const newCaseData = { ...caseData };
        
        if (caseManagerData && caseData.CaseManager) {
          newUsers[caseData.CaseManager] = caseManagerData;
          newCaseData.CaseManagerEmail = caseManagerData.email;
          newCaseData.CaseManagerPhone = caseManagerData.phoneNumber;
        }
        if (backupCaseManagerData && caseData.BackupCaseManager) {
          newUsers[caseData.BackupCaseManager] = backupCaseManagerData;
          newCaseData.BackupCaseManagerEmail = backupCaseManagerData.email;
          newCaseData.BackupCaseManagerPhone = backupCaseManagerData.phoneNumber;
        }
        setUsers(newUsers);
        setCaseData(newCaseData);
      }

      // Load data for the active tab
      if (activeTab === "contact-history") {
        await loadContactHistory();
      } else if (activeTab === "notes") {
        await loadCaseNotes();
      } else if (activeTab === "details" && caseData.websiteTemplateId) {
        await loadTemplateData(caseData.websiteTemplateId);
      }

    } catch (err) {
      console.error('Error fetching case details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Load contact history data
  const loadContactHistory = async () => {
    if (!authContext || isLoadingContacts) return;
    setIsLoadingContacts(true);
    try {
      const contactsResponse = await fetch(`/api/cases/${params.id}/contacts`, {
        headers: {
          "x-tenant-id": authContext.tenantId,
          "x-user-id": authContext.userId,
        }
      });
      if (!contactsResponse.ok) {
        throw new Error('Failed to fetch case contacts');
      }
      const { contacts: contactsData, locations: locationsData } = await contactsResponse.json();
      
      // Sort contacts by timestamp in descending order
      const sortedContacts = contactsData ? [...contactsData].sort((a, b) => {
        const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
        const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
        return timestampB - timestampA;
      }) : [];

      setContacts(sortedContacts);
      
      // Calculate contact statistics
      const totalAttempts = sortedContacts.length;
      const totalAcknowledged = sortedContacts.filter(c => c.acknowledgment?.status === "Acknowledged").length;
      const lastContactDate = sortedContacts.length > 0 ? new Date(sortedContacts[0].timestamp) : null;
      
      setContactStats({
        totalAttempts,
        totalAcknowledged,
        lastContact: lastContactDate
      });

      // Create map markers from all locations
      if (locationsData && locationsData.length > 0) {
        const markers = locationsData
          .filter(location => location.tenantId === authContext.tenantId)
          .map((location: any) => ({
            position: {
              lat: location.latitude,
              lng: location.longitude
            },
            title: location.address || 'Location',
            timestamp: new Date(location.timestamp).toLocaleString()
          }));
        
        // Set the map center to the most recent location
        if (markers.length > 0) {
          setMapCenter(markers[0].position);
        }
      }
    } catch (error) {
      console.error('Error loading contact history:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Load case notes
  const loadCaseNotes = async () => {
    if (!authContext || isLoadingNotes) return;
    setIsLoadingNotes(true);
    try {
      const notesResponse = await fetch(`/api/cases/${params.id}/notes`, {
        headers: {
          "x-tenant-id": authContext.tenantId,
          "x-user-id": authContext.userId,
        }
      });
      if (!notesResponse.ok) throw new Error('Failed to fetch case notes');
      const notesData = await notesResponse.json();
      
      // Sort notes by timestamp in descending order
      const sortedNotes = [...notesData].sort((a, b) => b.timestamp - a.timestamp);
      setCaseNotes(sortedNotes);
    } catch (error) {
      console.error('Error loading case notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Load template data
  const loadTemplateData = async (templateId: string) => {
    if (!authContext || isLoadingTemplate) return;
    setIsLoadingTemplate(true);
    try {
      const templateResponse = await fetch(`/api/website-templates/${templateId}`, {
        headers: {
          "x-tenant-id": authContext.tenantId,
          "x-user-id": authContext.userId,
        }
      });
      
      if (templateResponse.status === 403) {
        console.log('No permission to view template details');
      } else if (!templateResponse.ok) {
        throw new Error("Failed to fetch template details");
      } else {
        const templateData = await templateResponse.json();
        setTemplateData(templateData);
      }
    } catch (error) {
      console.error('Error loading template data:', error);
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  // Load phone numbers
  const loadPhoneNumbers = async () => {
    if (!authContext || isLoadingPhoneNumbers) return;
    setIsLoadingPhoneNumbers(true);
    try {
      const phoneResponse = await fetch(`/api/cases/${params.id}/phone-numbers`, {
        headers: {
          "x-tenant-id": authContext.tenantId,
          "x-user-id": authContext.userId,
        },
      });

      if (phoneResponse.ok) {
        const phoneData = await phoneResponse.json();
        setPhoneNumbers(phoneData.phoneNumbers || []);
        
        // If there are no phone numbers but there is a VictimPhone, add it as the primary
        if (phoneData.phoneNumbers.length === 0 && caseData?.VictimPhone) {
          setPhoneNumbers([{
            tenantId: authContext.tenantId,
            phoneNumber: caseData.VictimPhone,
            caseId: caseData.Identifier,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPrimary: true,
            label: "Primary"
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading phone numbers:', error);
    } finally {
      setIsLoadingPhoneNumbers(false);
    }
  };

  // Handle tab change
  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    
    // Load data for the selected tab
    if (value === "contact-history" || value === "map") {
      await loadContactHistory();
    } else if (value === "notes" && caseNotes.length === 0) {
      await loadCaseNotes();
    } else if (value === "details" && caseData?.websiteTemplateId && !templateData) {
      await loadTemplateData(caseData.websiteTemplateId);
    }
  };

  useEffect(() => {
    if (authContext) {
      fetchCaseDetails();
    }
  }, [params.id, authContext]);

  useEffect(() => {
    const checkLocationAccess = async () => {
      try {
        const response = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': authContext?.tenantId || '',
            'x-user-id': authContext?.userId || '',
          },
          body: JSON.stringify({
            permissions: ["read:locations"]
          })
        });

        if (!response.ok) {
          throw new Error('Failed to check permissions');
        }

        const { hasPermission } = await response.json();
        setHasLocationAccess(hasPermission);
      } catch (error) {
        console.error('Error checking location access:', error);
        setHasLocationAccess(false);
      }
    };
    checkLocationAccess();
  }, [authContext]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const { tenantId, userId } = authContext || {};
      
      if (noteType === "case") {
        const response = await fetch(`/api/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": tenantId || '',
            "x-user-id": userId || '',
          },
          body: JSON.stringify({
            content: newNote,
            entityId: params.id,
            entityType: "case",
            createdBy: userId,
          }),
        });

        if (!response.ok) throw new Error("Failed to add note");
      } else if (noteType === "contact" && selectedContact) {
        const response = await fetch(`/api/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": tenantId || '',
            "x-user-id": userId || '',
          },
          body: JSON.stringify({
            content: newNote,
            entityId: selectedContact.identifier,
            entityType: "contact",
            createdBy: userId,
          }),
        });

        if (!response.ok) throw new Error("Failed to add note");
      }

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      setNewNote("");
      setIsNoteDialogOpen(false);
      setSelectedContact(null);
      
      // Refresh case data, notes, and contacts
      const caseResponse = await fetch(`/api/cases/${params.id}`, {
        headers: {
          "x-tenant-id": tenantId || '',
          "x-user-id": userId || '',
        }
      });
      if (!caseResponse.ok) throw new Error("Failed to fetch case details");
      const updatedCaseData = await caseResponse.json();
      setCaseData(updatedCaseData);

      // Refresh case notes
      const notesResponse = await fetch(`/api/notes?entityId=${params.id}&entityType=case`, {
        headers: {
          "x-tenant-id": tenantId || '',
          "x-user-id": userId || '',
        }
      });
      if (!notesResponse.ok) throw new Error("Failed to fetch case notes");
      const notesData = await notesResponse.json();
      // Sort notes by timestamp in descending order (newest first)
      const sortedNotes = [...notesData].sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      setCaseNotes(sortedNotes);

      // Fetch all contacts and locations for this case
      const contactsResponse = await fetch(`/api/cases/${params.id}/contacts`, {
        headers: {
          "x-tenant-id": tenantId || '',
          "x-user-id": userId || '',
        }
      });
      if (!contactsResponse.ok) throw new Error("Failed to fetch contacts");
      const { contacts: contactsData, locations: locationsData } = await contactsResponse.json();
      
      // Sort contacts by timestamp in descending order
      const sortedContacts = [...contactsData].sort((a, b) => {
        const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
        const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
        return timestampB - timestampA;
      });
      setContacts(sortedContacts);
      
      // Calculate contact statistics
      const totalAttempts = sortedContacts.length;
      const totalAcknowledged = sortedContacts.filter(c => c.acknowledgment?.status === "Acknowledged").length;
      const lastContactDate = sortedContacts.length > 0 ? new Date(sortedContacts[0].timestamp) : null;
      
      setContactStats({
        totalAttempts,
        totalAcknowledged,
        lastContact: lastContactDate
      });
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      const response = await fetch(`/api/cases/${params.id}/summary`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      
      // Update the case data with the new summary and refresh date
      setCaseData(prev => prev ? { 
        ...prev, 
        summary: data.summary,
        lastSummaryRefresh: data.lastSummaryRefresh 
      } : null);

      toast({
        title: "Success",
        description: "Case summary has been updated",
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate case summary",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const copyToClipboard = async () => {
    if (shortenedUrl) {
      try {
        await navigator.clipboard.writeText(shortenedUrl);
        toast({
          title: "Copied!",
          description: "URL copied to clipboard",
        });
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const renderShortenedUrl = () => {
    if (!shortenedUrl) return null;

    return (
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="flex-1">
          <h3 className="font-medium mb-1">Case URL</h3>
          <p className="text-sm text-muted-foreground break-all">{shortenedUrl}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={copyToClipboard}
          title="Copy URL"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // Helper function to get user's full name
  const getUserFullName = (userId: string | undefined) => {
    if (!userId) return "Not assigned";
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : "Loading...";
  };

  const handleAddPhoneNumber = async () => {
    if (!newPhoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(newPhoneNumber, selectedCountry);
    if (!normalizedPhone) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/cases/${params.id}/phone-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': authContext?.tenantId || '',
          'x-user-id': authContext?.userId || '',
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          isPrimary: isNewPhonePrimary,
          label: newPhoneLabel,
        }),
      });

      if (response.ok) {
        const newPhone = await response.json();
        setPhoneNumbers(prev => [...prev, newPhone]);
        setNewPhoneNumber("");
        setIsAddingPhone(false);
        
        // If this is the primary phone, update the case data
        if (isNewPhonePrimary && caseData) {
          setCaseData({
            ...caseData,
            VictimPhone: normalizedPhone
          });
        }
        
        toast({
          title: "Success",
          description: "Phone number added successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add phone number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding phone number:", error);
      toast({
        title: "Error",
        description: "Failed to add phone number. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePhoneNumber = async (phoneNumber: string) => {
    try {
      const response = await fetch(`/api/cases/${params.id}/phone-numbers`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': authContext?.tenantId || '',
          'x-user-id': authContext?.userId || '',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      if (response.ok) {
        setPhoneNumbers(prev => prev.filter(phone => phone.phoneNumber !== phoneNumber));
        
        // If we removed the primary phone, update the case data
        const removedPhone = phoneNumbers.find(phone => phone.phoneNumber === phoneNumber);
        if (removedPhone?.isPrimary && caseData) {
          const newPrimary = phoneNumbers.find(phone => phone.phoneNumber !== phoneNumber);
          if (newPrimary) {
            setCaseData({
              ...caseData,
              VictimPhone: newPrimary.phoneNumber
            });
          } else {
            setCaseData({
              ...caseData,
              VictimPhone: ""
            });
          }
        }
        
        toast({
          title: "Success",
          description: "Phone number removed successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to remove phone number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing phone number:", error);
      toast({
        title: "Error",
        description: "Failed to remove phone number. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimaryPhone = async (phoneNumber: string) => {
    try {
      const response = await fetch(`/api/cases/${params.id}/phone-numbers/${phoneNumber}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': authContext?.tenantId || '',
          'x-user-id': authContext?.userId || '',
        },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (response.ok) {
        setPhoneNumbers(prev => 
          prev.map(phone => ({
            ...phone,
            isPrimary: phone.phoneNumber === phoneNumber
          }))
        );
        
        // Update the case data
        if (caseData) {
          setCaseData({
            ...caseData,
            VictimPhone: phoneNumber
          });
        }
        
        toast({
          title: "Success",
          description: "Primary phone number updated successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update phone number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating phone number:", error);
      toast({
        title: "Error",
        description: "Failed to update phone number. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAcknowledge = async (contact: ContactRecord) => {
    if (!authContext) return;
    const { tenantId, userId } = authContext;
    
    try {
      // First, acknowledge the contact
      const ackResponse = await fetch(`/api/contacts/${contact.UUID}/acknowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId || '',
          "x-user-id": userId || '',
        }
      });
      
      if (!ackResponse.ok) {
        throw new Error("Failed to acknowledge contact");
      }

      // Update the contacts list with the acknowledged contact
      const updatedContacts = contacts.map(c => 
        c.UUID === contact.UUID 
          ? { ...c, acknowledgment: { ...c.acknowledgment, status: "Acknowledged" } }
          : c
      );
      setContacts(updatedContacts);
      
      // Recalculate contact statistics
      const totalAttempts = updatedContacts.length;
      const totalAcknowledged = updatedContacts.filter(c => c.acknowledgment?.status === "Acknowledged").length;
      const lastContactDate = updatedContacts.length > 0 ? new Date(updatedContacts[0].timestamp) : null;
      
      setContactStats({
        totalAttempts,
        totalAcknowledged,
        lastContact: lastContactDate
      });

      toast({
        title: "Success",
        description: "Contact acknowledged successfully",
      });
    } catch (error) {
      console.error("Error acknowledging contact:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to acknowledge contact",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500">{error || "Case not found"}</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cases
        </Button>
        <h1 className="text-2xl font-bold">Case Details: {caseData && displayCaseId(caseData.Identifier)}</h1>
      </div>

      <Tabs defaultValue="details" className="space-y-4" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="details">Case Details</TabsTrigger>
          <TabsTrigger value="contact-history">Contact History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {isLoadingTemplate ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Case Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Contact Name</h3>
                  <p>{[caseData.firstName, caseData.lastName].filter(Boolean).join(' ')}</p>
                </div>
                <div>
                  <h3 className="font-medium">Primary Phone</h3>
                  <p>{caseData.VictimPhone}</p>
                </div>
                <div>
                  <h3 className="font-medium">Status</h3>
                  <Badge>{caseData.status}</Badge>
                </div>
                <div>
                  <h3 className="font-medium">Priority</h3>
                  <Badge variant={
                    caseData.priority === "Critical" ? "destructive" :
                    caseData.priority === "High" ? "destructive" :
                    caseData.priority === "Medium" ? "default" :
                    "secondary"
                  }>{caseData.priority}</Badge>
                </div>
                <div>
                  <h3 className="font-medium">Case Type</h3>
                  <p>{caseData.caseType}</p>
                </div>
                <div>
                  <h3 className="font-medium">Website Template</h3>
                  {templateData ? (
                    <div>
                      <p className="text-gray-600">{templateData.name}</p>
                      {templateData.description && (
                        <p className="text-sm text-gray-500 mt-1">{templateData.description}</p>
                      )}
                    </div>
                  ) : caseData.websiteTemplateId ? (
                    <p className="text-gray-500">Loading template details...</p>
                  ) : (
                    <p className="text-gray-500">No template assigned</p>
                  )}
                </div>
                {shortenedUrl && (
                  <div className="col-span-2">
                    <h3 className="font-medium">Shortened URL</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground break-all">{shortenedUrl}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        title="Copy URL"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="font-medium">Tags</h3>
                  <div className="flex gap-2 flex-wrap">
                    {caseData.tags?.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phone Numbers Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Phone Numbers</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddingPhone(!isAddingPhone)}
              >
                {isAddingPhone ? "Cancel" : <Plus className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display existing phone numbers */}
              {phoneNumbers.length > 0 ? (
                <div className="space-y-2">
                  {phoneNumbers.map((phone) => (
                    <div key={phone.phoneNumber} className="flex items-center gap-2 p-2 border rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{phone.phoneNumber}</span>
                          {phone.isPrimary && (
                            <Badge variant="outline">Primary</Badge>
                          )}
                          {phone.label && (
                            <Badge variant="secondary">{phone.label}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!phone.isPrimary && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetPrimaryPhone(phone.phoneNumber)}
                          >
                            Set as Primary
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemovePhoneNumber(phone.phoneNumber)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No phone numbers added yet.</p>
              )}
              
              {/* Add new phone number form */}
              {isAddingPhone && (
                <div className="flex flex-col gap-2 p-4 border rounded-md">
                  <h4 className="text-sm font-medium">Add New Phone Number</h4>
                  <div className="flex gap-2">
                    <Select
                      value={selectedCountry}
                      onValueChange={(value: CountryCode) => setSelectedCountry(value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={newPhoneLabel}
                      onValueChange={setNewPhoneLabel}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select label" />
                      </SelectTrigger>
                      <SelectContent>
                        {PHONE_LABEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isNewPhonePrimary}
                        onCheckedChange={setIsNewPhonePrimary}
                      />
                      <span className="text-sm">Set as Primary</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddPhoneNumber}
                      className="ml-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Primary Case Manager</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{caseData.CaseManagerEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{caseData.CaseManagerPhone}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS Notifications: {caseData.smsNotifications ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-medium">{getUserFullName(caseData.CaseManager)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup Case Manager</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{caseData.BackupCaseManagerEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{caseData.BackupCaseManagerPhone}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS Notifications: {caseData.backupSmsNotifications ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-medium">{getUserFullName(caseData.BackupCaseManager)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact-history" className="space-y-4">
          {isLoadingContacts ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Contact History</CardTitle>
                </CardHeader>
                <CardContent>
                  {contacts.length > 0 ? (
                    <ContactHistory contacts={contacts} caseId={params.id} />
                  ) : (
                    <p className="text-muted-foreground">No contact history available.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          {isLoadingNotes ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Case Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Case Notes</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNoteType("case");
                        setSelectedContact(null);
                        setIsNoteDialogOpen(true);
                      }}
                    >
                      Add Note
                    </Button>
                  </div>
                  {caseNotes.length > 0 ? (
                    <div className="space-y-4">
                      {caseNotes.map((note) => (
                        <div key={note.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{note.createdBy}</span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(note.timestamp), "PPpp")}
                              </span>
                            </div>
                          </div>
                          <p className="whitespace-pre-wrap">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No notes available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Contact Attempt Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-muted-foreground">No contact attempts recorded.</p>
              ) : (
                <div className="space-y-4">
                  {[...contacts]
                    .sort((a, b) => {
                      const dateA = new Date(a.timestamp);
                      const dateB = new Date(b.timestamp);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map((contact) => (
                    <div key={`${contact.identifier}-${contact.timestamp}`} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(contact.timestamp), "PPpp")}</span>
                        </div>
                        <Badge variant={contact.acknowledgment?.status === "Acknowledged" ? "default" : "destructive"}>
                          {contact.acknowledgment?.status || "Pending"}
                        </Badge>
                      </div>
                      {contact.acknowledgment?.notes && contact.acknowledgment.notes.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {contact.acknowledgment.notes.map((note) => (
                            <div key={note.id} className="text-sm bg-muted p-2 rounded">
                              <p>{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Added by {note.createdBy} on {format(new Date(note.timestamp), "PP")}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No notes for this contact attempt.</p>
                      )}
                      <div className="mt-2">
                        <div className="flex gap-2">
                          <Button
                            variant={contact.acknowledgment?.status === "Acknowledged" ? "outline" : "destructive"}
                            size="sm"
                            onClick={() => handleAcknowledge(contact)}
                            disabled={contact.acknowledgment?.status === "Acknowledged"}
                            className={contact.acknowledgment?.status === "Acknowledged" ? "bg-green-50 text-green-700 dark:bg-green-600 dark:text-white dark:border-green-400 dark:hover:bg-green-700" : "dark:hover:bg-red-700"}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {contact.acknowledgment?.status === "Acknowledged" ? "Acknowledged" : "Acknowledge"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNoteType("contact");
                              setSelectedContact(contact);
                              setIsNoteDialogOpen(true);
                            }}
                          >
                            Add Note
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
            <DialogContent className="max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Add Note</DialogTitle>
                <DialogDescription>
                  Add a note to {noteType === "case" ? "the case" : "this contact attempt"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto py-4">
                <Textarea
                  placeholder="Enter your note here..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[200px] w-full resize-none"
                />
              </div>
              <DialogFooter className="flex-shrink-0">
                <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                  Add Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Case Summary</CardTitle>
              <div className="flex items-center gap-2">
                <ExportButton caseId={params.id} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isGeneratingSummary ? "animate-spin" : ""}`} />
                  {isGeneratingSummary ? "Generating..." : "Refresh Summary"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Contact Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Contact Attempts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{contactStats.totalAttempts}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Acknowledged Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{contactStats.totalAcknowledged}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Last Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {contactStats.lastContact && !isNaN(contactStats.lastContact.getTime())
                          ? format(contactStats.lastContact, "PPpp")
                          : "Never"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Generated Summary */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">AI Generated Summary</h3>
                    {caseData.lastSummaryRefresh && (
                      <p className="text-sm text-muted-foreground">
                        Last refreshed: {format(new Date(caseData.lastSummaryRefresh), "PPpp")}
                      </p>
                    )}
                  </div>
                  {caseData.summary ? (
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{caseData.summary}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No summary available. Click "Refresh Summary" to generate one.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map Tab */}
        {hasLocationAccess && (
          <TabsContent value="map" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contact Locations</h2>
            </div>
            <ContactMap contacts={contacts} caseId={params.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
} 