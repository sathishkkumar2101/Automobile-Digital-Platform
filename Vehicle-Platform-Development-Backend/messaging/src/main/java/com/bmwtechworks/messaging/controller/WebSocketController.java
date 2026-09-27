package com.bmwtechworks.messaging.controller;

import com.bmwtechworks.messaging.client.UserRoleServiceClient;
import com.bmwtechworks.messaging.dto.ReceiptRequest;
import com.bmwtechworks.messaging.dto.TypingRequest;
import com.bmwtechworks.messaging.model.Conversation;
import com.bmwtechworks.messaging.repository.ConversationRepository;
import com.bmwtechworks.messaging.service.MessageService;
import com.bmwtechworks.messaging.service.RealtimeService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

/**
 * STOMP application handlers (/app/...). Clients use these lightweight frames
 * for delivery/read receipts and typing indicators. The REST endpoints remain
 * the source of truth for persistence.
 */
@Controller
public class WebSocketController {

    private final MessageService messageService;
    private final RealtimeService realtimeService;
    private final ConversationRepository conversationRepository;
    private final UserRoleServiceClient userRoleServiceClient;

    public WebSocketController(
            MessageService messageService,
            RealtimeService realtimeService,
            ConversationRepository conversationRepository,
            UserRoleServiceClient userRoleServiceClient
    ) {
        this.messageService = messageService;
        this.realtimeService = realtimeService;
        this.conversationRepository = conversationRepository;
        this.userRoleServiceClient = userRoleServiceClient;
    }

    @MessageMapping("/msg/delivered")
    public void delivered(ReceiptRequest request, Principal principal) {
        UUID userId = uuidOf(principal);
        messageService.deliverConversationMessages(request.conversationId(), userId);
    }

    @MessageMapping("/msg/read")
    @SendToUser("/queue/read-ack")
    public long read(ReceiptRequest request, Principal principal) {
        UUID userId = uuidOf(principal);
        return messageService.markConversationRead(request.conversationId(), userId);
    }

    @MessageMapping("/typing")
    public void typing(TypingRequest request, Principal principal) {
        UUID userId = uuidOf(principal);
        Conversation conversation = conversationRepository.findById(request.conversationId())
                .orElse(null);
        if (conversation == null || !conversation.getParticipantIds().contains(userId)) {
            return;
        }
        String name = userId.toString();
        try {
            var profile = userRoleServiceClient.getUserProfile(userId);
            if (profile != null && profile.name() != null) {
                name = profile.name();
            }
        } catch (Exception ignored) {
        }
        realtimeService.publishTyping(
                conversation.getParticipantIds(),
                userId,
                name,
                conversation.getId(),
                request.typing()
        );
    }

    private UUID uuidOf(Principal principal) {
        return UUID.fromString(principal.getName());
    }
}