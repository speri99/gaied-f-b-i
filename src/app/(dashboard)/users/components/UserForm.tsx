"use client";

import { useEffect, useState } from "react";
import { User, AuthMethod } from "@/types/user";
import { SecurityProfile } from "@/types/security-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema } from "@/lib/validations/user";
import { getAuthContext } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { TempPasswordModal } from "@/components/ui/temp-password-modal";

const AUTH_METHOD_OPTIONS: { value: AuthMethod; label: string }[] = [
  { value: "SAML", label: "SAML" },
  { value: "Password", label: "Password" },
];

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const [securityProfiles, setSecurityProfiles] = useState<SecurityProfile[]>([]);
  const [authContext, setAuthContext] = useState<{ tenantId: string; userId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const { toast } = useToast();

  // Fetch auth context
  useEffect(() => {
    const fetchAuthContext = async () => {
      try {
        const context = await getAuthContext();
        console.log("Auth context fetched:", context);
        setAuthContext(context);
      } catch (error) {
        console.error("Error fetching auth context:", error);
        toast({
          title: "Error",
          description: "Failed to get authentication context",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthContext();
  }, [toast]);

  const form = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      tenantId: "",
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phoneNumber: user?.phoneNumber || "",
      status: user?.status || "Active",
      authMethod: user?.authMethod || "Password",
      smsEnabled: user?.smsEnabled || false,
      securityProfiles: user?.securityProfiles || [],
    },
  });

  // Set tenantId in form when auth context is loaded
  useEffect(() => {
    if (authContext?.tenantId) {
      console.log("Setting tenantId in form:", authContext.tenantId);
      form.setValue("tenantId", authContext.tenantId);
    }
  }, [authContext, form]);

  // Add form state logging
  useEffect(() => {
    const subscription = form.watch((value) => {
      console.log("Form values changed:", value);
      console.log("Form errors:", form.formState.errors);
      console.log("Form is valid:", form.formState.isValid);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Fetch security profiles for the dropdown
  const fetchSecurityProfiles = async () => {
    try {
      const response = await fetch("/api/security-profiles", {
        headers: {
          "x-tenant-id": authContext?.tenantId || "",
          "x-user-id": authContext?.userId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch security profiles");
      }

      const data = await response.json();
      setSecurityProfiles(data.items);
    } catch (error) {
      console.error("Error fetching security profiles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch security profiles",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSecurityProfiles();
  }, [authContext]);

  const formatPhoneNumber = (value: string | undefined | null) => {
    // Return empty string if value is undefined or null
    if (!value) return "";
    
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");
    
    // Ensure it starts with +1
    if (numbers.length > 0) {
      // If the number already starts with 1, just add the +
      if (numbers.startsWith("1")) {
        return `+${numbers}`;
      }
      // If it doesn't start with 1, add +1
      return `+1${numbers}`;
    }
    return value;
  };

  const handleResetPassword = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.userId}/password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": authContext?.tenantId || "",
          "x-user-id": authContext?.userId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }

      const data = await response.json();
      setTempPassword(data.tempPassword);
      setShowTempPassword(true);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: any) => {
    console.log("onSubmit function called with values:", values);
    
    try {
      // Check if auth context is loaded
      if (!authContext) {
        console.error("Auth context not loaded yet");
        throw new Error("Authentication context not loaded. Please try again.");
      }
      
      const now = Date.now();

      // Format phone number before submission
      const formattedValues = {
        ...values,
        phoneNumber: formatPhoneNumber(values.phoneNumber || ""),
      };

      console.log("Formatted values:", formattedValues);

      const endpoint = user
        ? `/api/users/${user.userId}`
        : "/api/users";
      const method = user ? "PATCH" : "POST";

      // Ensure securityProfiles is an array and not empty
      if (!formattedValues.securityProfiles || formattedValues.securityProfiles.length === 0) {
        console.error("Security profiles validation failed:", formattedValues.securityProfiles);
        throw new Error("At least one security profile is required");
      }

      // Prepare the user data in the correct format
      const submitData = {
        tenantId: authContext.tenantId,
        email: formattedValues.email,
        firstName: formattedValues.firstName,
        lastName: formattedValues.lastName,
        phoneNumber: formattedValues.phoneNumber,
        status: "Active",
        authMethod: formattedValues.authMethod,
        smsEnabled: formattedValues.smsEnabled,
        securityProfiles: Array.isArray(formattedValues.securityProfiles) 
          ? formattedValues.securityProfiles 
          : [formattedValues.securityProfiles],
        createdAt: now,
        updatedAt: now,
        createdBy: authContext.userId,
        updatedBy: authContext.userId,
        metadata: {},
      };

      // Remove any undefined values
      Object.keys(submitData).forEach(key => 
        submitData[key] === undefined && delete submitData[key]
      );

      console.log("Making API request to:", endpoint, "with method:", method);
      console.log("Request body:", submitData);
      console.log("Request headers:", {
        "Content-Type": "application/json",
        "x-tenant-id": authContext.tenantId,
        "x-user-id": authContext.userId,
      });

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": authContext.tenantId,
          "x-user-id": authContext.userId,
        },
        body: JSON.stringify(submitData),
      });

      console.log("API response status:", response.status);
      console.log("API response headers:", Object.fromEntries(response.headers.entries()));

      const responseData = await response.json();
      console.log("API response data:", responseData);

      if (!response.ok) {
        console.error("API error response:", responseData);
        throw new Error(responseData?.error || `Failed to ${user ? "update" : "create"} user`);
      }

      console.log("API response successful:", responseData);

      if (responseData.tempPassword) {
        setTempPassword(responseData.tempPassword);
        setShowTempPassword(true);
      } else {
        toast({
          title: user ? "User updated" : "User created",
          description: user ? "User updated successfully" : "User created successfully",
        });
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(`Error ${user ? "updating" : "creating"} user:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${user ? "update" : "create"} user`,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          console.log("Form submit event triggered");
          
          // Check if auth context is loaded
          if (!authContext) {
            console.error("Auth context not loaded yet");
            toast({
              title: "Error",
              description: "Authentication context not loaded. Please try again.",
              variant: "destructive",
            });
            return;
          }
          
          try {
            console.log("Form state before submission:", form.getValues());
            console.log("Form errors:", form.formState.errors);
            console.log("Form is valid:", form.formState.isValid);
            console.log("Form is dirty:", form.formState.isDirty);
            
            // Check if form is valid
            const isValid = await form.trigger();
            console.log("Form validation result:", isValid);
            
            if (!isValid) {
              console.error("Form validation failed:", form.formState.errors);
              return;
            }
            
            // Get form values
            const values = form.getValues();
            console.log("Form values for submission:", values);
            
            // Call the onSubmit handler
            await onSubmit(values);
          } catch (error) {
            console.error("Error in form submission:", error);
          }
        }} 
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Doe" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="user@example.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormDescription>
                Enter phone number in format: +1 (XXX) XXX-XXXX
              </FormDescription>
              <FormControl>
                <Input 
                  {...field} 
                  type="tel" 
                  placeholder="+1 (555) 123-4567"
                  onChange={(e) => {
                    let value = e.target.value;
                    // Allow user to type normally, but store in required format
                    field.onChange(value);
                  }}
                  onBlur={(e) => {
                    // Format on blur
                    const formatted = formatPhoneNumber(e.target.value);
                    field.onChange(formatted);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="securityProfiles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Security Profile</FormLabel>
              <FormDescription>
                Select a security profile to define the user's permissions and access level
              </FormDescription>
              <Select
                onValueChange={(value) => field.onChange([value])}
                value={field.value?.[0] || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a security profile" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {securityProfiles.map((profile) => (
                    <SelectItem key={profile.profileId} value={profile.profileId}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="authMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Method</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select auth method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {AUTH_METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="smsEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>SMS Notifications</FormLabel>
                  <FormDescription>
                    Enable SMS notifications for this user
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          {user && user.authMethod === "Password" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleResetPassword}
            >
              Reset Password
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit">
            {user ? "Update" : "Create"} User
          </Button>
        </div>
      </form>

      <TempPasswordModal
        isOpen={showTempPassword}
        onClose={() => setShowTempPassword(false)}
        tempPassword={tempPassword}
        userEmail={user?.email || form.getValues("email")}
      />
    </Form>
  );
} 