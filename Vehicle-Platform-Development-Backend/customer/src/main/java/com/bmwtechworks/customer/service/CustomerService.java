package com.bmwtechworks.customer.service;

import com.bmwtechworks.customer.model.Customers;
import com.bmwtechworks.customer.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    public List<Customers> findAll(){
        return customerRepository.findAll();
    }

    /**
     * The profile belonging to an account, or empty when it has none.
     *
     * <p>Reads through {@code findAllByUserId} rather than the single-result
     * lookup because an account can end up with more than one profile row: the
     * {@code user_id} column has no unique constraint, so nothing stops a
     * profile being created twice. Returning the newest row keeps the caller
     * working through that data-integrity fault instead of the whole endpoint
     * failing with a size-mismatch error.
     */
    public Optional<Customers> findByUserId(UUID userId) {
        return customerRepository.findAllByUserId(userId)
                .stream()
                .findFirst();
    }

    public Optional<Customers> findById(UUID id){
        return customerRepository.findById(id);
    }

    /**
     * Creates the profile for an account, or updates it when one already exists.
     *
     * <p>Upsert rather than insert, so submitting the onboarding form twice
     * cannot leave two profiles for one account. That matters because the
     * customer area resolves the caller through {@code /me}, and two rows for
     * the same user id used to turn every one of those lookups into an error.
     */
    public Customers addCustomer(UUID userId, Customers customer){
        /*
         * The entity doubles as the request body, so an id in the payload would
         * be taken as an existing row by the generated-value mapping and the
         * insert would silently overwrite somebody else's profile. Clearing it
         * here keeps this a genuine create.
         */
        customer.setId(null);
        customer.setUserId(userId);

        Optional<Customers> existing = findByUserId(userId);

        if (existing.isEmpty()) {
            return customerRepository.save(customer);
        }

        Customers target = existing.get();
        applyEditableFields(target, customer);
        return customerRepository.save(target);
    }

    public Customers updateCustomer(UUID id, Customers customer){
        Customers existingCustomer = customerRepository.findById(id).orElseThrow(() -> new RuntimeException("Customer Not Found"));
        applyEditableFields(existingCustomer, customer);
        return customerRepository.save(existingCustomer);
    }

    /**
     * Copies the caller-writable fields onto a stored profile.
     *
     * <p>{@code userId} and {@code createdAt} are deliberately left alone: the
     * first is owned by the gateway's identity header and the second is the
     * join date, and neither should move because a request body mentioned it.
     */
    private void applyEditableFields(Customers target, Customers source){
        target.setName(source.getName());
        target.setEmail(source.getEmail());
        target.setPhone(source.getPhone());
        target.setAddress(source.getAddress());
    }

    public String deleteCustomer(UUID id){
        customerRepository.deleteById(id);
        return "Customer Data deleted Successfully";
    }

    /**
     * Removes the profile belonging to an account, addressed by the user id
     * rather than the profile id.
     *
     * <p>The user service deletes an account by its own id and knows nothing
     * about this database, and the two are separate Postgres instances, so
     * there is no foreign key to cascade on. Without this a deleted account
     * leaves its profile behind forever, and because the profile is reachable
     * by user id the orphaned row is still being served to whoever next claims
     * that identity.
     *
     * <p>Every row for the user is removed, not just the first, so an account
     * that somehow ended up with duplicates is still cleaned up completely.
     * Each entity is deleted individually rather than through a bulk delete
     * query so that Hibernate clears the {@code address} collection rows itself.
     *
     * <p>A no-op is a legitimate outcome, so deleting an account that never
     * finished onboarding is not an error.
     *
     * @return true when at least one profile was found and removed
     */
    public boolean deleteByUserId(UUID userId){
        List<Customers> profiles = customerRepository.findAllByUserId(userId);

        if (profiles.isEmpty()) {
            return false;
        }

        customerRepository.deleteAll(profiles);
        return true;
    }

}
