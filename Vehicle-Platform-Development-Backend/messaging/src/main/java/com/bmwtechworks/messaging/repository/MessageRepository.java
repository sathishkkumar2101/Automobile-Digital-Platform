package com.bmwtechworks.messaging.repository;

import com.bmwtechworks.messaging.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    Page<Message> findByConversationId(UUID conversationId, Pageable pageable);

    /**
     * Every message in a thread, unpaged.
     *
     * <p>Used to delete a conversation's messages as entities rather than through
     * a bulk {@code DELETE} statement. A JPQL bulk delete does not run the
     * collection-table cleanup for {@link Message#readByUserIds}, so the
     * {@code message_reads} rows would be left behind pointing at messages that
     * no longer exist.
     */
    List<Message> findAllByConversationId(UUID conversationId);

    List<Message> findTop1ByConversationIdOrderByTimestampDesc(UUID conversationId);

    /**
     * Messages addressed to {@code me} in a conversation that I have not read yet.
     */
    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId
              AND m.senderId <> :me
              AND (m.receiverId IS NULL OR m.receiverId = :me)
              AND :me NOT MEMBER OF m.readByUserIds
            """)
    List<Message> findUnread(@Param("conversationId") UUID conversationId, @Param("me") UUID me);

    @Query("""
            SELECT COUNT(m) FROM Message m
            WHERE m.conversationId = :conversationId
              AND m.senderId <> :me
              AND (m.receiverId IS NULL OR m.receiverId = :me)
              AND :me NOT MEMBER OF m.readByUserIds
            """)
    long countUnread(@Param("conversationId") UUID conversationId, @Param("me") UUID me);

    @Modifying
    @Transactional
    @Query("""
            UPDATE Message m
            SET m.status = 'READ'
            WHERE m.conversationId = :conversationId
              AND m.senderId <> :me
              AND (m.receiverId IS NULL OR m.receiverId = :me)
              AND m.status <> 'READ'
            """)
    void markAllRead(@Param("conversationId") UUID conversationId, @Param("me") UUID me);

    /**
     * Messages in a conversation sent by someone else that I may not have read.
     * Used by the WebSocket layer to mark read/delivered receipts.
     */
    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId
              AND m.senderId <> :me
              AND (m.receiverId IS NULL OR m.receiverId = :me)
            """)
    List<Message> findMine(@Param("conversationId") UUID conversationId, @Param("me") UUID me);
}