"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Tag, Filter, Plus, Edit, Trash2, Copy } from "lucide-react";
import FadeInSection from "@/components/animations/FadeInSection";
import { Switch } from "@/components/ui/switch";
import { Case, CaseStatus, CasePriority } from "@/types/case";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ShortenedUrlService } from "@/services/shortened-url";
import { getAuthContext } from "@/lib/auth";
import { format } from "date-fns";
import { displayCaseId, parseBase62Id } from "@/lib/utils";
import { ClientActionLogService } from "@/lib/services/client-action-log.service";
import { useAuth } from "@/lib/auth";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { checkPermissions } from "@/middleware/permissions";
import { Workflow } from "@/types/workflow";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active", variant: "default" },
  { value: "Pending", label: "Pending", variant: "secondary" },
  { value: "Closed", label: "Closed", variant: "outline" },
  { value: "Deleted", label: "Deleted", variant: "destructive" },
] as const;

const TYPE_OPTIONS = [
  { value: "Child Abuse", label: "Child Abuse" },
  { value: "Domestic Violence", label: "Domestic Violence" },
  { value: "Elder Abuse", label: "Elder Abuse" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
] as const;

interface CasesTableProps {
  onEdit: (caseRecord: Case | null) => void;
}

export interface CasesTableRef {
  fetchCases: () => Promise<void>;
}

interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
}

const CasesTable = forwardRef<CasesTableRef, CasesTableProps>(({ onEdit }, ref) => {
  const { toast } = useToast();
  const router = useRouter();
  const { createAuthHeaders } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | ''>('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>("");
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, { firstName: string; lastName: string }>>({});
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [hasDeletedPermission, setHasDeletedPermission] = useState(false);

  // Dialog states
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  // Form states
  const [formData, setFormData] = useState<Partial<Case>>({
    status: "Active",
    caseType: "Domestic Violence",
    priority: "Medium",
  });

  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Initial data loading
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchUsers(),
          checkPermissions(),
          fetchCases(),
          fetchTemplates()
        ]);
      } catch (error) {
        console.error("Error initializing data:", error);
        setError("Failed to initialize data");
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  // Update filters when search or filter values change
  useEffect(() => {
    filterCases();
  }, [searchQuery, statusFilter, caseTypeFilter, allCases]);

  // Fetch cases when show deleted changes
  useEffect(() => {
    fetchCases();
  }, [showDeleted]);

  // Expose fetchCases through the ref
  useImperativeHandle(ref, () => ({
    fetchCases
  }));

  const fetchUsers = async () => {
    try {
      const headers = await createAuthHeaders();
      const response = await fetch("/api/users", {
        credentials: 'include',
        headers
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      console.log("Users API response:", data);
      // Convert the array of users into a map keyed by userId
      const usersMap = data.items.reduce((acc: Record<string, { firstName: string; lastName: string }>, user: any) => {
        console.log("Processing user:", user);
        acc[user.userId] = {
          firstName: user.firstName,
          lastName: user.lastName
        };
        return acc;
      }, {});
      console.log("Users map:", usersMap);
      setUsers(usersMap);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  // const checkPermissions = async () => {
  //   try {
  //     const headers = await createAuthHeaders();
  //     const response = await fetch("/api/permissions/me", {
  //       credentials: 'include',
  //       headers
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to check permissions");
  //     }

  //     const data = await response.json();
  //     setHasDeletedPermission(data.permissions.includes('ShowDeletedCases'));
  //   } catch (error) {
  //     console.error("Error checking permissions:", error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to check permissions",
  //       variant: "destructive",
  //     });
  //   }
  // };

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await createAuthHeaders();
      const response = await fetch("/api/cases", {
        credentials: 'include',
        headers
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cases");
      }

      const data = await response.json();
      console.log("Cases API response:", data);
      // Log each case's case manager ID
      if (Array.isArray(data)) {
        data.forEach((caseItem: any) => {
          console.log("Case ID:", caseItem.Identifier);
          console.log("Case Manager ID:", caseItem.CaseManager);
          console.log("Full case data:", caseItem);
        });
      } else {
        console.log("Cases data is not an array:", data);
      }
      setAllCases(data);
      setFilteredCases(data);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast({
        title: "Error",
        description: "Failed to fetch cases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Local search and filter function
  const filterCases = () => {
    let filtered = [...allCases];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(caseItem => 
        caseItem.Identifier.toLowerCase().includes(query) ||
        ([caseItem.firstName, caseItem.lastName].join(' ').toLowerCase().includes(query)) ||
        caseItem.CaseManager?.toLowerCase().includes(query) ||
        caseItem.caseType?.toLowerCase().includes(query) ||
        caseItem.status?.toLowerCase().includes(query) ||
        caseItem.priority?.toLowerCase().includes(query) ||
        caseItem.notes?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(caseItem => caseItem.status === statusFilter);
    }

    // Apply case type filter
    if (caseTypeFilter) {
      filtered = filtered.filter(caseItem => caseItem.caseType === caseTypeFilter);
    }

    setFilteredCases(filtered);
  };

  const handleCreateCase = async () => {
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create case");
      }

      toast({
        title: "Success",
        description: "Case created successfully",
      });

      setFormData({
        status: "Active",
        caseType: "Domestic Violence",
        priority: "Medium",
      });
      fetchCases();
    } catch (error) {
      console.error("Error creating case:", error);
      toast({
        title: "Error",
        description: "Failed to create case",
        variant: "destructive",
      });
    }
  };

  const handleEditCase = async () => {
    if (!selectedCase) return;

    try {
      // Create a copy of formData without the Identifier
      const { Identifier, ...updateData } = formData;
      
      const response = await fetch(`/api/cases/${selectedCase.Identifier}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update case");
      }

      toast({
        title: "Success",
        description: "Case updated successfully",
      });

      setEditDialogOpen(false);
      fetchCases();
    } catch (error) {
      console.error("Error updating case:", error);
      toast({
        title: "Error",
        description: "Failed to update case",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedCase) return;

    try {
      const { tenantId, userId } = getAuthContext();
      const response = await fetch(`/api/cases/${selectedCase.Identifier}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": userId,
        },
        body: JSON.stringify({
          status: "Deleted",
          updatedAt: Date.now(),
          updatedBy: userId
        })
      });

      if (!response.ok) {
        throw new Error("Failed to delete case");
      }

      toast({
        title: "Success",
        description: "Case marked as deleted successfully",
      });

      setDeleteDialogOpen(false);
      setSelectedCase(null);
      fetchCases();
    } catch (error) {
      console.error("Error deleting case:", error);
      toast({
        title: "Error",
        description: "Failed to delete case",
        variant: "destructive",
      });
    }
  };

  const fetchUserDetails = async (userId: string) => {
    if (!userId) return null;
    try {
      const { tenantId } = getAuthContext();
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          "x-tenant-id": tenantId,
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

  const getUserFullName = (userId: string | undefined) => {
    if (!userId) return "Not assigned";
    console.log("Getting name for user ID:", userId);
    console.log("Current users map:", users);
    const user = users[userId];
    console.log("Found user:", user);
    if (!user) {
      console.log("User not found in map. Available keys:", Object.keys(users));
      console.log("User ID type:", typeof userId);
      console.log("User ID value:", userId);
      console.log("User ID in map?", userId in users);
    }
    return user ? `${user.firstName} ${user.lastName}` : "Loading...";
  };

  const handleViewDetails = async (e: React.MouseEvent, caseItem: Case) => {
    e.stopPropagation();
    setSelectedCase(caseItem);
    setDetailsDialogOpen(true);
    setShortenedUrl(null); // Reset shortened URL

    // Fetch shortened URL if it exists
    if (caseItem.websiteTemplateId) {
      try {
        const { tenantId, userId } = getAuthContext();
        const { base62Id } = parseBase62Id(caseItem.Identifier);
        const response = await fetch(`/api/shortened-urls?caseId=${base62Id}`, {
          headers: {
            'x-tenant-id': tenantId,
            'x-user-id': userId,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch shortened URL');
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          setShortenedUrl(`https://grs.sh/${data.items[0].code}`);
        }
      } catch (error) {
        console.error('Error loading shortened URL:', error);
      }
    }
  };

  // Add function to generate shortened URL
  const generateShortenedUrl = async () => {
    if (!selectedCase) return;
    
    try {
      const { tenantId, userId } = getAuthContext();
      const { base62Id } = parseBase62Id(selectedCase.Identifier);
      
      const response = await fetch('/api/shortened-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        },
        body: JSON.stringify({
          tenantId,
          caseId: base62Id,
          websiteTemplateId: selectedCase.websiteTemplateId,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate shortened URL');
      
      const data = await response.json();
      if (data.code) {
        setShortenedUrl(`https://grs.sh/${data.code}`);
        toast({
          title: "Success",
          description: "Shortened URL generated successfully",
        });
      }
    } catch (error) {
      console.error('Error generating shortened URL:', error);
      toast({
        title: "Error",
        description: "Failed to generate shortened URL",
        variant: "destructive",
      });
    }
  };

  // Add copyToClipboard function
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

  const openEditDialog = (e: React.MouseEvent, caseItem: Case) => {
    e.stopPropagation();
    setSelectedCase(caseItem);
    setSelectedTags(caseItem.tags || []);
    setFormData({
      ...caseItem,
      status: caseItem.status || "Active",
      caseType: caseItem.caseType || "Domestic Violence",
      priority: caseItem.priority || "Medium",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (e: React.MouseEvent, caseItem: Case) => {
    e.stopPropagation();
    setSelectedCase(caseItem);
    setDeleteDialogOpen(true);
  };

  const getUserName = (userId: string) => {
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const handleRowClick = (caseItem: Case) => {
    router.push(`/cases/${caseItem.Identifier}`);
  };

  const fetchTemplates = async () => {
    try {
      const { tenantId, userId } = getAuthContext();
      const response = await fetch("/api/website-templates", {
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": userId,
        }
      });
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !selectedTags.includes(newTag)) {
        const newTags = [...selectedTags, newTag];
        setSelectedTags(newTags);
        setFormData({ ...formData, tags: newTags });
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
    setFormData({ ...formData, tags: newTags });
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { tenantId, userId } =  await getAuthContext();
        const response = await fetch("/api/workflows", {
          headers: {
            "x-tenant-id": tenantId,
            "x-user-id": userId,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        setWorkflows(data.items || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        setWorkflows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const renderCaseForm = () => (
    <div className="grid gap-6">
      {/* Contact Information Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground">Contact Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName || ""}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName || ""}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryPhone">Primary Phone</Label>
            <Input
              id="primaryPhone"
              value={formData.VictimPhone || ""}
              onChange={(e) =>
                setFormData({ ...formData, VictimPhone: e.target.value })
              }
              placeholder="(123) 456-7890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryPhone">Secondary Phone</Label>
            <Input
              id="secondaryPhone"
              value={formData.SecondaryPhone || ""}
              onChange={(e) =>
                setFormData({ ...formData, SecondaryPhone: e.target.value })
              }
              placeholder="(123) 456-7890"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="caseType">Case Type</Label>
            <Select
              value={formData.caseType}
              onValueChange={(value) =>
                setFormData({ ...formData, caseType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select case type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportedAbuser">Reported Abuser</Label>
            <Input
              id="reportedAbuser"
              value={formData.ReportedAbuser || ""}
              onChange={(e) =>
                setFormData({ ...formData, ReportedAbuser: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/*workflow section*/}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground">Workflow Management</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="caseManager">Workflow</Label>
            <Select
              value={formData.workflowId || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, workflowId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select case manager" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(workflows) && workflows.map((user) => (
                  <SelectItem key={user.workflowId} value={user.workflowId}>
                    {`${user.workflowName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Case Management Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground">Case Management</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="caseManager">Case Manager</Label>
            <Select
              value={formData.CaseManager || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, CaseManager: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select case manager" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(users).map(([userId, user]) => (
                  <SelectItem key={userId} value={userId}>
                    {`${user.firstName} ${user.lastName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="backupCaseManager">Backup Case Manager</Label>
            <Select
              value={formData.BackupCaseManager || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, BackupCaseManager: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select backup case manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {Object.entries(users)
                  .filter(([userId]) => userId !== formData.CaseManager)
                  .map(([userId, user]) => (
                    <SelectItem key={userId} value={userId}>
                      {`${user.firstName} ${user.lastName}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Case Worker Contact Options</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 border rounded-md p-3">
              <Checkbox
                id="allowEmail"
                checked={formData.caseWorkerContactOptions?.includes("email")}
                onCheckedChange={(checked) => {
                  const currentOptions = formData.caseWorkerContactOptions || [];
                  const newOptions = checked
                    ? [...currentOptions, "email"]
                    : currentOptions.filter(opt => opt !== "email");
                  setFormData({ ...formData, caseWorkerContactOptions: newOptions });
                }}
              />
              <Label htmlFor="allowEmail" className="cursor-pointer">Email</Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-md p-3">
              <Checkbox
                id="allowPhone"
                checked={formData.caseWorkerContactOptions?.includes("phone")}
                onCheckedChange={(checked) => {
                  const currentOptions = formData.caseWorkerContactOptions || [];
                  const newOptions = checked
                    ? [...currentOptions, "phone"]
                    : currentOptions.filter(opt => opt !== "phone");
                  setFormData({ ...formData, caseWorkerContactOptions: newOptions });
                }}
              />
              <Label htmlFor="allowPhone" className="cursor-pointer">Phone</Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-md p-3">
              <Checkbox
                id="allowText"
                checked={formData.caseWorkerContactOptions?.includes("text")}
                onCheckedChange={(checked) => {
                  const currentOptions = formData.caseWorkerContactOptions || [];
                  const newOptions = checked
                    ? [...currentOptions, "text"]
                    : currentOptions.filter(opt => opt !== "text");
                  setFormData({ ...formData, caseWorkerContactOptions: newOptions });
                }}
              />
              <Label htmlFor="allowText" className="cursor-pointer">Text</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Case Details Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground">Case Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as Case["status"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value as Case["priority"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="websiteTemplate">Website Template</Label>
            <Select
              value={formData.websiteTemplateId || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, websiteTemplateId: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select website template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md">
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:bg-destructive/20 rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type and press Enter to add tags"
                className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-[200px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <FadeInSection>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Case Records</h1>
            <p className="text-muted-foreground">
              Manage and track all impacted party records.
            </p>
          </div>
        </div>

        {/* Table of Cases */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Case Records</CardTitle>
                <CardDescription>
                  View and manage your organization's cases.
                </CardDescription>
              </div>
              {hasDeletedPermission && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="show-deleted">Show Deleted Cases</Label>
                  <Switch
                    id="show-deleted"
                    checked={showDeleted}
                    onCheckedChange={setShowDeleted}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search cases..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <Select 
                  value={statusFilter} 
                  onValueChange={(value: CaseStatus | '') => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[130px]">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <span>Status</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <span>Case Type</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Contact Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Case Manager</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.length > 0 ? (
                    filteredCases.map((caseItem) => (
                      <TableRow
                        key={caseItem.Identifier}
                        onClick={() => handleRowClick(caseItem)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>{displayCaseId(caseItem.Identifier)}</TableCell>
                        <TableCell>{[caseItem.firstName, caseItem.lastName].filter(Boolean).join(' ')}</TableCell>
                        <TableCell>
                          <Badge variant={
                            STATUS_OPTIONS.find(opt => opt.value === caseItem.status)?.variant || "default"
                          }>{caseItem.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            caseItem.priority === "Critical" ? "destructive" :
                            caseItem.priority === "High" ? "destructive" :
                            caseItem.priority === "Medium" ? "default" :
                            "secondary"
                          }>{caseItem.priority}</Badge>
                        </TableCell>
                        <TableCell>{getUserFullName(caseItem.CaseManager)}</TableCell>
                        <TableCell>{format(new Date(caseItem.lastUpdated), "PPp")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 opacity-50 cursor-pointer">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(e, caseItem);
                              }}
                            >
                              Quick View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(e, caseItem);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(e, caseItem);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No cases found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Case</DialogTitle>
              <DialogDescription>
                Update the details for case {selectedCase ? displayCaseId(selectedCase.Identifier) : ''}
              </DialogDescription>
            </DialogHeader>
            {renderCaseForm()}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditCase}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Quick View</DialogTitle>
            </DialogHeader>
            {selectedCase && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium">Case ID</h3>
                    <p className="text-sm text-muted-foreground">{displayCaseId(selectedCase.Identifier)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Status</h3>
                    <Badge variant={
                      STATUS_OPTIONS.find(opt => opt.value === selectedCase.status)?.variant || "default"
                    }>
                      {selectedCase.status}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-medium">Contact Name</h3>
                    <p className="text-sm text-muted-foreground">{[selectedCase.firstName, selectedCase.lastName].filter(Boolean).join(' ')}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Victim Phone</h3>
                    <p className="text-sm text-muted-foreground">{selectedCase.VictimPhone}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Case Manager</h3>
                    <p className="text-sm text-muted-foreground">{getUserFullName(selectedCase.CaseManager)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Backup Case Manager</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCase.BackupCaseManager ? getUserFullName(selectedCase.BackupCaseManager) : "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium">Case Type</h3>
                    <p className="text-sm text-muted-foreground">{selectedCase.caseType}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Priority</h3>
                    <Badge variant={
                      selectedCase.priority === "Critical" ? "destructive" :
                      selectedCase.priority === "High" ? "default" :
                      selectedCase.priority === "Medium" ? "secondary" :
                      "outline"
                    }>
                      {selectedCase.priority}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <h3 className="font-medium">Victim URL</h3>
                    {shortenedUrl ? (
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
                    ) : selectedCase.websiteTemplateId ? (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">No shortened URL available</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateShortenedUrl}
                        >
                          Generate URL
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No website template assigned</p>
                    )}
                  </div>
                  {selectedCase.notes && (
                    <div className="col-span-2">
                      <h3 className="font-medium">Notes</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedCase.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Case</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete case {selectedCase ? displayCaseId(selectedCase.Identifier) : ''}?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCase}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </FadeInSection>
  );
});

CasesTable.displayName = "CasesTable";

export default CasesTable;
