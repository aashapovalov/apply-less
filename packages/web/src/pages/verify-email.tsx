import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui';
import { useResendVerificationMutation } from '@/services/auth.ts';

export function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || '';
  const [resendVerification, { isLoading, isSuccess }] = useResendVerificationMutation();

  const handleResend = () => {
    if (email) {
      resendVerification({ email });
    }
  };

  return (
    <div className="bg-card rounded-xl p-8 text-center shadow-sm">
      <span className="text-5xl">✉️</span>
      <h1 className="text-primary mt-4 text-2xl font-semibold">Check Your Email</h1>
      <p className="text-secondary mt-4">
        We sent a verification link to:
        <br />
        <span className="text-primary font-medium">{email || 'your email'}</span>
      </p>
      <p className="text-secondary mt-2 text-sm">Click the link to activate your account.</p>

      <div className="mt-8">
        <p className="text-muted text-sm">Didn't receive it?</p>
        <Button
          variant="secondary"
          onClick={handleResend}
          isLoading={isLoading}
          disabled={isSuccess}
          className="mt-2 w-auto px-6"
        >
          {isSuccess ? 'Email Sent!' : 'Resend Email'}
        </Button>
      </div>

      <Link to="/login" className="text-accent mt-6 inline-block hover:underline">
        Back to Login
      </Link>
    </div>
  );
}
