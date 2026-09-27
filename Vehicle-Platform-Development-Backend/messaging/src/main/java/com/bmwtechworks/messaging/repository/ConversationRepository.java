package com.bmwtechworks.messaging.repository;

import com.bmwtechworks.messaging.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("SELECT DISTINCT c FROM Conversation c JOIN c.participantIds p WHERE p = :userId")
    List<Conversation> findAllByParticipantId(@Param("userId") UUID userId);
}