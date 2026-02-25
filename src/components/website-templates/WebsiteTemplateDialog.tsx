"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface WebsiteTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (template: {
    id?: string;
    name: string;
    description: string;
    html: string;
    type: "custom" | "generated";
  }) => Promise<void>;
  template?: {
    id: string;
    name: string;
    description: string;
    html: string;
    type: "custom" | "generated";
  };
}

export function WebsiteTemplateDialog({ open, onOpenChange, onSubmit, template }: WebsiteTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [html, setHtml] = useState("");
  const [type, setType] = useState<"custom" | "generated">("generated");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setName("");
    setDescription("");
    setHtml("");
    setType("generated");
  };

  // Effect to update form when template changes or dialog opens
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setHtml(template.html);
      setType(template.type);
    } else {
      resetForm();
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalHtml = html;
      
      if (type === "generated") {
        // Call AWS Bedrock to generate HTML based on description
        const response = await fetch("/api/website-templates/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate template");
        }

        const { html: generatedHtml } = await response.json();
        finalHtml = generatedHtml;
      }

      await onSubmit({
        id: template?.id,
        name,
        description,
        html: finalHtml,
        type,
      });
      
      resetForm();
    } catch (error) {
      console.error("Error submitting template:", error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        resetForm();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Edit" : "Create"} Website Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 404 Page, Pizza Store"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === "generated" 
                  ? "Describe the webpage you want to create. The AI will generate a responsive design based on your description."
                  : "Describe the purpose of this template"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Template Type</Label>
              <RadioGroup
                value={type}
                onValueChange={(value) => setType(value as "custom" | "generated")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="generated" id="generated" />
                  <Label htmlFor="generated">AI Generated</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom HTML</Label>
                </div>
              </RadioGroup>
            </div>

            {type === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="html">HTML Content</Label>
                <Textarea
                  id="html"
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  placeholder="Enter your HTML code"
                  className="font-mono"
                  rows={10}
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {template ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 