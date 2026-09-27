package com.bmwtechworks.apigateway.service;

import com.bmwtechworks.apigateway.client.AppointmentClient;
import com.bmwtechworks.apigateway.client.CustomerClient;
import com.bmwtechworks.apigateway.client.DealerClient;
import com.bmwtechworks.apigateway.client.UserAuthorizationClient;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthorizationService {

    private final UserAuthorizationClient userAuthorizationClient;
    private final AppointmentClient appointmentClient;
    private final DealerClient dealerClient;
    private final CustomerClient customerClient;

    public AuthorizationService(
            UserAuthorizationClient userAuthorizationClient,
            AppointmentClient appointmentClient,
            DealerClient dealerClient,
            CustomerClient customerclient
    ) {
        this.userAuthorizationClient = userAuthorizationClient;
        this.appointmentClient = appointmentClient;
        this.dealerClient = dealerClient;
        this.customerClient = customerclient;
    }

    public UserAuthorizationClient.AuthorizationResponse
    getUserAuthorization(UUID userId) {

        return userAuthorizationClient
                .getUserAuthorization(userId);
    }

    public boolean hasPermission(
            UUID userId,
            String requiredPermission
    ) {

        UserAuthorizationClient.AuthorizationResponse authorization =
                getUserAuthorization(userId);

        return authorization.permissions()
                .contains(requiredPermission);
    }

    public boolean isOwner(
            UUID currentUserId,
            UUID requestedCustomerId
    ) {
        if (currentUserId != null && currentUserId.equals(requestedCustomerId)) {
            return true;
        }

        try {
            CustomerClient.CustomerResponse customer =
                    customerClient.getMyCustomer(currentUserId);

            return customer != null
                    && customer.id() != null
                    && customer.id().equals(requestedCustomerId);
        } catch (Exception e) {
            return false;
        }
    }

    public AppointmentClient.AppointmentResponse
    getAppointment(UUID appointmentId) {

        return appointmentClient.getAppointmentById(appointmentId);
    }

    public boolean isAppointmentCustomer(
            UUID currentUserId,
            UUID appointmentId
    ) {

        AppointmentClient.AppointmentResponse appointment =
                getAppointment(appointmentId);

        if (appointment == null) {
            return false;
        }

        if (currentUserId != null && currentUserId.equals(appointment.customerId())) {
            return true;
        }

        try {
            CustomerClient.CustomerResponse customer =
                    customerClient.getMyCustomer(currentUserId);

            return customer != null
                    && customer.id() != null
                    && customer.id().equals(appointment.customerId());
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAppointmentDealer(
            UUID currentUserId,
            UUID appointmentId
    ) {
        try {
            AppointmentClient.AppointmentResponse appointment =
                    getAppointment(appointmentId);

            if (appointment == null) {
                return false;
            }

            DealerClient.DealerResponse dealer =
                    dealerClient.getMyDealer(currentUserId);

            return dealer != null
                    && dealer.dealerId() != null
                    && dealer.dealerId().equals(appointment.dealerId());
        } catch (Exception e) {
            return false;
        }
    }

    public UUID getDealerId(UUID currentUserId) {
        try {
            DealerClient.DealerResponse dealer =
                    dealerClient.getMyDealer(currentUserId);
            return dealer != null ? dealer.dealerId() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isDealerOwner(UUID currentUserId, UUID requestedDealerId) {
        if (currentUserId == null || requestedDealerId == null) {
            return false;
        }
        UUID myDealerId = getDealerId(currentUserId);
        return myDealerId != null && myDealerId.equals(requestedDealerId);
    }
}
