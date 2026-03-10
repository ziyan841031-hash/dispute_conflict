package com.example.dispute.service;

import com.example.dispute.entity.DisposalOrgDict;

import java.util.List;

/**
 * 处置机构码表服务接口。
 */
public interface DisposalOrgDictService {

    /**
     * 查询全部处置机构。
     */
    List<DisposalOrgDict> listAll();
}
