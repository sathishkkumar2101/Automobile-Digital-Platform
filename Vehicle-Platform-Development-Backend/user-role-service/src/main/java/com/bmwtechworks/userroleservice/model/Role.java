package com.bmwtechworks.userroleservice.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    /**
     * What the role is for, shown next to the name on the roles screen. Free
     * text and optional: a role is identified by its name, not by whether
     * somebody filled this in.
     */
    @Column(length = 500)
    private String description;

    @ElementCollection
    @CollectionTable(
            name = "role_permissions",
            joinColumns = @JoinColumn(name = "role_id")
    )
    @Column(name = "permission_id")
    @Builder.Default
    private Set<UUID> permissionIds = new HashSet<>();
}