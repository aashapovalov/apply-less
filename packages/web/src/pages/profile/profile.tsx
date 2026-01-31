import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FileDropzone } from '@/components/profile';
import { Alert, Button } from '@/components/ui';
import {
  useGetProfileQuery,
  useParseFileMutation,
  useSaveProfileMutation,
} from '@/services/profile.ts';
import { getErrorMessage } from '@/utils';

export function Profile() {
  const navigate = useNavigate();
  const [profileText, setProfileText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: profileData, isLoading: isLoadingProfile } = useGetProfileQuery();
  const [saveProfile, { isLoading: isSaving }] = useSaveProfileMutation();
  const [parseFile, { isLoading: isParsing }] = useParseFileMutation();

  // Load existing profile
  useEffect(() => {
    if (profileData?.profile?.profileText) {
      setProfileText(profileData.profile.profileText);
    }
  }, [profileData]);

  const handleFileSelect = async (file: File) => {
    try {
      setError(null);
      setSuccess(null);
      const formData = new FormData();
      formData.append('file', file);

      const result = await parseFile(formData).unwrap();
      setProfileText(result.text);
      setSuccess(`Imported from ${result.filename}${result.pages ? ` (${result.pages})` : ''}`);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!profileText.trim()) {
        setError('Please enter your profile text');
        return;
      }

      await saveProfile({ profileText }).unwrap();
      setSuccess('Profile saved successfully!');
    } catch (error) {
      setError(getErrorMessage(error));
    }
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-primary text-3xl font-semibold">Your Profile</h1>
        <p className="text-secondary mt-2">
          Tell us about your experience and skills to get personalized job matches
        </p>
      </div>

      {/* Why we need profile */}
      <div className="bg-accent/5 border-accent/20 mb-8 rounded-xl border p-6">
        <div className="flex items-start gap-3">
          <div className="bg-accent/10 rounded-full p-2">
            <svg
              className="text-accent h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-primary font-medium">Why we need your profile</h3>
            <ul className="text-secondary mt-2 space-y-1 text-sm">
              <li>
                • <strong>Match you with relevant jobs</strong> using AI-powered similarity search
              </li>
              <li>
                • <strong>Generate tailored CVs</strong> highlighting skills that match each
                position
              </li>
              <li>
                • <strong>Identify skill gaps</strong> and suggest improvements
              </li>
            </ul>
            <p className="text-secondary mt-3 text-sm">
              The more detail you provide, the better your matches will be!
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert className="mb-6">{error}</Alert>}
      {success && (
        <div className="bg-success-bg-dark border-success-border-dark text-success-text-dark mb-6 rounded-xl border p-4 text-sm">
          {success}
        </div>
      )}

      {/* File upload */}
      <div className="mb-6">
        <FileDropzone onFileSelect={handleFileSelect} isLoading={isParsing} />
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
          onChange={(e) => setProfileText(e.target.value)}
          placeholder="Paste your work experience, skills, education, achievements...

Example:
Senior Software Engineer with 5+ years of experience in web development.

Skills:
- JavaScript, TypeScript, React, Node.js
- PostgreSQL, MongoDB, Redis
- AWS, Docker, Kubernetes

Experience:
Tech Company (2020-Present)
- Led development of customer-facing dashboard
- Reduced page load time by 40%
..."
          className="bg-card border-border text-primary placeholder:text-secondary focus:border-accent min-h-[300px] w-full rounded-xl border p-4 text-sm outline-none"
        />
        <div className="text-secondary mt-2 flex justify-between text-xs">
          <span>
            {wordCount} words
            {wordCount < 200 && wordCount > 0 && (
              <span className="text-warning-text"> (minimum 200 for CV generation)</span>
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
  );
}
