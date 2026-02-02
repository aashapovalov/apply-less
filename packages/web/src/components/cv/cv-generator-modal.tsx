import { useEffect, useState } from 'react';

import {
  CVModalError,
  CVModalInitial,
  CVModalLoading,
  CVModalProfileRequired,
  CVModalSuccess,
} from '@/components/cv';
import { INITIAL_STEPS, MIN_PROFILE_WORDS } from '@/constants';
import { useCompareCVMutation, useGenerateCVMutation } from '@/services/cv';
import type { CVCompareResponse, CVGenerateResponse } from '@/types';
import type { CVJob, LoadingStep, ModalState } from '@/types';
import { cn } from '@/utils';

interface CVGeneratorModalProps {
  job: CVJob;
  isOpen: boolean;
  onClose: () => void;
  profileWordCount: number;
}

export function CVGeneratorModal({
  job,
  isOpen,
  onClose,
  profileWordCount,
}: CVGeneratorModalProps) {
  const [state, setState] = useState<ModalState>('initial');
  const [steps, setSteps] = useState<LoadingStep[]>(INITIAL_STEPS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cvData, setCvData] = useState<CVGenerateResponse | null>(null);
  const [compareData, setCompareData] = useState<CVCompareResponse | null>(null);

  const [generateCV] = useGenerateCVMutation();
  const [compareCV] = useCompareCVMutation();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState('initial');
      setSteps(INITIAL_STEPS);
      setErrorMessage(null);
      setCvData(null);
      setCompareData(null);
    }
  }, [isOpen]);

  const updateStep = (index: number, status: LoadingStep['status']) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, status } : step)));
  };

  const handleGenerate = async () => {
    setState('loading');
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' })));
    setErrorMessage(null);

    try {
      // Steps 1-3: Generate CV
      updateStep(0, 'active');
      await new Promise((r) => setTimeout(r, 500));
      updateStep(0, 'done');

      updateStep(1, 'active');
      await new Promise((r) => setTimeout(r, 500));
      updateStep(1, 'done');

      updateStep(2, 'active');

      const generateResult = await generateCV({
        job_title: job.title,
        job_company: job.company_name,
        job_location: job.location || '',
        job_description: job.description,
      }).unwrap();

      setCvData(generateResult);
      updateStep(2, 'done');

      // Steps 4-5: Compare CV
      updateStep(3, 'active');

      const compareResult = await compareCV({
        cv_text: generateResult.cv_markdown,
        job_title: job.title,
        job_company: job.company_name,
        job_description: job.description,
      }).unwrap();

      setCompareData(compareResult);
      updateStep(3, 'done');

      updateStep(4, 'active');
      await new Promise((r) => setTimeout(r, 300));
      updateStep(4, 'done');

      setState('success');
    } catch (error) {
      console.error('CV generation failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate CV');
      setState('error');
    }
  };

  const handleDownloadPDF = async () => {
    if (!cvData) return;

    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    const plainText = cvData.cv_markdown
      .replace(/^### /gm, '')
      .replace(/^## /gm, '')
      .replace(/^# /gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/- /g, '• ');

    const lines = doc.splitTextToSize(plainText, maxWidth);

    let y = margin;
    const lineHeight = 7;

    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    doc.save(`CV_${job.company_name}_${job.title.replace(/\s+/g, '_')}.pdf`);
  };

  if (!isOpen) return null;

  const isProfileTooShort = profileWordCount < MIN_PROFILE_WORDS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          'bg-card relative z-10 max-h-[90vh] overflow-hidden rounded-2xl shadow-xl',
          state === 'success' ? 'w-full max-w-4xl' : 'w-full max-w-md'
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="text-secondary hover:text-primary absolute top-4 right-4 z-10 p-1"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* State-based content */}
        {isProfileTooShort && state === 'initial' && (
          <CVModalProfileRequired wordCount={profileWordCount} />
        )}

        {!isProfileTooShort && state === 'initial' && (
          <CVModalInitial job={job} onGenerate={handleGenerate} />
        )}

        {state === 'loading' && <CVModalLoading steps={steps} />}

        {state === 'success' && cvData && compareData && (
          <CVModalSuccess
            job={job}
            cvData={cvData}
            compareData={compareData}
            onRegenerate={handleGenerate}
            onDownload={handleDownloadPDF}
          />
        )}

        {state === 'error' && <CVModalError message={errorMessage} onRetry={handleGenerate} />}
      </div>
    </div>
  );
}
