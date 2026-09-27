package com.bmwtechworks.userroleservice.exception;

/**
 * Thrown when the customer service could not be reached to remove a deleted
 * account's profile. Renders as 503.
 *
 * <p>Distinct from a failed lookup: the profile may well be there, the point is
 * that nobody was able to go and check. Callers must treat this as "not done"
 * rather than as "nothing to remove", because the account is deliberately still
 * present when this is thrown.
 */
public class CustomerProfileCleanupException extends RuntimeException {

    public CustomerProfileCleanupException(String message, Throwable cause) {
        super(message, cause);
    }
}
