package com.example.dispute.controller;

import com.example.dispute.dto.ApiResponse;
import com.example.dispute.entity.DisposalOrgDict;
import com.example.dispute.service.DisposalOrgDictService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 处置机构码表控制器。
 */
@RestController
@RequestMapping("/api/disposal-orgs")
public class DisposalOrgDictController {

    private final DisposalOrgDictService disposalOrgDictService;

    public DisposalOrgDictController(DisposalOrgDictService disposalOrgDictService) {
        this.disposalOrgDictService = disposalOrgDictService;
    }

    /**
     * 查询处置机构码表。
     */
    @GetMapping
    public ApiResponse<List<DisposalOrgDict>> listAll() {
        return ApiResponse.success(disposalOrgDictService.listAll());
    }
}
