import { MIN_PROFILE_WORDS } from '@/constants';

interface Props {
  wordCount: number;
}

export function CVModalProfileRequired({ wordCount }: Props) {
  return (
    <div className="p-8 text-center">
      <div className="bg-warning-bg text-warning-text mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-primary text-xl font-semibold">Profile Required</h2>
      <p className="text-secondary mt-2">
        To generate a tailored CV, we need more information about your experience.
      </p>
      <p className="text-secondary mt-4">
        Your profile: <span className="text-primary font-medium">{wordCount} words</span> (minimum:{' '}
        {MIN_PROFILE_WORDS})
      </p>
      <a
        href="/profile"
        className="bg-accent hover:bg-accent-hover mt-6 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
      >
        Complete Profile
      </a>
    </div>
  );
}
