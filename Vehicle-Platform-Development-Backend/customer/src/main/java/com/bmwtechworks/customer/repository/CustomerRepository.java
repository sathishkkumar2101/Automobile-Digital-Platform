package com.bmwtechworks.customer.repository;

import com.bmwtechworks.customer.model.Customers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customers, UUID> {

    Optional<Customers> findByUserId(UUID userId);

    /**
     * Every profile attached to an account, newest first.
     *
     * <p>An account is only meant to have one profile, but nothing in the
     * schema enforces that: {@code user_id} carries no unique constraint, so a
     * profile submitted twice for the same account leaves two rows behind. A
     * caller that needs to tolerate that goes through this list and decides what
     * to do, rather than inheriting a hard failure from {@code findByUserId},
     * which throws {@code IncorrectResultSizeDataAccessException} the moment a
     * second row exists.
     *
     * <p>{@code created_at} is nullable and Postgres sorts NULLs first under
     * DESC, so NULLS LAST is pinned here to stop a row of unknown age from
     * passing as the newest.
     */
    @Query("SELECT c FROM Customers c WHERE c.userId = :userId ORDER BY c.createdAt DESC NULLS LAST")
    List<Customers> findAllByUserId(@Param("userId") UUID userId);
}
