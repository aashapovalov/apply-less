import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, Button } from '@/components/ui';
import {
  useGetProfileQuery,
  useParseFileMutation,
  useSaveProfileMutation,
} from '@/services/profile.ts';
import { getErrorMessage } from '@/utils';

export function Profile() {
  const navigate = useNavigate();
  const [localText, setLocalText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDraggingOnPage, setIsDraggingOnPage] = useState(false);

  const { data: profileData, isLoading: isLoadingProfile } = useGetProfileQuery();
  const [saveProfile, { isLoading: isSaving }] = useSaveProfileMutation();
  const [parseFile, { isLoading: isParsing }] = useParseFileMutation();

  const profileText = localText ?? profileData?.profile?.profileText ?? '';

  const handleTextChange = (text: string) => {
    setLocalText(text);
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file type
      const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowed.includes(file.type)) {
        setError('Invalid file type. Please upload PDF, DOC, or DOCX.');
        return;
      }

      try {
        setError(null);
        setSuccess(null);
        const formData = new FormData();
        formData.append('file', file);

        const result = await parseFile(formData).unwrap();
        setLocalText(result.text);
        setSuccess(
          `Imported from ${result.filename}${result.pages ? ` (${result.pages} pages)` : ''}`
        );
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    [parseFile]
  );

  // Full page drag & drop
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingOnPage(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDraggingOnPage(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDraggingOnPage(false);

      const file = e.dataTransfer?.files[0];
      if (file) {
        handleFileSelect(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleFileSelect]);

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!profileText.trim()) {
        setError('Please enter your profile text');
        return;
      }

      await saveProfile({ profileText }).unwrap();
      setLocalText(null);
      setSuccess('Profile saved successfully!');

      // Redirect to jobs with relevance sort
      setTimeout(() => navigate('/jobs?sort=relevance'), 1000);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleBrowseClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelect(file);
    };
    input.click();
  };

  if (isLoadingProfile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  const wordCount = profileText.split(/\s+/).filter(Boolean).length;

  return (
    <>
      {/* Full page drop overlay */}
      {isDraggingOnPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border-accent rounded-2xl border-2 border-dashed p-12 text-center">
            <div className="bg-accent/10 mx-auto mb-4 w-fit rounded-full p-4">
              <svg
                className="text-accent h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-primary text-xl font-medium">Drop your file here</p>
            <p className="text-secondary mt-2">PDF, DOC, or DOCX</p>
          </div>
        </div>
      )}

      {/* Loading overlay for file parsing */}
      {isParsing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-12 text-center">
            <div className="border-accent mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
            <p className="text-primary mt-4 text-lg font-medium">Parsing file...</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-primary text-3xl font-semibold">Your Profile</h1>
          <p className="text-secondary mt-2 flex items-center gap-2">
            Tell us about your experience and skills to get personalized job matches
            {/* Tooltip trigger */}
            <span
              className="relative cursor-help"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <svg
                className="text-secondary hover:text-accent h-5 w-5 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {/* Tooltip */}
              {showTooltip && (
                <div className="absolute top-full left-1/2 z-10 mt-3 w-80 -translate-x-1/2 rounded-xl bg-gray-900 p-5 text-left text-sm shadow-lg">
                  <div className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-8 border-transparent border-b-gray-900" />
                  <p className="mb-4 font-medium text-white">Why we need your profile:</p>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Match you with relevant jobs using AI</li>
                    <li>• Generate tailored CVs for each position</li>
                    <li>• Identify skill gaps and improvements</li>
                  </ul>
                  <p className="mt-4 text-gray-400">More detail = better matches!</p>
                </div>
              )}
            </span>
          </p>
        </div>

        {/* Alerts */}
        {error && <Alert className="mb-6">{error}</Alert>}
        {success && (
          <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-600">
            {success}
          </div>
        )}

        {/* Dropzone - more visible */}
        <div
          onClick={handleBrowseClick}
          className="border-border bg-secondary/30 hover:border-accent hover:bg-accent/5 mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all"
        >
          <div className="bg-accent/10 mb-4 rounded-full p-3">
            <svg
              className="text-accent h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="text-primary font-medium">
            Drop your CV or LinkedIn PDF anywhere on this page
          </p>
          <p className="text-secondary mt-1 text-sm">or click here to browse</p>
          <p className="text-secondary mt-2 text-xs">Supports: PDF, DOC, DOCX</p>
        </div>

        {/* Divider */}
        <div className="mb-6 flex items-center gap-4">
          <div className="bg-border h-px flex-1" />
          <span className="text-secondary text-sm">or paste your profile</span>
          <div className="bg-border h-px flex-1" />
        </div>

        {/* Text area */}
        <div className="mb-6">
          <textarea
            value={profileText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder=""
            className="bg-card border-border text-primary placeholder:text-secondary/50 focus:border-accent min-h-[300px] w-full rounded-xl border p-4 text-sm outline-none"
          />
          <div className="text-secondary mt-2 flex justify-between text-xs">
            <span>
              {wordCount} words
              {wordCount > 0 && wordCount < 200 && (
                <span className="text-amber-500"> (minimum 200 for CV generation)</span>
              )}
            </span>
            <span>{profileText.length.toLocaleString()} / 50,000 characters</span>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Profile
          </Button>
        </div>
      </div>
    </>
  );
}
