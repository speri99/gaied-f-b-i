import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Code, Clock, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

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

interface WebsiteTemplateCardProps {
  template: WebsiteTemplate;
  onEdit: (template: WebsiteTemplate) => void;
  onDelete: (templateId: string) => void;
  canEdit?: boolean;
}

export function WebsiteTemplateCard({ 
  template, 
  onEdit, 
  onDelete,
  canEdit = true 
}: WebsiteTemplateCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {template.type === "custom" ? (
                <Code className="h-5 w-5" />
              ) : (
                <Globe className="h-5 w-5" />
              )}
              {template.name}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(template)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(template.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>Last updated {format(new Date(template.updatedAt), "PP")}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[375px] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Mobile Preview</DialogTitle>
          </DialogHeader>
          <div className="relative w-[375px] h-[667px] mx-auto bg-white">
            <iframe
              srcDoc={template.html}
              className="w-full h-full border-0"
              title="Template Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 