package com.coursemaker.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Confirmation for account deletion. Requires typing the account's own nickname rather than its
 * password, since a Google-only account has no password to re-enter.
 */
public record DeleteAccountRequest(@NotBlank @Size(max = 30) String confirmNickname) {
}
