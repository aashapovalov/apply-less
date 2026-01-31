interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const rules = [
    { label: '8+ characters', valid: password.length >= 8 },
    { label: '1 uppercase letter', valid: /[A-Z]/.test(password) },
    { label: '1 lowercase letter', valid: /[a-z]/.test(password) },
    { label: '1 number', valid: /\d/.test(password) },
    { label: '1 special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  return (
    <div className="mt-2 space-y-1 text-sm">
      {rules.map((rule) => (
        <p key={rule.label} className={rule.valid ? 'text-success-text' : 'text-muted'}>
          {rule.valid ? '✓' : '○'} {rule.label}
        </p>
      ))}
    </div>
  );
}
