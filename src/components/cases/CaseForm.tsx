"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Case, CreateCaseInput, ContactMethod } from "@/types/case";
import { createCaseSchema, updateCaseSchema } from "@/lib/validations";
import { normalizePhoneNumber, generateCaseId } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { UserSelect } from "@/components/ui/user-select";
import { User } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { getCountries, CountryCode, getCountryCallingCode } from "libphonenumber-js";
import { Loader2 } from "lucide-react";
import { ShortenedUrlService } from "@/lib/services/shortened-url.service";
import { getAuthContext } from "@/lib/auth";
import { WebsiteTemplateSelect } from "@/components/website-templates/WebsiteTemplateSelect";
import { CasePhoneIndex } from "@/types/case-phone-index";
import { ClientActionLogService } from "@/lib/services/client-action-log.service";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkflowSelect } from "../ui/workflow-select";
import { Workflow } from "@/types/workflow";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Pending", label: "Pending" },
  { value: "Closed", label: "Closed" },
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

interface CaseFormProps {
  caseRecord?: Case;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
}

export function CaseForm({ caseRecord, onClose, onSubmit }: CaseFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("US");
  const { tenantId } = getAuthContext();
  const [phoneNumbers, setPhoneNumbers] = useState<CasePhoneIndex[]>([]);
  const [additionalPhoneInputs, setAdditionalPhoneInputs] = useState<Array<{
    id: string;
    phoneNumber: string;
    country: CountryCode;
  }>>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPhoneLabel, setNewPhoneLabel] = useState("Mobile");
  const [isNewPhonePrimary, setIsNewPhonePrimary] = useState(false);
  const [users, setUsers] = useState<Record<string, User>>({});


  
  // Initialize form with proper default values
  const defaultValues = caseRecord ? {
    ...caseRecord,
    tenantId: caseRecord.tenantId || tenantId,
    websiteTemplateId: caseRecord.websiteTemplateId || "",
    contactMethods: caseRecord.contactMethods || [],
    tags: caseRecord.tags || [],
    // Ensure all string fields have empty string defaults
    VictimName: caseRecord.VictimName || "",
    VictimPhone: caseRecord.VictimPhone || "",
    CaseManager: caseRecord.CaseManager || "",
    CaseManagerEmail: caseRecord.CaseManagerEmail || "",
    CaseManagerPhone: caseRecord.CaseManagerPhone || "",
    BackupCaseManager: caseRecord.BackupCaseManager || "",
    BackupCaseManagerEmail: caseRecord.BackupCaseManagerEmail || "",
    BackupCaseManagerPhone: caseRecord.BackupCaseManagerPhone || "",
    ReportedAbuser: caseRecord.ReportedAbuser || "",
    notes: caseRecord.notes || "",
    status: caseRecord.status || "Active",
    caseType: caseRecord.caseType || "Domestic Violence",
    priority: caseRecord.priority || "Medium",
    smsNotifications: caseRecord.smsNotifications ?? false,
    backupSmsNotifications: caseRecord.backupSmsNotifications ?? false,
    workflowId:caseRecord.workflowID ?? "",
    metadata: {
      caseType: caseRecord.metadata?.caseType || "Domestic Violence",
      category: caseRecord.metadata?.category || "Domestic Violence",
      tags: caseRecord.metadata?.tags || [],
      description: caseRecord.metadata?.description || "",
      notes: caseRecord.metadata?.notes || [],
    }
  } : {
    tenantId: tenantId,
    Identifier: generateCaseId(tenantId),
    VictimName: "",
    VictimPhone: "",
    CaseManager: "",
    CaseManagerEmail: "",
    CaseManagerPhone: "",
    BackupCaseManager: "",
    BackupCaseManagerEmail: "",
    BackupCaseManagerPhone: "",
    status: "Active",
    caseType: "Domestic Violence",
    priority: "Medium",
    smsNotifications: false,
    backupSmsNotifications: false,
    tags: [],
    contactMethods: [],
    websiteTemplateId: "",
    ReportedAbuser: "",
    notes: "",
    metadata: {
      caseType: "Domestic Violence",
      category: "Domestic Violence",
      tags: [],
      description: "",
      notes: [],
    },
  };

  const form = useForm<CreateCaseInput>({
    resolver: zodResolver(caseRecord ? updateCaseSchema : createCaseSchema),
    defaultValues,
    mode: "onChange",
  });


  useEffect(() => {
    const initAuth = async () => {
      const context = await getAuthContext();
      defaultValues.tenantId=context?.tenantId;
    };
    initAuth();
  }, []);
  // Debug logging without causing infinite updates
  useEffect(() => {
    const formState = form.formState;
    console.log('[Form Debug] Form State:', {
      isDirty: formState.isDirty,
      dirtyFields: formState.dirtyFields,
      isValid: formState.isValid,
      errors: formState.errors,
    });
  }, [form.formState]);

  // Reset form when caseRecord changes
  useEffect(() => {
    if (caseRecord) {
      form.reset(defaultValues);
    }
  }, [caseRecord]);

  const [newTag, setNewTag] = useState("");
  const [newContactMethod, setNewContactMethod] = useState<ContactMethod>("email");

  // Fetch phone numbers if editing an existing case
  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      if (caseRecord) {
        try {
          const response = await fetch(`/api/cases/${caseRecord.Identifier}/phone-numbers`, {
            headers: {
              "x-tenant-id": tenantId,
              "x-user-id": "current-user", // This will be replaced by the server
            }
          });

          if (response.ok) {
            const data = await response.json();
            setPhoneNumbers(data.phoneNumbers || []);

            // If there are no phone numbers but there is a VictimPhone, add it as the primary
            if (data.phoneNumbers.length === 0 && caseRecord.VictimPhone) {
              setPhoneNumbers([{
                tenantId,
                phoneNumber: caseRecord.VictimPhone,
                caseId: caseRecord.Identifier,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isPrimary: true,
                label: "Primary"
              }]);
            }
          }
        } catch (error) {
          console.error("Error fetching phone numbers:", error);
        }
      }
    };

    fetchPhoneNumbers();
  }, [caseRecord, tenantId]);

  // Set initial values when caseRecord changes
  useEffect(() => {
    if (caseRecord) {
      // Set the country code based on the phone number
      const countryCode = caseRecord.VictimPhone?.startsWith("+1") ? "US" :
        caseRecord.VictimPhone?.startsWith("+44") ? "GB" :
          caseRecord.VictimPhone?.startsWith("+61") ? "AU" : "US";
      setSelectedCountry(countryCode);

      // Reset form with all values from caseRecord
      form.reset({
        ...caseRecord,
        tenantId: caseRecord.tenantId || tenantId,
        websiteTemplateId: caseRecord.websiteTemplateId || "",
        contactMethods: caseRecord.contactMethods || [],
        tags: caseRecord.tags || [],
      });
    }
  }, [caseRecord, form]);

  // Add debug function
  const debugLog = (message: string, data: any) => {
    console.log(`[CaseForm Debug] ${message}:`, data);
  };

  // Log form state on every render
  useEffect(() => {
    debugLog('Form state', {
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      errors: form.formState.errors,
      dirtyFields: form.formState.dirtyFields,
    });
  }, [form.formState]);

  useEffect(() => {
    debugLog('Form mounted');
    debugLog('Initial form state:', form.formState);
    debugLog('Initial form values:', form.getValues());
    return () => debugLog('Form unmounted');
  }, [form]);

  useEffect(() => {
    // Add watch effect to log form changes
    const subscription = form.watch((value, { name, type }) => {
      debugLog('Form field changed:', { name, type, value });
      debugLog('Current form state:', form.formState);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    // Update the debug logging
    debugLog('Form validation state', {
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      errors: form.formState.errors,
      values: form.getValues(),
      touchedFields: form.formState.touchedFields,
      dirtyFields: form.formState.dirtyFields
    });
  }, [form.formState]);

  const onSubmitForm = async (values: CreateCaseInput) => {
    try {
      setLoading(true);
      // Add debug logging
      debugLog('Form values:', values);
      debugLog('Form state:', form.formState);

      // Normalize the phone number
      const normalizedPhone = normalizePhoneNumber(values.VictimPhone, selectedCountry);

      if (!normalizedPhone) {
        toast({
          title: "Invalid phone number",
          description: "Please enter a valid phone number",
          variant: "destructive",
        });
        return;
      }

      // Update the values with the normalized phone number and ensure optional fields are properly handled
      const updatedValues = {
        ...values,
        VictimPhone: normalizedPhone,
        BackupCaseManagerEmail: values.BackupCaseManagerEmail || "",
        BackupCaseManagerPhone: values.BackupCaseManagerPhone || "",
      };

      // Submit the case
      const result = await onSubmit(updatedValues);

      // Log the action using the client-side service
      await ClientActionLogService.logAction({
        entityId: updatedValues.Identifier,
        entityType: 'case',
        action: caseRecord ? 'update' : 'create',
        details: updatedValues
      });

      // If this is a new case, add the primary phone number
      if (!caseRecord && phoneNumbers.length === 0) {
        try {
          await fetch(`/api/cases/${updatedValues.Identifier}/phone-numbers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': tenantId,
              'x-user-id': 'current-user',
            },
            body: JSON.stringify({
              phoneNumber: normalizedPhone,
              isPrimary: true,
              label: 'Primary'
            }),
          });

          // Log the action using the client-side service
          await ClientActionLogService.logAction({
            entityId: updatedValues.Identifier,
            entityType: 'phone_number',
            action: 'add',
            details: {
              phoneNumber: normalizedPhone,
              isPrimary: true,
              label: 'Primary'
            }
          });
        } catch (error) {
          console.error("Error adding primary phone number:", error);
        }
      }

      // Show success message
      toast({
        title: "Success",
        description: caseRecord ? "Case updated successfully" : "Case created successfully",
      });

      // Close the form
      onClose();
    } catch (error) {
      console.error('Error submitting case:', error);
      toast({
        title: "Error",
        description: "Failed to save case. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add validation trigger on case manager selection
  const handleCaseManagerSelect = (user: User) => {
    // Set values and mark fields as touched
    form.setValue("CaseManager", user.userId, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
    form.setValue("CaseManagerEmail", user.email, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
    form.setValue("CaseManagerPhone", user.phoneNumber || "", {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });

    // Trigger form validation
    form.trigger(["CaseManager", "CaseManagerEmail", "CaseManagerPhone"]);

    debugLog('After case manager selection', {
      values: form.getValues(),
      errors: form.formState.errors,
      isDirty: form.formState.isDirty,
      dirtyFields: form.formState.dirtyFields,
      touchedFields: form.formState.touchedFields
    });
  };

  // Add validation trigger on backup case manager selection
  const handleBackupCaseManagerSelect = (user: User | null) => {
    if (user) {
      // Set values and mark fields as touched
      form.setValue("BackupCaseManager", user.userId, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      form.setValue("BackupCaseManagerEmail", user.email, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      form.setValue("BackupCaseManagerPhone", user.phoneNumber || "", {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
    } else {
      // Clear backup case manager fields
      form.setValue("BackupCaseManager", "", {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      form.setValue("BackupCaseManagerEmail", "", {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      form.setValue("BackupCaseManagerPhone", "", {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
    }

    // Force validation of all fields
    form.trigger();

    debugLog('After backup case manager selection', {
      values: form.getValues(),
      errors: form.formState.errors,
      isDirty: form.formState.isDirty,
      dirtyFields: form.formState.dirtyFields,
      touchedFields: form.formState.touchedFields,
      isValid: form.formState.isValid
    });
  };

  const handleWorkflowSelect = (workflow: Workflow | null) => {
    if (workflow) {
      // Set values and mark fields as touched
      form.setValue("workflowId", workflow.workflowId);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault();
      const currentTags = form.getValues("tags") || [];
      if (!currentTags.includes(newTag.trim())) {
        form.setValue("tags", [...currentTags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleAddContactMethod = () => {
    const currentMethods = form.getValues("contactMethods") || [];
    if (!currentMethods.includes(newContactMethod)) {
      form.setValue("contactMethods", [...currentMethods, newContactMethod]);
    }
  };

  const handleRemoveContactMethod = (methodToRemove: ContactMethod) => {
    const currentMethods = form.getValues("contactMethods") || [];
    form.setValue(
      "contactMethods",
      currentMethods.filter((method) => method !== methodToRemove)
    );
  };

  const handleAddPhoneInput = () => {
    setAdditionalPhoneInputs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        phoneNumber: "",
        country: "US"
      }
    ]);
  };

  const handleRemovePhoneInput = (id: string) => {
    setAdditionalPhoneInputs(prev => prev.filter(input => input.id !== id));
  };

  const handlePhoneInputChange = (id: string, value: string) => {
    setAdditionalPhoneInputs(prev => prev.map(input =>
      input.id === id ? { ...input, phoneNumber: value } : input
    ));
  };

  const handleCountryChange = (id: string, value: CountryCode) => {
    setAdditionalPhoneInputs(prev => prev.map(input =>
      input.id === id ? { ...input, country: value } : input
    ));
  };

  const handleAddPhoneNumber = async (phoneNumber: string, country: CountryCode) => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber, country);
    if (!normalizedPhone) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    // If this is a new case, just add to the local state
    if (!caseRecord) {
      const newPhone: CasePhoneIndex = {
        tenantId,
        phoneNumber: normalizedPhone,
        caseId: form.getValues("Identifier"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPrimary: false,
        label: "Additional"
      };

      setPhoneNumbers(prev => [...prev, newPhone]);

      // Log the action using the client-side service
      await ClientActionLogService.logAction({
        entityId: form.getValues("Identifier"),
        entityType: 'phone_number',
        action: 'add',
        details: {
          phoneNumber: normalizedPhone,
          isPrimary: false,
          label: "Additional"
        }
      });

      return;
    }

    // For existing cases, add via API
    try {
      const response = await fetch(`/api/cases/${caseRecord.Identifier}/phone-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': 'current-user',
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          isPrimary: false,
          label: "Additional"
        }),
      });

      if (response.ok) {
        const newPhone = await response.json();
        setPhoneNumbers(prev => [...prev, newPhone]);

        // Log the action using the client-side service
        await ClientActionLogService.logAction({
          entityId: caseRecord.Identifier,
          entityType: 'phone_number',
          action: 'add',
          details: {
            phoneNumber: normalizedPhone,
            isPrimary: false,
            label: "Additional"
          }
        });

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
    // Check if this is the primary number
    const isRemovingPrimary = phoneNumbers.find(p => p.phoneNumber === phoneNumber)?.isPrimary;
    if (isRemovingPrimary) {
      toast({
        title: "Error",
        description: "Cannot delete the primary phone number. Please set another number as primary first.",
        variant: "destructive",
      });
      return;
    }

    if (!caseRecord) {
      setPhoneNumbers(prev => prev.filter(phone => phone.phoneNumber !== phoneNumber));

      // Log the action using the client-side service
      await ClientActionLogService.logAction({
        entityId: form.getValues("Identifier"),
        entityType: 'phone_number',
        action: 'remove',
        details: { phoneNumber }
      });

      return;
    }

    try {
      const response = await fetch(`/api/cases/${caseRecord.Identifier}/phone-numbers`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': 'current-user',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      if (response.ok) {
        setPhoneNumbers(prev => prev.filter(phone => phone.phoneNumber !== phoneNumber));

        // Log the action using the client-side service
        await ClientActionLogService.logAction({
          entityId: caseRecord.Identifier,
          entityType: 'phone_number',
          action: 'remove',
          details: { phoneNumber }
        });

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
    if (!caseRecord) {
      setPhoneNumbers(prev =>
        prev.map(phone => ({
          ...phone,
          isPrimary: phone.phoneNumber === phoneNumber
        }))
      );

      // Update the form's VictimPhone
      form.setValue("VictimPhone", phoneNumber);
      return;
    }

    try {
      const response = await fetch(`/api/cases/${caseRecord.Identifier}/phone-numbers/${phoneNumber}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': 'current-user', // This will be replaced by the server
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

        // Update the form's VictimPhone
        form.setValue("VictimPhone", phoneNumber);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitForm,(errors) => console.log("Validation Errors:", errors))}>
        <div className="space-y-6 px-0 py-2 pb-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-base font-medium text-muted-foreground mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="VictimPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Phone</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondaryPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Phone</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="(123) 456-7890" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Case Type and Reported Abuser */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="caseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select case type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPE_OPTIONS.map((option) => (
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
              name="ReportedAbuser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reported Abuser</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Case Management */}
          <div>
            <h3 className="text-base font-medium text-muted-foreground mb-4">Case Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="CaseManager"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Case Manager</FormLabel>
                    <UserSelect
                      value={value}
                      onValueChange={onChange}
                      onUserSelect={handleCaseManagerSelect}
                      placeholder="Select case manager..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="BackupCaseManager"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Backup Case Manager</FormLabel>
                    <UserSelect
                      value={value}
                      onValueChange={onChange}
                      onUserSelect={handleBackupCaseManagerSelect}
                      placeholder="Select backup case manager..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Case Worker Contact Options */}
          <div>
            <h3 className="text-base font-medium text-muted-foreground mb-4">Case Worker Contact Options</h3>
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="contactMethods"
                render={({ field }) => (
                  <FormItem className="flex gap-8">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes('email')}
                        onCheckedChange={(checked) => {
                          const currentMethods = field.value || [];
                          if (checked) {
                            field.onChange([...currentMethods, 'email']);
                          } else {
                            field.onChange(currentMethods.filter(m => m !== 'email'));
                          }
                        }}
                      />
                      <FormLabel className="text-base">Email</FormLabel>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes('phone')}
                        onCheckedChange={(checked) => {
                          const currentMethods = field.value || [];
                          if (checked) {
                            field.onChange([...currentMethods, 'phone']);
                          } else {
                            field.onChange(currentMethods.filter(m => m !== 'phone'));
                          }
                        }}
                      />
                      <FormLabel className="text-base">Phone</FormLabel>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes('text')}
                        onCheckedChange={(checked) => {
                          const currentMethods = field.value || [];
                          if (checked) {
                            field.onChange([...currentMethods, 'text']);
                          } else {
                            field.onChange(currentMethods.filter(m => m !== 'text'));
                          }
                        }}
                      />
                      <FormLabel className="text-base">Text</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/*workflow details*/}

          <div>
            <h3 className="text-base font-medium text-muted-foreground mb-4">Workflow Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workflowId"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Choose Workflow</FormLabel>
                    <WorkflowSelect
                      value={value}
                      onValueChange={onChange} 
                      onWorkFlowSelect={handleWorkflowSelect}
                      placeholder="Select Workflow..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          {/* Case Details */}
          <div className="mb-20">
            <h3 className="text-base font-medium text-muted-foreground mb-4">Case Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((option) => (
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
                name="websiteTemplateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website Template</FormLabel>
                    <WebsiteTemplateSelect
                      tenantId={tenantId}
                      value={field.value}
                      onChange={field.onChange}
                      required
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="Type and press Enter to add"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleAddTag}
                      />
                      <div className="flex flex-wrap gap-2">
                        {field.value?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default CaseForm; 