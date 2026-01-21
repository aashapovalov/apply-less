import bcrypt from "bcrypt";

import {PasswordValidationResult} from "../types/index.js";

// Min 8 chars, 1 lowercase, 1 uppercase, 1 digit, 1 special character

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'\/`~]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SALT_ROUNDS = 12;

export const validatePassword = (password: string): PasswordValidationResult => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least 1 uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least 1 lowercase letter");
    }

    if (!/\d/.test(password)) {
        errors.push("Password must contain at least 1 digit");
    }

    if (!/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'\/`~]/.test(password)) {
        errors.push("Password must contain at least 1 special character");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

export const validateEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email);
}
