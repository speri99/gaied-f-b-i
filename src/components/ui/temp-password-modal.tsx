import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy } from "lucide-react";

interface TempPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempPassword: string;
  userEmail: string;
}

export function TempPasswordModal({
  isOpen,
  onClose,
  tempPassword,
  userEmail,
}: TempPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Temporary Password Generated</DialogTitle>
          <DialogDescription>
            A temporary password has been generated for {userEmail}. Please copy this password and share it securely with the user.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Input
              readOnly
              value={tempPassword}
              className="font-mono"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="px-3"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Copy password</span>
          </Button>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Important: The user will be required to change this password on their first login.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 