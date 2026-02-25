import { CaseForm } from "./CaseForm";
import { Case } from "@/types/case";

interface CaseFormWithTemplateProps {
  caseRecord?: Case;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
}

export function CaseFormWithTemplate({ caseRecord, onClose, onSubmit }: CaseFormWithTemplateProps) {
  return (
    <CaseForm 
      caseRecord={caseRecord} 
      onClose={onClose} 
      onSubmit={onSubmit}
    />
  );
} 