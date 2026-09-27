package com.bmwtechworks.userroleservice.exception;

/** Thrown when a username or email is already taken. Renders as 409. */
public class UserAlreadyExistsException extends RuntimeException {

    public UserAlreadyExistsException(String message) {
        super(message);
    }
}
