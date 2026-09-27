package com.bmw.dealer.repository;

import com.bmw.dealer.model.Dealer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DealerRepository extends JpaRepository<Dealer, UUID> {

    List<Dealer> findByLocationIgnoreCase(String location);

    Optional<Dealer> findByUserId(UUID userId);
}
