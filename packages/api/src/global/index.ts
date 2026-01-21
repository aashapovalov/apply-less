export const VERIFICATION_EMAIL =(verifyUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to ApplyLess!</h1>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" 
           style="display: inline-block; 
                  background-color: #4F46E5; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 6px;
                  margin: 16px 0;">
            Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">
            Or copy this link: <br/>
            <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
            This link expires in 24 hours.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
            If you didn't create an ApplyLess account, you can ignore this email.
        </p>
    </div>`;

export const RESET_PASSWORD_EMAIL = (resetUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; 
                  background-color: #4F46E5; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 6px;
                  margin: 16px 0;">
            Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
            Or copy this link: <br/>
            <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
            This link expires in 1 hour.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
            If you didn't request a password reset, you can ignore this email.
            Your password will remain unchanged.
        </p>
    </div>`;