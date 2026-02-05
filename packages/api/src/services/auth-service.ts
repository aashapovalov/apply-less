import pg from "pg";
import { TokenService } from "./token-service.js";
import { UserService } from "./user-service.js";
import { RateLimitService } from "./rate-limit-service.js";
import {
  validateEmail,
  validatePassword,
} from "../utils/password-validation.js";
import { getEmailService } from "./email-service.js";
import { AuthResult, TokenPair, User } from "../types/index.js";

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

export class AuthService {
  private tokenService: TokenService;
  private userService: UserService;
  private rateLimitService: RateLimitService;

  constructor(private db: PoolType) {
    this.tokenService = new TokenService(db);
    this.userService = new UserService(db);
    this.rateLimitService = new RateLimitService(db);
  }

  /**
   * Register a new user account.
   * Validates email/password, applies rate limiting by IP, prevents duplicate registrations,
   * creates the user, generates an email verification token, and sends a verification email.
   *
   * @param email - User email address.
   * @param password - Plain text password (validated and hashed in user layer).
   * @param ip - Client IP used for rate limiting.
   * @returns A message instructing the user to check their inbox for verification.
   * @throws AuthError 400 if email/password format is invalid.
   * @throws AuthError 409 if email is already registered.
   * @throws AuthError 429 if rate limit is exceeded.
   */
  async register(
    email: string,
    password: string,
    ip: string,
  ): Promise<{ message: string }> {
    await this.checkRateLimit("register", ip);

    this.validateCredentials(email, password);

    if (await this.userService.emailExists(email)) {
      throw new AuthError("Email already registered", 409);
    }

    const userID = await this.userService.createUser(email, password);
    const token = await this.tokenService.createVerificationToken(userID);

    await getEmailService().sendVerificationEmail(email, token);

    return { message: "Verification email sent. Please check your inbox." };
  }

  /**
   * Authenticate an existing user and issue an access/refresh token pair.
   * Applies rate limiting by IP, verifies credentials, checks email verification status,
   * records the login attempt, and returns user + token pair on success.
   *
   * @param email - User email address.
   * @param password - Plain text password to verify.
   * @param ip - Client IP used for rate limiting.
   * @returns AuthResult containing the authenticated user and a newly generated token pair.
   * @throws AuthError 401 if credentials are invalid.
   * @throws AuthError 403 if the email is not verified.
   * @throws AuthError 429 if rate limit is exceeded.
   */
  async login(
    email: string,
    password: string,
    ip: string,
  ): Promise<AuthResult> {
    await this.checkRateLimit("login", ip);

    const user = await this.userService.verifyCredentials(email, password);

    if (!user) {
      await this.rateLimitService.recordAttempt("login", ip);
      throw new AuthError("Invalid email or password", 401);
    }

    if (!user.email_verified) {
      throw new AuthError("Please verify your email first", 403);
    }

    await this.rateLimitService.recordAttempt("login", ip);
    const tokens = await this.tokenService.generateTokenPair(user.id);

    return { user, tokens };
  }

  /**
   * Validate a refresh token and rotate it.
   * If the refresh token is valid, revokes the old refresh token record and issues a new token pair.
   *
   * @param refreshToken - Refresh token string.
   * @returns A new access/refresh token pair.
   * @throws AuthError 401 if refresh token is invalid or expired.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenData =
      await this.tokenService.validateRefreshToken(refreshToken);

    if (!tokenData) {
      throw new AuthError("Invalid or expired refresh token", 401);
    }

    // Rotate: revoke old, issue new
    await this.tokenService.revokeRefreshTokenById(tokenData.id);
    return this.tokenService.generateTokenPair(tokenData.userId);
  }

  /**
   * Log the user out by revoking the provided refresh token.
   *
   * @param refreshToken - Refresh token to revoke.
   * @returns void
   */
  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  /**
   * Check if user with verification token exists and change email verification flag.
   * Consumes the verification token (one-time use). If valid, marks user's email as verified.
   *
   * @param token - Email verification token.
   * @returns A success message indicating the user can log in.
   * @throws AuthError 400 if verification token is invalid or expired.
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const userID = await this.tokenService.consumeVerificationToken(token);

    if (!userID) {
      throw new AuthError("Invalid or expired verification token", 400);
    }

    await this.userService.verifyEmail(userID);
    return { message: "Email verified successfully. You can now log in." };
  }

  /**
   * Initiate a password reset flow.
   * Uses a generic response to avoid leaking whether the email exists.
   * Applies rate limiting by email, invalidates previous reset tokens for the user (if found),
   * creates a new reset token, and sends a password reset email.
   *
   * @param email - Email address to reset password for.
   * @param id - (Currently unused) identifier; consider replacing with ip or removing.
   * @returns A generic message indicating that a reset link may have been sent.
   */
  async forgotPassword(
    email: string,
    id: string,
  ): Promise<{ message: string }> {
    const genericResponse = {
      message: "If the email exists, a reset link has been sent.",
    };

    // Rate limit by email
    const rateLimit = await this.rateLimitService.checkLimit(
      "forgot_password",
      email.toLowerCase(),
    );
    if (!rateLimit.allowed) return genericResponse;

    await this.rateLimitService.recordAttempt(
      "forgot_password",
      email.toLowerCase(),
    );

    const user = await this.userService.findByEmail(email);
    if (!user) return genericResponse;

    await this.tokenService.invalidateResetTokens(user.id);
    const token = await this.tokenService.createResetToken(user.id);

    await getEmailService().sendPasswordResetEmail(user.email, token);
    return genericResponse;
  }

  /**
   * Complete a password reset using a reset token.
   * Validates the new password, consumes the reset token (one-time use), updates the password,
   * and revokes all user tokens to force re-authentication across sessions.
   *
   * @param token - Password reset token.
   * @param newPassword - New plain text password (validated before saving).
   * @returns A message confirming successful password reset.
   * @throws AuthError 400 if password validation fails.
   * @throws AuthError 400 if reset token is invalid or expired.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const validation = validatePassword(newPassword);

    if (!validation.valid) {
      throw new AuthError(validation.errors.join(". "), 400);
    }

    const userId = await this.tokenService.consumeResetToken(token);

    if (!userId) {
      throw new AuthError("Invalid or expired reset token", 400);
    }

    await this.userService.updatePassword(userId, newPassword);
    await this.tokenService.revokeAllUserTokens(userId);

    return {
      message:
        "Password reset successfully. Please log in with your new password.",
    };
  }

  /**
   * Resend an email verification link.
   * Uses a generic response to avoid leaking whether the email exists.
   * Applies rate limiting by IP, checks if the user exists, and if the user is unverified,
   * generates a new verification token and sends a verification email.
   *
   * @param email - Email address to resend verification for.
   * @param ip - Client IP used for rate limiting.
   * @returns A generic message indicating a verification link may have been sent,
   *          or a message indicating the email is already verified.
   * @throws AuthError 429 if rate limit is exceeded.
   */
  async resendVerification(
    email: string,
    ip: string,
  ): Promise<{ message: string }> {
    const genericResponse = {
      message:
        "If the email exists and is unverified, a new verification link has been sent.",
    };

    await this.checkRateLimit("register", ip);

    const user = await this.userService.findByEmail(email.toLowerCase());
    if (!user) return genericResponse;

    if (user.email_verified) {
      return { message: "Email is already verified. You can log in." };
    }

    await this.tokenService.invalidateResetTokens(user.id);
    const token = await this.tokenService.createVerificationToken(user.id);

    await getEmailService().sendVerificationEmail(email, token);

    return genericResponse;
  }

  /**
   * Fetch the currently authenticated user by id.
   *
   * @param userId - Authenticated user's id.
   * @returns The user object.
   * @throws AuthError 404 if user does not exist.
   */
  async getCurrentUser(userId: number): Promise<User> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new AuthError("User not found", 404);
    }

    return user;
  }

  // ---HELPERS---

  /**
   * Validate email format and password strength.
   * Throws AuthError with validation details if any checks fail.
   *
   * @param email - Email address to validate.
   * @param password - Password to validate.
   * @throws AuthError 400 if email format is invalid or password does not meet requirements.
   */
  private validateCredentials(email: string, password: string): void {
    if (!validateEmail(email)) {
      throw new AuthError("Invalid email format", 400);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new AuthError(passwordValidation.errors.join(". "), 400);
    }
  }

  /**
   * Enforce rate limiting for a given action and identifier.
   * If allowed, records the attempt; otherwise throws with retry-after information.
   *
   * @param action - Action name (e.g., "login", "register").
   * @param identifier - Rate-limit key (e.g., IP, email).
   * @returns void
   * @throws AuthError 429 if the rate limit is exceeded.
   */
  private async checkRateLimit(
    action: string,
    identifier: string,
  ): Promise<void> {
    const rateLimit = await this.rateLimitService.checkLimit(
      action,
      identifier,
    );

    if (!rateLimit.allowed) {
      throw new AuthError(
        `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        429,
      );
    }

    await this.rateLimitService.recordAttempt(action, identifier);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
