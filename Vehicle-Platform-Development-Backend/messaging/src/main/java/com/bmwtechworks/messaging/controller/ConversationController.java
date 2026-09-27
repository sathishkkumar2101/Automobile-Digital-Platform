package com.bmwtechworks.messaging.controller;

import com.bmwtechworks.messaging.dto.ConversationListResponse;
import com.bmwtechworks.messaging.dto.ConversationResponse;
import com.bmwtechworks.messaging.dto.CreateConversationRequest;
import com.bmwtechworks.messaging.dto.MessageResponse;
import com.bmwtechworks.messaging.service.ConversationService;
import com.bmwtechworks.messaging.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages/conversations")
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService messageService;

    public ConversationController(
            ConversationService conversationService,
            MessageService messageService
    ) {
        this.conversationService = conversationService;
        this.messageService = messageService;
    }

    /**
     * GET /api/messages/conversations
     *
     * Lists all threads the authenticated user participates in, with the latest
     * message and unread count. The identity is taken from the gateway-injected
     * X-User-Id / X-User-Role headers - never from client-supplied fields.
     *
     * ADMIN-only optional filters: contextType, dealerId, customerId.
     */
    @GetMapping
    public ConversationListResponse list(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader("X-User-Role") String userRole,
            @RequestParam(required = false) String contextType,
            @RequestParam(required = false) UUID dealerId,
            @RequestParam(required = false) UUID customerId
    ) {
        return conversationService.list(userId, userRole, contextType, dealerId, customerId);
    }

    /**
     * POST /api/messages/conversations
     *
     * Creates a conversation. The authenticated user is always a participant.
     * Optionally targets a dealer (dealerId), a customer (customerId) or a
     * specific user (recipientUserId). The platform ADMIN is auto-added unless
     * the initiator is an ADMIN.
     */
    @PostMapping
    public ResponseEntity<ConversationResponse> create(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader("X-User-Role") String userRole,
            @Valid @RequestBody CreateConversationRequest request
    ) {
        ConversationResponse response = conversationService.create(userId, userRole, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/messages/conversations/{id}
     */
    @GetMapping("/{id}")
    public ConversationResponse getById(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        return conversationService.getById(id, userId);
    }

    /**
     * GET /api/messages/conversations/{id}/messages?page=0&size=30
     *
     * Paginated message history (newest first).
     */
    @GetMapping("/{id}/messages")
    public Page<MessageResponse> history(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        return messageService.history(id, userId, page, size);
    }

    /**
     * PUT /api/messages/conversations/{id}/read
     *
     * Marks every addressed-to-me message in the thread as READ and returns the
     * remaining unread count for the thread.
     */
    @PutMapping("/{id}/read")
    public Map<String, Object> markThreadRead(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId
    ) {
        long unread = conversationService.markRead(id, userId);
        return Map.of("conversationId", id.toString(), "unreadCount", unread);
    }

    /**
     * DELETE /api/messages/conversations/{id}
     *
     * Permanently removes a thread, its messages and its read receipts.
     * ADMIN only — see {@link ConversationService#delete}. Returns 204 with an
     * empty body, and 404 for an id that does not exist so a caller can tell a
     * completed delete from a mistyped id.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader("X-User-Role") String userRole
    ) {
        conversationService.delete(id, userId, userRole);
        return ResponseEntity.noContent().build();
    }
}
