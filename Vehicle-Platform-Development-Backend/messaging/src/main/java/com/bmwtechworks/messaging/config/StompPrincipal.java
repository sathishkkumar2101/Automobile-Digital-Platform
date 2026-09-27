package com.bmwtechworks.messaging.config;

import java.security.Principal;

public record StompPrincipal(String userId) implements Principal {

    @Override
    public String getName() {
        return userId;
    }
}