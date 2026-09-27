package com.bmwtechworks.userroleservice.exception;

/** Thrown when a requested account or role does not exist. Renders as 404. */
public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String message) {
        super(message);
    }
}
