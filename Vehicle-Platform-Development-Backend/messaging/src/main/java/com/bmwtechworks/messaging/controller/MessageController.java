package com.bmwtechworks.messaging.controller;

import com.bmwtechworks.messaging.dto.MessageResponse;
import com.bmwtechworks.messaging.dto.SendMessageRequest;
import com.bmwtechworks.messaging.model.MessageRole;
import com.bmwtechworks.messaging.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    /**
     * POST /api/messages/send
     *
     * Sends a new message in an existing conversation. The sender identity is
     * derived from the gateway-injected X-User-Id / X-User-Role headers and the
     * sender must be a participant. The message is persisted and pushed to all
     * participants over their STOMP user queues.
     */
    @PostMapping("/send")
    public MessageResponse send(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader("X-User-Role") String userRole,
            @Valid @RequestBody SendMessageRequest request
    ) {
        MessageRole role = MessageRole.valueOf(userRole);
        return messageService.send(userId, role, request.conversationId(), request.content());
    }

    /**
     * PUT /api/messages/{messageId}/read
     *
     * Marks a single message as READ. The caller must be a participant and must
     * not be the sender of the message.
     */
    @PutMapping("/{messageId}/read")
    public Map<String, Object> markMessageRead(
            @PathVariable UUID messageId,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        MessageResponse response = messageService.markMessageRead(messageId, userId);
        return Map.of(
                "messageId", response.id().toString(),
                "status", response.status().name()
        );
    }
}