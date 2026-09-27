package com.bmw.dealer.exception;

public class NoDealerFoundException extends RuntimeException {

    public NoDealerFoundException(String message) {
        super(message);
    }
}