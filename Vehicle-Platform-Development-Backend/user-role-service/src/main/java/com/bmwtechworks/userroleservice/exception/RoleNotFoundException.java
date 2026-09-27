package com.bmwtechworks.userroleservice.exception;

/** Thrown when a requested role does not exist. Renders as 404. */
public class RoleNotFoundException extends RuntimeException {

    public RoleNotFoundException(String message) {
        super(message);
    }
}
