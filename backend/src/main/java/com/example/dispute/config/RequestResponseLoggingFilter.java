package com.example.dispute.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 请求响应日志过滤器。
 */
@Component
public class RequestResponseLoggingFilter extends OncePerRequestFilter {

    // 定义日志对象。
    private static final Logger log = LoggerFactory.getLogger(RequestResponseLoggingFilter.class);

    /**
     * 记录请求与响应日志。
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // 记录开始时间。
        long start = System.currentTimeMillis();
        // 读取请求方法。
        String method = request.getMethod();
        // 读取请求路径。
        String uri = request.getRequestURI();
        // 读取查询参数。
        String query = request.getQueryString();
        // 打印请求进入日志。
        log.info("[REQUEST] method={}, uri={}, query={}", method, uri, query);
        // 放行请求。
        filterChain.doFilter(request, response);
        // 计算耗时。
        long cost = System.currentTimeMillis() - start;
        // 打印响应完成日志。
        log.info("[RESPONSE] method={}, uri={}, status={}, costMs={}", method, uri, response.getStatus(), cost);
    }
}
