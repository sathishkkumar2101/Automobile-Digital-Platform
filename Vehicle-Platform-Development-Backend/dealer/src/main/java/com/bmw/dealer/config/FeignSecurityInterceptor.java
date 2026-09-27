package com.bmw.dealer.config;

import com.bmw.dealer.model.Dealer;
import com.bmw.dealer.repository.DealerRepository;
import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;
import java.util.UUID;

@Configuration
@RequiredArgsConstructor
public class FeignSecurityInterceptor implements RequestInterceptor {

    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final DealerRepository dealerRepository;

    @Value("${INTERNAL_SERVICE_SECRET:}")
    private String internalSecret;

    @Override
    public void apply(RequestTemplate template) {
        // Service-to-service routes under /api/internal/** are authenticated by
        // the shared secret rather than a JWT, because the caller is another
        // service and has no token to present.
        if (internalSecret != null && !internalSecret.isBlank()
                && !template.headers().containsKey(INTERNAL_SECRET_HEADER)) {
            template.header(INTERNAL_SECRET_HEADER, internalSecret);
        }

        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String userRole = request.getHeader("X-User-Role");
            String userIdStr = request.getHeader("X-User-Id");
            String dealerIdStr = request.getHeader("X-Dealer-Id");

            if (userRole != null && !template.headers().containsKey("X-User-Role")) {
                template.header("X-User-Role", userRole);
            }
            if (userIdStr != null && !template.headers().containsKey("X-User-Id")) {
                template.header("X-User-Id", userIdStr);
            }

            if (dealerIdStr != null && !template.headers().containsKey("X-Dealer-Id")) {
                template.header("X-Dealer-Id", dealerIdStr);
            } else if (userIdStr != null && !template.headers().containsKey("X-Dealer-Id")) {
                // If X-Dealer-Id was not passed in the request header, resolve it safely from DB
                try {
                    UUID userId = UUID.fromString(userIdStr);
                    Optional<Dealer> dealerOpt = dealerRepository.findByUserId(userId);
                    dealerOpt.ifPresent(dealer ->
                            template.header("X-Dealer-Id", dealer.getDealerId().toString())
                    );
                } catch (Exception ignored) {}
            }
        }
    }
}
