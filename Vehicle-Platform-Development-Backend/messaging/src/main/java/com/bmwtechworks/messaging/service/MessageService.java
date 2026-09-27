package com.bmwtechworks.messaging.service;

import com.bmwtechworks.messaging.dto.MessageResponse;
import com.bmwtechworks.messaging.exception.ForbiddenException;
import com.bmwtechworks.messaging.exception.NotFoundException;
import com.bmwtechworks.messaging.model.Conversation;
import com.bmwtechworks.messaging.model.Message;
import com.bmwtechworks.messaging.model.MessageRole;
import com.bmwtechworks.messaging.model.MessageStatus;
import com.bmwtechworks.messaging.repository.ConversationRepository;
import com.bmwtechworks.messaging.repository.MessageRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final RealtimeService realtimeService;

    public MessageService(
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            RealtimeService realtimeService
    ) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.realtimeService = realtimeService;
    }

    @Transactional
    public MessageResponse send(UUID senderId, MessageRole senderRole, UUID conversationId, String content) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));

        requireParticipant(conversation, senderId);

        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId(senderId)
                .senderRole(senderRole)
                .receiverId(null)
                .content(content.trim())
                .status(MessageStatus.SENT)
                .readByUserIds(Set.of())
                .build();

        Message saved = messageRepository.save(message);

        LocalDateTime now = LocalDateTime.now();
        conversation.setLastMessageAt(now);
        conversation.setUpdatedAt(now);
        conversationRepository.save(conversation);

        MessageResponse response = toResponse(saved);
        realtimeService.publishMessage(conversation.getParticipantIds(), response);

        return response;
    }

    public Page<MessageResponse> history(UUID conversationId, UUID currentUser, int page, int size) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));
        requireParticipant(conversation, currentUser);

        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "timestamp"));
        return messageRepository.findByConversationId(conversationId, pageable)
                .map(this::toResponse);
    }

    public MessageResponse getLastMessage(UUID conversationId) {
        List<Message> messages = messageRepository.findTop1ByConversationIdOrderByTimestampDesc(conversationId);
        if (messages == null || messages.isEmpty()) {
            return null;
        }
        return toResponse(messages.get(0));
    }

    public long unreadCount(UUID conversationId, UUID currentUser) {
        return messageRepository.countUnread(conversationId, currentUser);
    }

    @Transactional
    public long markConversationRead(UUID conversationId, UUID currentUser) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));
        requireParticipant(conversation, currentUser);

        List<Message> mine = messageRepository.findUnread(conversationId, currentUser);
        boolean changed = false;
        for (Message message : mine) {
            message.getReadByUserIds().add(currentUser);
            message.setStatus(MessageStatus.READ);
            changed = true;
        }
        if (changed) {
            messageRepository.saveAll(mine);
            realtimeService.publishRead(conversation.getParticipantIds(), currentUser, conversation.getId());
        }
        return messageRepository.countUnread(conversationId, currentUser);
    }

    @Transactional
    public MessageResponse markMessageRead(UUID messageId, UUID currentUser) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));

        Conversation conversation = conversationRepository.findById(message.getConversationId())
                .orElseThrow(() -> new NotFoundException("Conversation not found"));
        requireParticipant(conversation, currentUser);

        if (message.getSenderId().equals(currentUser)) {
            throw new ForbiddenException("You cannot mark your own message as read");
        }

        message.getReadByUserIds().add(currentUser);
        message.setStatus(MessageStatus.READ);
        Message saved = messageRepository.save(message);

        realtimeService.publishRead(conversation.getParticipantIds(), currentUser, conversation.getId());
        return toResponse(saved);
    }

    @Transactional
    public long deliverConversationMessages(UUID conversationId, UUID currentUser) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));
        requireParticipant(conversation, currentUser);

        List<Message> mine = messageRepository.findMine(conversationId, currentUser);
        List<Message> toUpdate = new ArrayList<>();
        for (Message message : mine) {
            if (message.getStatus() == MessageStatus.SENT) {
                message.setStatus(MessageStatus.DELIVERED);
                toUpdate.add(message);
            }
        }
        if (!toUpdate.isEmpty()) {
            messageRepository.saveAll(toUpdate);
        }
        return messageRepository.countUnread(conversationId, currentUser);
    }

    private void requireParticipant(Conversation conversation, UUID userId) {
        if (!conversation.getParticipantIds().contains(userId)) {
            throw new ForbiddenException("You are not a participant of this conversation");
        }
    }

    private MessageResponse toResponse(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getConversationId(),
                message.getSenderId(),
                message.getSenderRole(),
                message.getReceiverId(),
                message.getContent(),
                message.getTimestamp(),
                message.getStatus(),
                message.getReadByUserIds().stream().sorted().toList()
        );
    }
}