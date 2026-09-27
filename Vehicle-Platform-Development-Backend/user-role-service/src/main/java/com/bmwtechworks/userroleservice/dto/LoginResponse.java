package com.bmwtechworks.userroleservice.dto;

public record LoginResponse(
        String message,
        String token
) {}