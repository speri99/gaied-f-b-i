"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SecurityProfile, Permission } from "@/types/security-profile";
import { createSecurityProfileSchema } from "@/lib/validations/security-profile";
import { getAuthContext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface SecurityProfileFormProps {
  profileId?: string;
  onSuccess: () => void;
}

const SECTIONS = [
  "users",
  "cases",
  "contacts",
  "locations",
  "reports",
  "securityProfiles",
  "websiteTemplates",
  "deletedItems",
] as const;

type Section = typeof SECTIONS[number];

type PermissionState = {
  read: boolean;
  write: boolean;
};

export function SecurityProfileForm({ profileId, onSuccess }: SecurityProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const { tenantId, userId } = getAuthContext();
  const [permissions, setPermissions] = useState<Record<Section, PermissionState>>({
    users: { read: false, write: false },
    cases: { read: false, write: false },
    contacts: { read: false, write: false },
    locations: { read: false, write: false },
    reports: { read: false, write: false },
    securityProfiles: { read: false, write: false },
    websiteTemplates: { read: false, write: false },
    deletedItems: { read: false, write: false },
    notes: { read: false, write: false },
  });

  const form = useForm({
    resolver: zodResolver(createSecurityProfileSchema),
    defaultValues: {
      tenantId,
      name: "",
      description: "",
      status: "Active" as const,
      permissions: {
        users: "none" as Permission,
        cases: "none" as Permission,
        contacts: "none" as Permission,
        locations: "none" as Permission,
        reports: "none" as Permission,
        securityProfiles: "none" as Permission,
        deletedItems: "none" as Permission,
        websiteTemplates: "none" as Permission,
        notes: "none" as Permission,
      },
      tags: [],
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  // Convert checkbox state to permission type
  const getPermissionType = (state: PermissionState): Permission => {
    if (state.write) return "write";
    if (state.read) return "read";
    return "none";
  };

  // Convert permission type to checkbox state
  const getPermissionState = (permission: Permission): PermissionState => {
    switch (permission) {
      case "write":
        return { read: true, write: true };
      case "read":
        return { read: true, write: false };
      default:
        return { read: false, write: false };
    }
  };

  // Update form when permissions change
  useEffect(() => {
    const newPermissions = Object.entries(permissions).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: getPermissionType(value),
    }), {});
    
    form.setValue("permissions", newPermissions as any);
  }, [permissions]);

  async function fetchProfile() {
    try {
      setLoading(true);
      console.log("Fetching profile:", profileId);
      
      const response = await fetch(`/api/security-profiles/${profileId}`, {
        headers: {
          "x-tenant-id": tenantId,
          "x-user-id": userId,
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Failed to fetch profile:", {
          status: response.status,
          error: errorData
        });
        throw new Error(errorData?.error || "Failed to fetch profile");
      }
      
      const profile = await response.json();
      console.log("Fetched profile:", profile);
      
      // Reset form with profile data
      form.reset({
        ...profile,
        status: profile.status || "Active",
        permissions: {
          users: profile.permissions?.users || "none",
          cases: profile.permissions?.cases || "none",
          contacts: profile.permissions?.contacts || "none",
          locations: profile.permissions?.locations || "none",
          reports: profile.permissions?.reports || "none",
          securityProfiles: profile.permissions?.securityProfiles || "none",
          websiteTemplates: profile.permissions?.websiteTemplates || "none",
          deletedItems: profile.permissions?.deletedItems || "none",
          notes: profile.permissions?.notes || "none",
        }
      });
      
      // Set initial permission states with proper typing
      const initialPermissions: Record<Section, PermissionState> = {
        users: getPermissionState(profile.permissions?.users as Permission || "none"),
        cases: getPermissionState(profile.permissions?.cases as Permission || "none"),
        contacts: getPermissionState(profile.permissions?.contacts as Permission || "none"),
        locations: getPermissionState(profile.permissions?.locations as Permission || "none"),
        reports: getPermissionState(profile.permissions?.reports as Permission || "none"),
        securityProfiles: getPermissionState(profile.permissions?.securityProfiles as Permission || "none"),
        websiteTemplates: getPermissionState(profile.permissions?.websiteTemplates as Permission || "none"),
        deletedItems: getPermissionState(profile.permissions?.deletedItems as Permission || "none"),
        notes: getPermissionState(profile.permissions?.notes as Permission || "none"),
      };
      
      setPermissions(initialPermissions);
      setTags(profile.tags || []);
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load security profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(values: any) {
    try {
      setLoading(true);
      const method = profileId ? "PUT" : "POST";
      const url = profileId 
        ? `/api/security-profiles/${profileId}`
        : "/api/security-profiles";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
          "x-user-id": userId,
        },
        body: JSON.stringify({ ...values, tags }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to save profile");
      }

      toast({
        title: "Success",
        description: `Security profile ${profileId ? "updated" : "created"} successfully`,
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto px-1">
        <div className="space-y-4">
          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Name</FormLabel>
                  <FormControl>
                    <Input className="max-w-md" placeholder="Enter profile name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      className="max-w-2xl resize-none" 
                      placeholder="Enter profile description" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="max-w-[200px]">
                  <FormLabel className="text-sm font-semibold">Status</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="border-b pb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Permissions</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Object.entries(permissions).map(([section, state]) => (
              <div key={section} className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border">
                <div className="font-medium capitalize">
                  {section.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${section}-read`}
                      checked={state.read}
                      onCheckedChange={(checked) => {
                        const newState = { ...permissions[section as Section] };
                        newState.read = checked;
                        if (!checked) newState.write = false;
                        setPermissions({
                          ...permissions,
                          [section]: newState,
                        });
                      }}
                    />
                    <label htmlFor={`${section}-read`} className="text-sm">Read</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${section}-write`}
                      checked={state.write}
                      onCheckedChange={(checked) => {
                        const newState = { ...permissions[section as Section] };
                        newState.write = checked;
                        if (checked) newState.read = true;
                        setPermissions({
                          ...permissions,
                          [section]: newState,
                        });
                      }}
                    />
                    <label htmlFor={`${section}-write`} className="text-sm">Write</label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="border-b pb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Tags</h3>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-sm py-1 px-2">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:text-destructive focus:outline-none"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              className="max-w-md"
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : profileId ? "Update Profile" : "Create Profile"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 