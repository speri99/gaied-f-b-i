"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MessageSquare,
  Search,
  Filter,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import FadeInSection from "@/components/animations/FadeInSection";
import type {
  ContactRecord,
  ContactRecordWithoutLocation,
  SensitiveLocationData,
  PaginatedResponse,
  SortConfig,
  ContactNote,
} from "@/types/contact";
import type { Case } from "@/types/case";
import { format } from "date-fns";
import { getAuthContext, createAuthHeaders } from "@/lib/auth";

const PAGE_SIZE_OPTIONS = [5, 10, 15];

// Add this interface near the top with other interfaces
interface Note {
  id: string;
  content: string;
  timestamp: string;
  createdBy: string;
  entityId: string;
  entityType: string;
  tenantId: string;
}

// Helper functions for rendering badges
const getStatusBadge = (contact: ContactRecordWithoutLocation) => {
  const status = contact.acknowledgment?.status;
  switch (status) {
    case "Pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-600 dark:text-white dark:border-yellow-400 dark:font-medium">Pending</Badge>;
    case "Acknowledged":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-600 dark:text-white dark:border-green-400 dark:font-medium">Acknowledged</Badge>;
    case "Escalated":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-600 dark:text-white dark:border-orange-400 dark:font-medium">Escalated</Badge>;
    case "Missed":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-600 dark:text-white dark:border-red-400 dark:font-medium">Missed</Badge>;
    default:
      return null;
  }
};

const getEscalationLevel = (contact: ContactRecordWithoutLocation) => {
  const level = contact.acknowledgment?.escalationLevel;
  switch (level) {
    case "Primary":
      return <Badge variant="outline" className="bg-primary/10 text-primary-foreground border-primary/30 dark:bg-blue-500 dark:text-white dark:border-blue-400 dark:font-medium">Primary</Badge>;
    case "Backup":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-600 dark:text-white dark:border-orange-400 dark:font-medium">Backup</Badge>;
    case "Emergency":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-600 dark:text-white dark:border-red-400 dark:font-medium">Emergency</Badge>;
    default:
      return null;
  }
};

const ContactsTable = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [allContacts, setAllContacts] = useState<ContactRecordWithoutLocation[]>([]);
  const [contacts, setContacts] = useState<ContactRecordWithoutLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleLocations, setVisibleLocations] = useState<
    Record<string, SensitiveLocationData>
  >({});
  const [loadingLocations, setLoadingLocations] = useState<Set<string>>(
    new Set()
  );

  // Pagination and sorting state
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<SortConfig>({
    field: "timestamp",
    order: "desc",
  });

  // Case dialog state
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [loadingCase, setLoadingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  // Note dialog state
  const [selectedContact, setSelectedContact] = useState<ContactRecordWithoutLocation | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  // Loading state for acknowledge
  const [loadingAcknowledge, setLoadingAcknowledge] = useState<Set<string>>(new Set());

  // Add new Acknowledge Dialog state
  const [isAckDialogOpen, setIsAckDialogOpen] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [contactToAck, setContactToAck] = useState<ContactRecordWithoutLocation | null>(null);

  // Add this state near other state declarations
  const [selectedContactNotes, setSelectedContactNotes] = useState<Note[]>([]);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Fetch location data for a specific contact
  const fetchLocationData = async (uuid: string) => {
    setLoadingLocations((prev) => new Set([...prev, uuid]));
    try {
      const headers = await createAuthHeaders();
      const response = await fetch(`/api/contacts/${uuid}/location`, {
        headers: {
          ...headers,
          "x-access-reason": "Contact investigation"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch location data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Location data received:', data);

      setVisibleLocations((prev) => ({
        ...prev,
        [uuid]: {
          UUID: uuid,
          timestamp: Date.now(),
          location: {
            latitude: data.latitude,
            longitude: data.longitude,
            formattedAddress: data.formattedAddress
          },
          accessLog: []
        }
      }));
    } catch (err) {
      console.error("Error fetching location data:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch location data",
        variant: "destructive",
      });
    } finally {
      setLoadingLocations((prev) => {
        const next = new Set(prev);
        next.delete(uuid);
        return next;
      });
    }
  };

  // Toggle location visibility
  const toggleLocationVisibility = async (uuid: string) => {
    if (visibleLocations[uuid]) {
      setVisibleLocations((prev) => {
        const newLocations = { ...prev };
        delete newLocations[uuid];
        return newLocations;
      });
    } else {
      await fetchLocationData(uuid);
    }
  };

  // Fetch all contacts from the API
  const fetchAllContacts = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = await createAuthHeaders();
      const response = await fetch(
        `/api/contacts?pageSize=1000&sortField=${sort.field}&sortOrder=${sort.order}`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PaginatedResponse<ContactRecordWithoutLocation> = await response.json();
      setAllContacts(data.items || []);
      updateDisplayedContacts(data.items || [], searchQuery);
    } catch (err) {
      console.error("Error fetching contacts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  // Update displayed contacts based on search and pagination
  const updateDisplayedContacts = (contactsToFilter: ContactRecordWithoutLocation[], search: string) => {
    // Filter contacts based on search query
    const filteredContacts = contactsToFilter.filter(contact => {
      const searchLower = search.toLowerCase();
      return (
        contact.identifier?.toLowerCase().includes(searchLower) ||
        contact.caseId?.toLowerCase().includes(searchLower) ||
        contact.status?.toLowerCase().includes(searchLower)
      );
    });

    // Sort contacts
    const sortedContacts = [...filteredContacts].sort((a, b) => {
      const aValue = a[sort.field as keyof typeof a];
      const bValue = b[sort.field as keyof typeof b];
      
      if (sort.order === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setContacts(sortedContacts.slice(startIndex, endIndex));
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
    updateDisplayedContacts(allContacts, value);
  };

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    const newPageSize = Number(value);
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    updateDisplayedContacts(allContacts, searchQuery);
  };

  // Load more contacts (next page)
  const loadMore = () => {
    if (currentPage * pageSize < allContacts.length) {
      setCurrentPage(prev => prev + 1);
      updateDisplayedContacts(allContacts, searchQuery);
    }
  };

  // Go to previous page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      updateDisplayedContacts(allContacts, searchQuery);
    }
  };

  // Handle sort change
  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  // Fetch case details
  const fetchCase = async (identifier: string) => {
    setLoadingCase(true);
    setCaseError(null);

    try {
      const headers = await createAuthHeaders();
      
      // First check permissions
      const permResponse = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resource: 'locations',
          action: 'read',
          permissions: ['read:locations'] // Include both new and old format for backward compatibility
        })
      });

      if (!permResponse.ok) {
        throw new Error('Permission denied');
      }

      // Then fetch the case details
      const response = await fetch(`/api/cases/${identifier}`, {
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Case not found');
        }
        throw new Error(`Failed to fetch case details: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Fetch case contacts
      const contactsResponse = await fetch(`/api/cases/${identifier}/contacts`, {
        headers
      });

      if (!contactsResponse.ok) {
        console.warn('Failed to fetch case contacts:', contactsResponse.statusText);
        // Don't throw here, just log warning and continue with main case data
      } else {
        const contactsData = await contactsResponse.json();
        data.contacts = contactsData;
      }

      setSelectedCase(data);
      setCaseDialogOpen(true);
    } catch (err) {
      console.error("Error fetching case:", err);
      setCaseError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching case details"
      );
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch case details",
        variant: "destructive"
      });
    } finally {
      setLoadingCase(false);
    }
  };

  // Handle acknowledge
  const handleAcknowledge = async (contact: ContactRecordWithoutLocation) => {
    if (!ackNote.trim()) {
      toast({
        title: "Error",
        description: "Please provide a note with your acknowledgment",
        variant: "destructive",
      });
      return;
    }
    
    if (loadingAcknowledge.has(contact.UUID)) return;
    
    setLoadingAcknowledge(prev => new Set([...prev, contact.UUID]));
    try {
      const { tenantId } = getAuthContext();
      // First, acknowledge the contact
      const ackResponse = await fetch(`/api/contacts/${contact.UUID}/acknowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: ackNote }),
      });
      
      if (!ackResponse.ok) {
        const error = await ackResponse.json();
        throw new Error(error.error || "Failed to acknowledge contact");
      }

      // Then, add the acknowledgment note to the notes table
      const noteResponse = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: ackNote,
          entityId: contact.UUID,
          entityType: "contact",
          createdBy: "Current User", // TODO: Get from auth context
          noteType: "acknowledgment",
          tenantId: tenantId,
        }),
      });

      if (!noteResponse.ok) {
        throw new Error("Failed to add acknowledgment note");
      }
      
      toast({
        title: "Success",
        description: "Contact acknowledged successfully",
      });
      
      setIsAckDialogOpen(false);
      setAckNote("");
      setContactToAck(null);
      fetchAllContacts(); // Refresh the list from the beginning
    } catch (error) {
      console.error("Error acknowledging contact:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to acknowledge contact",
        variant: "destructive",
      });
    } finally {
      setLoadingAcknowledge(prev => {
        const newSet = new Set(prev);
        newSet.delete(contact.UUID);
        return newSet;
      });
    }
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!selectedContact || !newNote.trim()) return;

    try {
      const { tenantId } = getAuthContext();
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newNote,
          entityId: selectedContact.UUID,
          entityType: "contact",
          createdBy: "Current User", // TODO: Get from auth context
          tenantId: tenantId,
        }),
      });

      if (!response.ok) throw new Error("Failed to add note");

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      setNewNote("");
      setIsNoteDialogOpen(false);
      fetchAllContacts(); // Refresh the list
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  // Add this function near other functions
  const fetchContactNotes = async (contactId: string) => {
    setLoadingNotes(true);
    try {
      const response = await fetch(`/api/notes?entityId=${contactId}&entityType=contact`);
      if (!response.ok) throw new Error("Failed to fetch notes");
      const notes = await response.json();
      setSelectedContactNotes(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch notes",
        variant: "destructive",
      });
    } finally {
      setLoadingNotes(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAllContacts();
  }, [sort.field, sort.order]);

  // Update displayed contacts when pagination or search changes
  useEffect(() => {
    updateDisplayedContacts(allContacts, searchQuery);
  }, [currentPage, pageSize, sort, allContacts]);

  return (
    <FadeInSection>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Contact Records</CardTitle>
          <CardDescription>
            View and manage contact records from the system
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select page size" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} records per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("identifier")}
                  >
                    Identifier
                    {sort.field === "identifier" &&
                      (sort.order === "asc" ? (
                        <ChevronUp className="inline ml-1" />
                      ) : (
                        <ChevronDown className="inline ml-1" />
                      ))}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("timestamp")}
                  >
                    Timestamp
                    {sort.field === "timestamp" &&
                      (sort.order === "asc" ? (
                        <ChevronUp className="inline ml-1" />
                      ) : (
                        <ChevronDown className="inline ml-1" />
                      ))}
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.UUID}>
                    <TableCell className="py-2">
                      {contact.identifier}
                    </TableCell>
                    <TableCell className="py-2">
                      {new Date(contact.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {loadingLocations.has(contact.UUID) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : visibleLocations[contact.UUID] ? (
                        <div className="flex flex-col space-y-1">
                          <span>
                            {visibleLocations[contact.UUID].location.formattedAddress}
                          </span>
                          <div className="flex space-x-2 text-sm text-muted-foreground">
                            <span>
                              Lat: {visibleLocations[contact.UUID].location.latitude}
                            </span>
                            <span>
                              Long: {visibleLocations[contact.UUID].location.longitude}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Hidden</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={contact.dispatched ? "default" : "secondary"}
                      >
                        {contact.dispatched ? "Dispatched" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      {getStatusBadge(contact)}
                    </TableCell>
                    <TableCell className="py-2">
                      {getEscalationLevel(contact)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleLocationVisibility(contact.UUID)}
                        >
                          {visibleLocations[contact.UUID] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedContact(contact);
                            setIsNotesDialogOpen(true);
                            fetchContactNotes(contact.UUID);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={contact.acknowledgment?.status === "Acknowledged" ? "outline" : "destructive"}
                          size="sm"
                          onClick={() => {
                            setContactToAck(contact);
                            setIsAckDialogOpen(true);
                          }}
                          disabled={contact.acknowledgment?.status === "Acknowledged" || loadingAcknowledge.has(contact.UUID)}
                          className={contact.acknowledgment?.status === "Acknowledged" ? "bg-green-50 text-green-700 dark:bg-green-600 dark:text-white dark:border-green-400 dark:hover:bg-green-700" : "dark:hover:bg-red-700"}
                        >
                          {loadingAcknowledge.has(contact.UUID) ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          {loadingAcknowledge.has(contact.UUID) ? "Acknowledging..." : 
                           contact.acknowledgment?.status === "Acknowledged" ? "Acknowledged" : "Acknowledge"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedContact(contact);
                            setIsNoteDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {loading && (
            <div className="flex justify-center mt-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-red-500 mt-4 text-center">{error}</div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {contacts.length} of {allContacts.length} records
              {currentPage * pageSize < allContacts.length && " (more available)"}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToPreviousPage}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              
              <span className="text-sm">
                Page {currentPage} of {Math.ceil(allContacts.length / pageSize)}
              </span>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMore}
                disabled={currentPage * pageSize >= allContacts.length || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Case Details</DialogTitle>
            <DialogDescription>
              Viewing details for case {selectedCase?.identifier}
            </DialogDescription>
          </DialogHeader>
          {loadingCase ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : caseError ? (
            <div className="text-red-500 py-4">{caseError}</div>
          ) : selectedCase ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Contact Information</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{selectedCase.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{selectedCase.email}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium">Timeline</h4>
                <div className="space-y-2 mt-2">
                  {selectedCase.timeline.map((event, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Calendar className="h-4 w-4 mt-1" />
                      <div>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                        <div className="text-sm">{event.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note to the contact record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add new Acknowledge Dialog */}
      <Dialog open={isAckDialogOpen} onOpenChange={setIsAckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge Contact</DialogTitle>
            <DialogDescription>
              Please provide a note with your acknowledgment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your acknowledgment note here..."
              value={ackNote}
              onChange={(e) => setAckNote(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAckDialogOpen(false);
                setAckNote("");
                setContactToAck(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => contactToAck && handleAcknowledge(contactToAck)}
              disabled={!ackNote.trim() || (contactToAck && loadingAcknowledge.has(contactToAck.UUID))}
            >
              {contactToAck && loadingAcknowledge.has(contactToAck.UUID) ? "Acknowledging..." : "Acknowledge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add this dialog near the other dialogs */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact Notes</DialogTitle>
            <DialogDescription>
              Notes for contact {selectedContact?.identifier}
            </DialogDescription>
          </DialogHeader>
          {loadingNotes ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedContactNotes.length === 0 ? (
            <div className="text-muted-foreground py-4">No notes available.</div>
          ) : (
            <div className="space-y-4 py-4">
              {selectedContactNotes.map((note) => (
                <div key={`note-${note.id}`} className="border rounded-lg p-4 dark:border-gray-600 dark:bg-gray-800/50">
                  <p className="whitespace-pre-wrap dark:text-white">{note.content}</p>
                  <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground dark:text-gray-200">
                    <span>Added by {note.createdBy}</span>
                    <span>{format(new Date(note.timestamp), "PPpp")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeInSection>
  );
};

export default ContactsTable;
