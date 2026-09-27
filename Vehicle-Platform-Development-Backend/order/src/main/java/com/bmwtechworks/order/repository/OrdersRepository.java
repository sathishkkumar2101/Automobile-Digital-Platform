package com.bmwtechworks.order.repository;

import com.bmwtechworks.order.model.Orders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrdersRepository extends JpaRepository<Orders, UUID> {

    List<Orders> findByDealerId(UUID dealerId);
    List<Orders> findByCustomerId(UUID customerId);
}
