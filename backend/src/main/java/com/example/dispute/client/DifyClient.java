package com.example.dispute.client;

import com.example.dispute.dto.DifyInvokeRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Component
public class DifyClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${dify.base-url:http://localhost:5001/v1}")
    private String difyBaseUrl;

    @Value("${dify.api-key:replace-with-real-key}")
    private String apiKey;

    public Object invoke(String endpoint, DifyInvokeRequest request) {
        String url = difyBaseUrl + endpoint;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("query", request.getQuery());
        body.put("inputs", request.getVariables());
        body.put("response_mode", "blocking");
        body.put("user", "admin-console");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.POST, entity, Object.class);
        return response.getBody();
    }
}
