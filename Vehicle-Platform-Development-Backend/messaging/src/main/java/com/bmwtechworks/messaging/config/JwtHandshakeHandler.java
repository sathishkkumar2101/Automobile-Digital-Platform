package com.bmwtechworks.messaging.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Map;
import java.util.UUID;

/**
 * Authenticates the WebSocket handshake itself using the JWT supplied via the
 * {@code token} query parameter (the browser WebSocket API cannot set HTTP
 * headers). Attaching the principal at the handshake is what makes Spring
 * carry it on every STOMP frame of the session, so {@code /user/...} user
 * destinations resolve correctly and {@link SimpUserRegistry} registrations
 * succeed (setting the user only on the STOMP CONNECT frame does not, because
 * the session id is not guaranteed to be available yet on the inbound channel).
 */
public class JwtHandshakeHandler extends DefaultHandshakeHandler {

    private final JwtDecoder jwtDecoder;

    public JwtHandshakeHandler(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        String token = queryParam(request, "token");
        if (token == null) {
            return null;
        }
        try {
            Jwt jwt = jwtDecoder.decode(token);
            return new StompPrincipal(UUID.fromString(jwt.getSubject()).toString());
        } catch (Exception e) {
            return null;
        }
    }

    private String queryParam(ServerHttpRequest request, String name) {
        String query = request.getURI().getQuery();
        if (query == null) {
            return null;
        }
        for (String pair : URLDecoder.decode(query, StandardCharsets.UTF_8).split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts.length == 2 && name.equals(parts[0])) {
                return parts[1];
            }
        }
        return null;
    }
}