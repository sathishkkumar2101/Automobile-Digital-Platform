package com.bmwtechworks.messaging.service;

import com.bmwtechworks.messaging.client.CustomerServiceClient;
import com.bmwtechworks.messaging.client.DealerServiceClient;
import com.bmwtechworks.messaging.client.UserRoleServiceClient;
import com.bmwtechworks.messaging.dto.*;
import com.bmwtechworks.messaging.exception.ForbiddenException;
import com.bmwtechworks.messaging.exception.NotFoundException;
import com.bmwtechworks.messaging.model.Conversation;
import com.bmwtechworks.messaging.model.ConversationContextType;
import com.bmwtechworks.messaging.repository.ConversationRepository;
import com.bmwtechworks.messaging.repository.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageService messageService;
    private final UserRoleServiceClient userRoleServiceClient;
    private final DealerServiceClient dealerServiceClient;
    private final CustomerServiceClient customerServiceClient;

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            MessageService messageService,
            UserRoleServiceClient userRoleServiceClient,
            DealerServiceClient dealerServiceClient,
            CustomerServiceClient customerServiceClient
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.messageService = messageService;
        this.userRoleServiceClient = userRoleServiceClient;
        this.dealerServiceClient = dealerServiceClient;
        this.customerServiceClient = customerServiceClient;
    }

    @Transactional
    public ConversationResponse create(UUID currentUser, String currentRole, CreateConversationRequest request) {
        Set<UUID> participants = new HashSet<>();
        participants.add(currentUser);

        if (request.dealerId() != null) {
            DealerProfile dealer = dealerServiceClient.getDealer(request.dealerId());
            if (dealer != null && dealer.userId() != null) {
                participants.add(dealer.userId());
            }
        }

        if (request.customerId() != null) {
            CustomerProfile customer = customerServiceClient.getCustomer(request.customerId());
            if (customer != null && customer.userId() != null) {
                participants.add(customer.userId());
            }
        }

        if (request.recipientUserId() != null
                && !request.recipientUserId().equals(currentUser)) {
            UserProfile recipient = userRoleServiceClient.getUserProfile(request.recipientUserId());
            if (recipient != null && recipient.id() != null) {
                participants.add(recipient.id());
            }
        }

        // Platform ADMIN is auto-participant of every conversation so the Admin
        // inbox can supervise all chats. The ADMIN user id is resolved
        // dynamically - never hardcoded.
        if (!"ADMIN".equals(currentRole)) {
            try {
                UserProfile administrator = userRoleServiceClient.getAdministratorUser();
                if (administrator != null && administrator.id() != null) {
                    participants.add(administrator.id());
                }
            } catch (Exception ignored) {
                // If the administrator lookup fails the conversation still works
                // without the admin participant.
            }
        }

        Conversation conversation = Conversation.builder()
                .participantIds(participants)
                .contextType(request.contextType() == null
                        ? ConversationContextType.GENERAL
                        : request.contextType())
                .contextId(request.contextId())
                .title(request.title())
                .build();

        Conversation saved = conversationRepository.save(conversation);
        return toResponse(saved, currentUser);
    }

    public ConversationListResponse list(
            UUID currentUser,
            String currentRole,
            String contextType,
            UUID dealerId,
            UUID customerId
    ) {
        List<Conversation> conversations =
                conversationRepository.findAllByParticipantId(currentUser);

        if (contextType != null && !contextType.isBlank()) {
            ConversationContextType type = parseContextType(contextType);
            if (type != null) {
                conversations = conversations.stream()
                        .filter(c -> type.equals(c.getContextType()))
                        .collect(Collectors.toList());
            }
        }

        // Dealer/customer filters are ADMIN-only. They are resolved to the target
        // user id and then matched against conversation participants.
        if (dealerId != null && "ADMIN".equals(currentRole)) {
            DealerProfile dealer = dealerServiceClient.getDealer(dealerId);
            UUID target = dealer != null ? dealer.userId() : null;
            if (target != null) {
                conversations = conversations.stream()
                        .filter(c -> c.getParticipantIds().contains(target))
                        .collect(Collectors.toList());
            }
        }

        if (customerId != null && "ADMIN".equals(currentRole)) {
            CustomerProfile customer = customerServiceClient.getCustomer(customerId);
            UUID target = customer != null ? customer.userId() : null;
            if (target != null) {
                conversations = conversations.stream()
                        .filter(c -> c.getParticipantIds().contains(target))
                        .collect(Collectors.toList());
            }
        }

        List<ConversationResponse> items = conversations.stream()
                .map(c -> toResponse(c, currentUser))
                .sorted(Comparator
                        .comparing(ConversationResponse::updatedAt,
                                Comparator.nullsFirst(Comparator.naturalOrder()))
                        .reversed())
                .collect(Collectors.toList());

        long totalUnread = conversations.stream()
                .mapToLong(c -> messageService.unreadCount(c.getId(), currentUser))
                .sum();

        return new ConversationListResponse(items, totalUnread);
    }

    public ConversationResponse getById(UUID conversationId, UUID currentUser) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));
        if (!conversation.getParticipantIds().contains(currentUser)) {
            throw new ForbiddenException("You are not a participant of this conversation");
        }
        return toResponse(conversation, currentUser);
    }

    public long markRead(UUID conversationId, UUID currentUser) {
        return messageService.markConversationRead(conversationId, currentUser);
    }

    /**
     * Permanently removes a conversation and everything in it. ADMIN only.
     *
     * <p>Deletion is restricted to ADMIN rather than offered to participants
     * because a thread is a shared record: both sides keep the same copy, so
     * letting either of them erase it would destroy the other side's history
     * too. ADMIN can already read every thread through the support inbox, so
     * restricting the write does not put the data beyond reach.
     *
     * <p>The role is checked before the row is looked up, so a non-ADMIN cannot
     * use the difference between 403 and 404 to discover which conversation ids
     * exist.
     */
    @Transactional
    public void delete(UUID conversationId, UUID currentUser, String currentRole) {
        if (!"ADMIN".equals(currentRole)) {
            throw new ForbiddenException("Only an administrator can delete a conversation");
        }
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));

        // Messages first: the thread row is their parent in every practical
        // sense even though there is no foreign key, and leaving them behind
        // would strand rows nothing can reach.
        messageRepository.deleteAll(messageRepository.findAllByConversationId(conversationId));
        conversationRepository.delete(conversation);
    }

    private ConversationResponse toResponse(Conversation conversation, UUID currentUser) {
        List<ParticipantInfo> participants = conversation.getParticipantIds().stream()
                .map(this::resolveParticipant)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        MessageResponse lastMessage = null;
        try {
            lastMessage = messageService.getLastMessage(conversation.getId());
        } catch (Exception ignored) {
        }

        long unreadCount = messageService.unreadCount(conversation.getId(), currentUser);

        return new ConversationResponse(
                conversation.getId(),
                conversation.getContextType(),
                conversation.getContextId(),
                conversation.getTitle(),
                conversation.getParticipantIds().stream().sorted().toList(),
                participants,
                lastMessage,
                unreadCount,
                conversation.getCreatedAt(),
                conversation.getUpdatedAt()
        );
    }

    private ConversationContextType parseContextType(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return ConversationContextType.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private ParticipantInfo resolveParticipant(UUID userId) {
        try {
            UserProfile profile = userRoleServiceClient.getUserProfile(userId);
            if (profile != null) {
                return new ParticipantInfo(
                        profile.id(),
                        profile.name(),
                        profile.email(),
                        profile.roleName()
                );
            }
        } catch (Exception ignored) {
        }
        return new ParticipantInfo(userId, "Unknown", "", "");
    }
}