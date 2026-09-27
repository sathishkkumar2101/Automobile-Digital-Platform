package com.bmwtechworks.messaging.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
        name = "messages",
        indexes = {
                @Index(name = "idx_message_conversation", columnList = "conversationId"),
                @Index(name = "idx_message_sender", columnList = "senderId"),
                @Index(name = "idx_message_receiver", columnList = "receiverId")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID conversationId;

    private UUID senderId;

    @Enumerated(EnumType.STRING)
    private MessageRole senderRole;

    /**
     * Nullable — null means "group message" addressed to every other participant
     * of the conversation. A non-null value targets a single participant.
     */
    private UUID receiverId;

    @Column(length = 3000, nullable = false)
    private String content;

    @CreationTimestamp
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MessageStatus status = MessageStatus.SENT;

    /**
     * Per-participant read tracking. A participant id in this set has read the
     * message. The aggregated {@code status} reflects the latest global state.
     */
    @ElementCollection
    @CollectionTable(
            name = "message_reads",
            joinColumns = @JoinColumn(name = "message_id")
    )
    @Column(name = "reader_user_id")
    @Builder.Default
    private Set<UUID> readByUserIds = new HashSet<>();
}