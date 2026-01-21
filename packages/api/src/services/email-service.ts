import path from "node:path";
import dotenv from "dotenv";

import { fileURLToPath } from "node:url";
import { Resend} from "resend";
import {RESET_PASSWORD_EMAIL, VERIFICATION_EMAIL} from "../global/index.js";

// Load .env from project root (two levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "Applyless <noreply@applyless.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export class EmailService {
    /**
     * Send email verification link
     */
    async sendVerificationEmail(email: string, token: string): Promise<void> {
        const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: "Verify your ApplyLess account",
                html: VERIFICATION_EMAIL(verifyUrl),
            });
            console.log(`✅ Verification email sent to ${email}`);
        } catch (error: any) {
            console.error(`❌ Failed to send verification email:`, error.message);
            throw new Error("Failed to send verification email");
        }
    }

    /**
     * Send password reset link
     */
    async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: "Reset your ApplyLess password",
                html: RESET_PASSWORD_EMAIL(resetUrl),
            });
            console.log(`✅ Password reset email sent to ${email}`);
        } catch (error: any) {
            console.error(`❌ Failed to send password reset email:`, error.message);
            throw new Error("Failed to send password reset email");
        }
    }
}

// Singletone instanse
let emailService: EmailService | null = null;

export const getEmailService = (): EmailService => {
    if (!emailService) {
        emailService = new EmailService();
    }
    return emailService;
}
