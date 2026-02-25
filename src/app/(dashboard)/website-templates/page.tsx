"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { WebsiteTemplateDialog } from "@/components/website-templates/WebsiteTemplateDialog";
import { WebsiteTemplateCard } from "@/components/website-templates/WebsiteTemplateCard";
import { useToast } from "@/components/ui/use-toast";
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

interface WebsiteTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  html: string;
  type: "custom" | "generated";
  createdAt: string;
  updatedAt: string;
}

export default function WebsiteTemplatesPage() {
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WebsiteTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/website-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch website templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async (template: Omit<WebsiteTemplate, "id" | "tenantId" | "createdAt" | "updatedAt">) => {
    try {
      const response = await fetch("/api/website-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) throw new Error("Failed to create template");

      toast({
        title: "Success",
        description: "Website template created successfully",
      });

      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to create website template",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async (template: WebsiteTemplate) => {
    try {
      if (!template.id) {
        throw new Error("Template ID is required for updates");
      }

      const response = await fetch(`/api/website-templates/${template.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) throw new Error("Failed to update template");

      toast({
        title: "Success",
        description: "Website template updated successfully",
      });

      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: "Failed to update website template",
        variant: "destructive",
      });
    }
  };

  const handleEditTemplate = async (template: WebsiteTemplate) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/website-templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete template");
      }

      toast({
        title: "Success",
        description: "Website template deleted successfully",
      });

      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete website template",
        variant: "destructive",
      });
    } finally {
      setDeleteTemplateId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Website Templates</h1>
        <Button onClick={() => {
          setEditingTemplate(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <WebsiteTemplateCard
            key={template.id}
            template={template}
            onEdit={handleEditTemplate}
            onDelete={setDeleteTemplateId}
          />
        ))}
      </div>

      <WebsiteTemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
        template={editingTemplate}
      />

      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && handleDeleteTemplate(deleteTemplateId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 