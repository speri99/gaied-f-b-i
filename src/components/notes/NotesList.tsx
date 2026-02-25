"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export interface Note {
  id: string;
  content: string;
  timestamp: string;
  createdBy: string;
  entityId: string;
  entityType: "case" | "contact";
}

interface NotesListProps {
  notes: Note[];
  entityId: string;
  entityType: "case" | "contact";
  onAddNote: (content: string) => Promise<void>;
  showAddNote?: boolean;
  limit?: number;
}

export function NotesList({ 
  notes, 
  entityId, 
  entityType,
  onAddNote,
  showAddNote = true,
  limit 
}: NotesListProps) {
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddNote(newNote.trim());
      setNewNote("");
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayNotes = limit ? notes.slice(0, limit) : notes;

  return (
    <div className="space-y-4">
      {showAddNote && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[100px]"
          />
          <Button type="submit" disabled={isSubmitting || !newNote.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding note...
              </>
            ) : (
              "Add Note"
            )}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {displayNotes.length > 0 ? (
          displayNotes.map((note) => (
            <div key={note.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{note.createdBy}</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(note.timestamp), "PPpp")}
                  </span>
                </div>
              </div>
              <p className="whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No notes available.
          </p>
        )}
      </div>
    </div>
  );
} 