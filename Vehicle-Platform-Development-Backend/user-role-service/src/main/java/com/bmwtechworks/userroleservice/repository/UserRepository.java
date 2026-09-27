package com.bmwtechworks.userroleservice.repository;

import com.bmwtechworks.userroleservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    @Query("SELECT u FROM User u WHERE u.roleId = (SELECT r.id FROM Role r WHERE r.name = :roleName)")
    List<User> findByRoleName(@Param("roleName") String roleName);

    long countByRoleId(UUID roleId);

    boolean existsByRoleId(UUID roleId);
}