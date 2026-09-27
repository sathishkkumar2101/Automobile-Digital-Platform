package com.bmwtechworks.messaging.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.util.List;
import java.util.UUID;

/**
 * Enforces authentication on the STOMP CONNECT frame. The principal itself is
 * established at the WebSocket handshake by {@link JwtHandshakeHandler}
 * (token taken from the {@code ?token=} query parameter), so Spring attaches it
 * to every subsequent frame of the session automatically; this interceptor only
 * rejects connections that fail to present a valid token on CONNECT.
 */
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;

    public StompAuthChannelInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (command == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(command)) {
            String authorization = firstHeader(accessor, "Authorization");
            if (authorization == null) {
                authorization = firstHeader(accessor, "authorization");
            }

            if (authorization == null || !authorization.startsWith("Bearer ")) {
                throw new MessageDeliveryException(message, "Missing or invalid Authorization header");
            }

            String token = authorization.substring("Bearer ".length());
            try {
                Jwt jwt = jwtDecoder.decode(token);
                accessor.setUser(new StompPrincipal(UUID.fromString(jwt.getSubject()).toString()));
            } catch (Exception e) {
                throw new MessageDeliveryException(
                        message,
                        "Invalid JWT token: " + e.getMessage()
                );
            }
        }

        return message;
    }

    private String firstHeader(StompHeaderAccessor accessor, String name) {
        List<String> values = accessor.getNativeHeader(name);
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.get(0);
    }
}