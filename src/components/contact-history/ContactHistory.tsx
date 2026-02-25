"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getAuthContext } from "@/lib/auth";
import { ContactRecord, ContactRecordWithoutLocation } from "@/types/contact";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "../ui/textarea";

interface ContactHistoryProps {
  contacts: ContactRecord[];
  caseId: string;
}

interface LocationData {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  acknowledgment: any;
}

export function ContactHistory({ contacts, caseId }: ContactHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [caseContacts, setCaseContacts] = useState(contacts);
  const [error, setError] = useState<string | null>(null);
  const [visibleLocations, setVisibleLocations] = useState<Map<string, LocationData>>(new Map());
  const [loadingLocations, setLoadingLocations] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // console.log('ContactHistory received contacts:', contacts);

  // Add new Acknowledge Dialog state
  const [isAckDialogOpen, setIsAckDialogOpen] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [contactToAck, setContactToAck] = useState<any | null>(null);
  // Loading state for acknowledge
  const [loadingAcknowledge, setLoadingAcknowledge] = useState<Set<string>>(new Set());

  const toggleLocationVisibility = async (recordId: string) => {
    // If we already have the location data, just toggle visibility
    if (visibleLocations.has(recordId)) {
      setVisibleLocations(prev => {
        const next = new Map(prev);
        next.delete(recordId);
        return next;
      });
      return;
    }

    // Otherwise, fetch the location data
    try {
      setLoadingLocations(prev => new Set(prev).add(recordId));

      const authContext = await getAuthContext();
      const contact = caseContacts.find(c => c.UUID === recordId);

      if (!contact?.caseId) {
        throw new Error("Case ID not found for contact");
      }

      const response = await fetch(`/api/cases/${contact.caseId}/locations/${recordId}`, {
        headers: {
          "x-tenant-id": authContext.tenantId,
          "x-user-id": authContext.userId,
          "x-access-reason": "Case investigation"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch location data: ${response.statusText}`);
      }

      const data = await response.json();

      setVisibleLocations(prev => {
        const next = new Map(prev);
        next.set(recordId, {
          formattedAddress: data.formattedAddress,
          latitude: data.latitude,
          longitude: data.longitude
        });
        return next;
      });
    } catch (error) {
      console.error('Error fetching location:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch location data",
        variant: "destructive",
      });
    } finally {
      setLoadingLocations(prev => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive">{error}</div>;
  }

  if (!caseContacts || caseContacts.length === 0) {
    return <div className="text-center text-muted-foreground">No contact records found.</div>;
  }

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
      const { tenantId } = await getAuthContext();
      // First, acknowledge the contact
      const ackResponse = await fetch(`/api/contacts/${contact.UUID}/acknowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
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
      loadContactHistory(); // Refresh the list from the beginning
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

  // Load contact history data
  const loadContactHistory = async () => {

    const { tenantId, userId } = await getAuthContext();

    try {
      const contactsResponse = await fetch(`/api/cases/${caseId}/contacts`, {
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": userId,
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

      setCaseContacts(sortedContacts);

    } catch (error) {
      console.error('Error loading contact history:', error);
    } finally {

    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {caseContacts.map((contact) => {
            // console.log('Rendering contact:', contact);
            const locationData = visibleLocations.get(contact.UUID);
            const isLoading = loadingLocations.has(contact.UUID);

            return (
              <TableRow key={`${contact.UUID}-${contact.timestamp}`}>
                <TableCell>{format(new Date(contact.timestamp), "PPpp")}</TableCell>
                <TableCell>{contact.type}</TableCell>
                <TableCell>{contact.metadata?.method || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant={contact.acknowledgment?.status === "Acknowledged" ? "default" : "destructive"}>
                    {contact.acknowledgment?.status || "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLocationVisibility(contact.UUID)}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : locationData ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {locationData ? "Hide Location" : "View Location"}
                  </Button>
                  {locationData && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>{locationData.formattedAddress}</p>
                      <p className="mt-1">
                        Lat: {locationData.latitude.toFixed(6)}, Lng: {locationData.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

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
    </div>
  );
} 