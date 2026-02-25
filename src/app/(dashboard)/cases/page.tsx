"use client";

import { useState, useRef } from "react";
import CasesTable from "@/components/cases/CasesTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CaseFormWithTemplate } from "@/components/cases/CaseFormWithTemplate";
import { Case } from "@/types/case";
import { useToast } from "@/components/ui/use-toast";
import { WebsiteTemplateSelect } from "@/components/website-templates/WebsiteTemplateSelect";
import { Label } from "@/components/ui/label";
import { getAuthContext } from "@/lib/auth";

export default function CasesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const { toast } = useToast();
  const casesTableRef = useRef<{ fetchCases: () => Promise<void> }>(null);
  const [formData, setFormData] = useState({
    websiteTemplateId: "",
  });

  const handleCreate = () => {
    setSelectedCase(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (caseRecord: Case | null) => {
    setSelectedCase(caseRecord);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedCase(null);
  };

  const handleSubmit = async (values: any) => {
    try {
      const endpoint = selectedCase 
        ? `/api/cases/${selectedCase.Identifier}`
        : '/api/cases';
        
      const response = await fetch(endpoint, {
        method: selectedCase ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to save case');
      }

      const result = await response.json();

      if (!selectedCase && result.shortenedUrl) {
        toast({
          title: "Case created successfully",
          description: `Your case URL: ${result.shortenedUrl.url}`,
          duration: 10000, // Show for 10 seconds since there's a URL to copy
        });
      } else {
        toast({
          title: `Case ${selectedCase ? 'updated' : 'created'} successfully`,
          variant: "default",
        });
      }

      handleDialogClose();
      casesTableRef.current?.fetchCases();
    } catch (error) {
      console.error('Error saving case:', error);
      toast({
        title: "Error",
        description: "Failed to save case. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cases</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Case
        </Button>
      </div>

      <CasesTable ref={casesTableRef} onEdit={handleEdit} />

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto px-6 pb-6 pt-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold">
              {selectedCase ? "Edit Case" : "Create New Case"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedCase ? "Update the details for this case" : "Fill in the details to create a new case"}
            </DialogDescription>
          </DialogHeader>
          <CaseFormWithTemplate
            caseRecord={selectedCase || undefined}
            onClose={handleDialogClose}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
