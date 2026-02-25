import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
}

interface WebsiteTemplateSelectProps {
  tenantId: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

export function WebsiteTemplateSelect({ 
  tenantId, 
  value, 
  onChange, 
  required = false,
  className 
}: WebsiteTemplateSelectProps) {
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/website-templates');
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.statusText}`);
        }
        const data = await response.json();
        // Check if data is a paginated response with items property
        const templatesArray = data.items || data;
        setTemplates(templatesArray);
      } catch (error) {
        console.error("Error fetching templates:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch templates");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading templates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error: {error}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No templates available
      </div>
    );
  }

  return (
    <Select 
      value={value} 
      onValueChange={onChange} 
      required={required}
    >
      <SelectTrigger className={cn(
        required && !value && "border-red-500",
        className
      )}>
        <SelectValue placeholder="Select a website template" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 